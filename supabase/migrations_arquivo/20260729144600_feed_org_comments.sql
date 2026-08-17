-- =============================================================================
-- Feed de conversas (fase 2 de `docs/planos/plano-comentarios-mencoes-feed.md`).
--
-- A tela nova lista, em stream único e ordem cronológica decrescente, tudo que
-- está sendo conversado nos projetos e tarefas do usuário. Cinco peças:
--
-- 1) View com LEFT JOIN no projeto: com JOIN interno, ela apagava comentário
--    que a RLS de `org_comments` deixa passar (tarefa sua em projeto onde você
--    não é membro) — o ramo `own_org_task_ids` da RLS era letra morta.
-- 2) Policy de SELECT de `org_comments` avaliada uma vez por consulta, não uma
--    vez por linha. Mesma regra, sem mudar permissão de ninguém.
-- 3) Índice que sustenta a ordem cronológica GLOBAL.
-- 4) Índice em `org_project_members (user_id)`, que faltava.
-- 5) `feed_org_comments(cursor, limite)`: uma página do feed, com paginação por
--    cursor em (created_at, id). Nunca OFFSET, que fica lento e repete item
--    quando entra comentário novo no meio.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) View: LEFT JOIN no projeto
--
-- `rls_org_projects_select` (migration 20260507211605) conhece admin, criador,
-- responsável, líder e `can_view_org_project` — mas NÃO conhece o ramo "tenho
-- tarefa neste projeto". Já a RLS de `org_comments` conhece, via
-- `own_org_task_ids`. Com JOIN interno, a linha do projeto era filtrada pela
-- RLS dela e levava o comentário embora: quem executa tarefa em projeto de que
-- não é membro não via os comentários da própria tarefa, nem na thread.
--
-- Com LEFT JOIN o comentário sobrevive e, no pior caso, `project_name` vem
-- nulo — o tipo no front já é `string | null`, e o feed tem texto de reserva.
--
-- Lista e ordem das colunas idênticas à versão anterior: CREATE OR REPLACE só
-- aceita acréscimo no fim e preserva os grants.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.org_comments_feed
WITH (security_invoker = on) AS
SELECT
    c.id,
    c.entity_type,
    c.entity_id,
    c.project_id,
    c.parent_id,
    c.kind,
    c.body,
    c.metadata,
    c.author_id,
    c.author_name,
    c.editado_em,
    c.created_at,
    c.updated_at,
    COALESCE(t.title, p.name) AS entity_title,
    p.name                    AS project_name,
    (
      SELECT COUNT(*)::int
        FROM public.org_comments r
       WHERE r.parent_id = c.id
         AND r.excluido  = false
    )                         AS reply_count,
    (
      SELECT COUNT(*)::int
        FROM public.org_comment_attachments a
       WHERE a.comment_id = c.id
    )                         AS attachment_count,
    c.excluido
  FROM public.org_comments c
  LEFT JOIN public.org_projects p ON p.id = c.project_id
  LEFT JOIN public.org_tasks t ON t.id = c.entity_id
                              AND c.entity_type = 'org_task'::public.org_comment_entity;

-- -----------------------------------------------------------------------------
-- 2) Policy de SELECT: a MESMA regra, avaliada uma vez por consulta
--
-- Só função IMMUTABLE é dobrada em constante; função STABLE dentro do USING é
-- reavaliada POR LINHA. Envolvida em subconsulta escalar, o planner a promove a
-- InitPlan e avalia uma vez por execução. É o mesmo truque que
-- `rls_org_projects_select` já usa com `(select auth.uid())`.
--
-- Até agora isso era invisível: a thread lê uma entidade por vez (dezenas de
-- linhas). O feed é a primeira consulta a varrer `org_comments` em ordem
-- global, e aí `visible_org_project_ids` — que é um UNION de seis ramos com
-- três joins — sairia caro por linha varrida.
--
-- A regra não muda: mesmos três caminhos, mesma ordem.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS org_comments_select ON public.org_comments;

