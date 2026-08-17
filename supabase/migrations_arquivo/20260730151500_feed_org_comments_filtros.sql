-- =============================================================================
-- Filtros do feed de conversas: cliente, projeto, autor, menções e período.
--
-- POR QUE NO BANCO, E NÃO NO FRONT: o feed pagina por cursor em
-- (created_at, id), 20 por vez. Filtro aplicado sobre as páginas já carregadas
-- filtraria uma janela de 20 comentários, não o feed — "usuário = Fulano" daria
-- tela vazia com um botão "ver mais antigos" para clicar até achar algo. Para o
-- filtro valer sobre o stream inteiro, ele tem que entrar no WHERE da função,
-- antes do LIMIT.
--
-- Três peças:
--
-- 1) A view ganha `client_id` — de que cliente é a conversa. É o único dos
--    filtros que o comentário ainda não sabia responder.
-- 2) Dois índices que sustentam os caminhos de acesso novos (por autor e por
--    menção), no mesmo espírito do `org_comments_feed_cronologico_idx`.
-- 3) `feed_org_comments` recriada com os parâmetros de filtro. Precisa ser
--    DROP + CREATE, e não CREATE OR REPLACE: acrescentar parâmetro muda a
--    assinatura, e o REPLACE criaria uma SEGUNDA função sobrecarregada em vez
--    de substituir a de três argumentos. O DROP leva o GRANT embora — daí ele
--    ser refeito no fim.
--
-- Ordem das peças importa: a função é dropada primeiro porque depende da view.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Fora do caminho: a função depende da view, e a view vai mudar.
--
-- É exatamente o procedimento anotado no COMMENT da migration
-- 20260729144600 ("se um CREATE OR REPLACE VIEW futuro reclamar de dependência
-- por causa desta função, derrube-a antes").
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.feed_org_comments(timestamptz, uuid, integer);

-- -----------------------------------------------------------------------------
-- 1) A view ganha `client_id`
--
-- O comentário sabe o projeto (`project_id`, etiqueta desnormalizada), mas não
-- o cliente. O vínculo tem duas formas no sistema, e a precedência é a mesma
-- que `useOrgProjects` e `useDomainFeedClientes` já aplicam:
--   1º `org_projects.external_client_id`;
--   2º na falta dele, o cliente da ordem de serviço do projeto.
--
-- LEFT JOIN nos dois lados, nunca INNER: a view é `security_invoker`, então a
-- RLS de `ordem_servico` (cluster-cliente) vale aqui. Com JOIN interno, uma OS
-- que o leitor não alcança levaria o comentário embora — o mesmo bug que a
-- migration anterior consertou no join de `org_projects`. No pior caso
-- `client_id` vem nulo e a conversa simplesmente não responde ao filtro de
-- cliente.
--
-- Só o ID entra na view. O NOME do cliente continua vindo por fora
-- (`useDomainFeedClientes`), porque é dado de cadastro compartilhado por todos
-- os comentários do mesmo projeto: repeti-lo em cada linha da página seria
-- trafegar a mesma string dezenas de vezes. Aqui o id serve a uma coisa só —
-- ser eixo de filtro.
--
-- A coluna entra NO FIM: `CREATE OR REPLACE VIEW` exige as colunas existentes
-- idênticas em nome, tipo e ordem, e só aceita acréscimo no final. É a
-- convenção de crescimento desta view desde a migration 20260728140000.
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
    c.excluido,
    COALESCE(p.external_client_id, os.id_cliente) AS client_id
  FROM public.org_comments c
  LEFT JOIN public.org_projects p ON p.id = c.project_id
  LEFT JOIN public.ordem_servico os ON os.id = p.ordem_servico_id
                                   AND os.excluido = false
  LEFT JOIN public.org_tasks t ON t.id = c.entity_id
                              AND c.entity_type = 'org_task'::public.org_comment_entity;

-- -----------------------------------------------------------------------------
-- 2) Índices dos caminhos de acesso novos
--
-- Cliente e projeto já estão servidos: o filtro por projeto cai no
-- `org_comments_project_feed_idx (project_id, created_at DESC, id DESC)`, e o
-- de cliente se resolve pelo mesmo caminho depois do join.
--
-- (a) Por autor: o índice que existe é `idx_org_comments_author (author_id)`,
--     sem a data — filtrar por autor obrigaria a ordenar depois. Este é o irmão
--     cronológico, com o mesmo predicado parcial do índice do feed, para "o que
--     o Fulano andou dizendo" sair como index scan já na ordem certa.
--
-- (b) Por menção: `org_comment_mentions` tem UNIQUE (comment_id,
--     mentioned_user_id) — que só serve com o comment_id na mão — e o índice de
--     caixa de entrada, que é PARCIAL em `lido_em IS NULL`. Nenhum dos dois
--     responde "todas as menções a mim, lidas ou não", que é a pergunta do
--     filtro. Este responde, e por índice only scan: as duas colunas estão nele.
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS org_comments_feed_autor_idx
  ON public.org_comments (author_id, created_at DESC, id DESC)
  WHERE excluido = false AND kind = 'comment'::public.org_comment_kind;