CREATE POLICY org_comments_select
ON public.org_comments
FOR SELECT
TO authenticated
USING (
  (SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  OR project_id = ANY ((SELECT public.visible_org_project_ids((SELECT auth.uid()))))
  OR (
    entity_type = 'org_task'::public.org_comment_entity
    AND entity_id = ANY ((SELECT public.own_org_task_ids((SELECT auth.uid()))))
  )
);

-- -----------------------------------------------------------------------------
-- 3) Índice da ordem cronológica global
--
-- O `org_comments_project_feed_idx` existente começa por `project_id` — serve
-- para o feed de um projeto, não para a ordem cronológica de todos eles. Este é
-- o irmão sem `project_id`, com o mesmo predicado parcial. O `id DESC` no fim é
-- o desempate do cursor, e é o que permite resolver o empate de `created_at`
-- dentro do próprio índice, sem sort.
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS org_comments_feed_cronologico_idx
  ON public.org_comments (created_at DESC, id DESC)
  WHERE excluido = false AND kind = 'comment'::public.org_comment_kind;

-- -----------------------------------------------------------------------------
-- 4) Índice que faltava em `org_project_members`
--
-- A tabela só tinha índice por `project_id`. Toda checagem de visibilidade de
-- projeto (`visible_org_project_ids`, `can_view_org_project`) filtra por
-- `user_id` e varria a tabela inteira.
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS org_project_members_user_idx
  ON public.org_project_members (user_id);

-- -----------------------------------------------------------------------------
-- 5) Uma página do feed
--
-- SECURITY INVOKER, lendo a view `org_comments_feed` (que é
-- `security_invoker = on`): as duas coisas compõem, então a RLS de
-- `org_comments` continua valendo com o `auth.uid()` real e é ela quem faz o
-- filtro de relevância — projetos visíveis mais as tarefas de vínculo
-- individual. Menção e thread respondida entram por herança desses conjuntos,
-- sem ramo próprio de consulta.
--
-- `RETURNS SETOF public.org_comments_feed` faz o tipo de linha acompanhar a
-- view: acrescentar coluna lá não exige reescrever a assinatura aqui.
--
-- ⚠️ Manutenção: a view é feita para crescer por acréscimo no fim (ver o
-- comentário na migration 20260728140000). Se um `CREATE OR REPLACE VIEW`
-- futuro reclamar de dependência por causa desta função, derrube-a antes
-- (`DROP FUNCTION public.feed_org_comments(timestamptz, uuid, integer)`),
-- substitua a view e recrie a função com o GRANT — o DROP leva o GRANT embora.
--
-- O LIMIT dentro da função é o que mantém os subselects de `reply_count` e
-- `attachment_count` no recorte da página, em vez de rodarem para tudo que o
-- usuário enxerga.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.feed_org_comments(
  _cursor_created_at timestamptz DEFAULT NULL,
  _cursor_id uuid DEFAULT NULL,
  _limit integer DEFAULT 20
)
RETURNS SETOF public.org_comments_feed
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT f.*
    FROM public.org_comments_feed f
   WHERE f.kind = 'comment'
     AND f.excluido = false
     -- Comparação de tupla: com ORDER BY DESC, a próxima página é o que é
     -- estritamente "mais velho" que o cursor. O `id` é só desempate de
     -- comentários gravados no mesmo instante — sem ele, um item na fronteira
     -- da página some ou repete.
     --
     -- A primeira página entra com sentinelas máximas em vez de
     -- `_cursor IS NULL OR (...)`: o OR impediria o predicado de virar limite
     -- de índice, e daria o mesmo resultado por caminho mais caro.
     AND (f.created_at, f.id) < (
           COALESCE(_cursor_created_at, 'infinity'::timestamptz),
           COALESCE(_cursor_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)
         )
   ORDER BY f.created_at DESC, f.id DESC
   LIMIT LEAST(GREATEST(COALESCE(_limit, 20), 1), 50);
$$;

GRANT EXECUTE ON FUNCTION public.feed_org_comments(timestamptz, uuid, integer) TO authenticated;

COMMENT ON FUNCTION public.feed_org_comments IS
  'Uma página do feed de conversas, em ordem cronológica decrescente. Paginação por cursor em (created_at, id) — nunca OFFSET. A relevância vem da RLS de org_comments (função SECURITY INVOKER lendo view security_invoker).';