CREATE INDEX IF NOT EXISTS org_comment_mentions_usuario_idx
  ON public.org_comment_mentions (mentioned_user_id, comment_id);

-- -----------------------------------------------------------------------------
-- 3) Uma página do feed, agora filtrável
--
-- O que NÃO muda: SECURITY INVOKER lendo a view `security_invoker`, então a RLS
-- de `org_comments` continua sendo o filtro de relevância; paginação por cursor
-- em (created_at, id) com sentinelas máximas na primeira página; LIMIT dentro
-- da função mantendo os subselects de contagem no recorte da página.
--
-- Os filtros são todos OPCIONAIS e se somam (AND). Cada um segue a mesma forma:
-- `_param IS NULL OR <predicado>` — com o parâmetro nulo, o planner dobra o
-- ramo em constante verdadeira e o plano fica idêntico ao do feed sem filtro.
--
-- NULO E VAZIO SÃO COISAS DIFERENTES, de propósito:
--   `_client_ids IS NULL`  → sem filtro de cliente, passa tudo;
--   `_client_ids = '{}'`   → filtro que não casa com nada, passa zero.
-- É o que faz "filtrei por um cliente que não tem conversa nenhuma" devolver
-- feed vazio em vez de devolver o feed inteiro.
--
-- Arrays, e não escalares, mesmo com a tela oferecendo seleção única: `= ANY`
-- custa o mesmo que `=` para um elemento e deixa a multi-seleção ser só
-- mudança de front, sem outra migration.
--
-- `_only_mentions` é semi-join por conjunto (`id IN (subconsulta)`), não EXISTS
-- correlacionado, pelo mesmo motivo do §4 do plano: assim o planner pode partir
-- do lado pequeno (as menções a mim, dezenas) em vez de varrer a ordem
-- cronológica global testando linha por linha. `(SELECT auth.uid())` em
-- subconsulta escalar para virar InitPlan, como no resto do arquivo.
--
-- ⚠️ O filtro de menção mostra as menções DENTRO do que a RLS já deixa ver.
-- `org_comments_select` não tem ramo "fui mencionado" (gap conhecido,
-- documentado no fim de docs/planos/plano-comentarios-mencoes-feed.md), então
-- menção a quem não alcança o comentário não aparecia antes e continua não
-- aparecendo — este filtro não cria nem resolve isso.
--
-- `_since` é o piso do período (>=), calculado no front a partir do preset
-- (hoje, 7 dias, 30 dias) para a virada do dia ser a LOCAL do usuário, não a
-- UTC do servidor. Sem teto: o feed sempre termina no agora.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.feed_org_comments(
  _cursor_created_at timestamptz DEFAULT NULL,
  _cursor_id uuid DEFAULT NULL,
  _limit integer DEFAULT 20,
  _client_ids uuid[] DEFAULT NULL,
  _project_ids uuid[] DEFAULT NULL,
  _author_ids uuid[] DEFAULT NULL,
  _only_mentions boolean DEFAULT false,
  _since timestamptz DEFAULT NULL
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
     AND (_client_ids  IS NULL OR f.client_id  = ANY (_client_ids))
     AND (_project_ids IS NULL OR f.project_id = ANY (_project_ids))
     AND (_author_ids  IS NULL OR f.author_id  = ANY (_author_ids))
     AND (_since IS NULL OR f.created_at >= _since)
     AND (
           COALESCE(_only_mentions, false) = false
           OR f.id IN (
                SELECT m.comment_id
                  FROM public.org_comment_mentions m
                 WHERE m.mentioned_user_id = (SELECT auth.uid())
              )
         )
   ORDER BY f.created_at DESC, f.id DESC
   LIMIT LEAST(GREATEST(COALESCE(_limit, 20), 1), 50);
$$;

GRANT EXECUTE ON FUNCTION public.feed_org_comments(
  timestamptz, uuid, integer, uuid[], uuid[], uuid[], boolean, timestamptz
) TO authenticated;

COMMENT ON FUNCTION public.feed_org_comments IS
  'Uma página do feed de conversas, em ordem cronológica decrescente. Paginação por cursor em (created_at, id) — nunca OFFSET. Filtros opcionais e cumulativos: cliente, projeto, autor, menções a mim e piso de período; parâmetro nulo = sem filtro, array vazio = nenhum resultado. A relevância vem da RLS de org_comments (função SECURITY INVOKER lendo view security_invoker).';
