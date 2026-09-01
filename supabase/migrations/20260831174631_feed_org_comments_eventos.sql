-- 20260831174631_feed_org_comments_eventos.sql
-- Feed: passar a mostrar os eventos de sistema, e nao so a conversa humana.
--
-- Relato de 31/08/2026: a GES-03 foi dada por encerrada, mas o aviso chega a
-- thread do projeto e ao sino e nunca aparece no Feed
-- (/equipe/<area>/projetos/feed). O mesmo vale para os eventos de revisao, que
-- existem desde a revisao delegada e nunca apareceram la.
--
-- Causa raiz, unica: a linha `WHERE f.kind = 'comment'` em
-- `public.feed_org_comments` (baseline, linha 1815). Nenhum outro ponto do
-- caminho descarta evento: a view `org_comments_feed` ja resolve projeto, nome
-- do projeto, titulo da entidade e cliente para essas linhas; a RLS de
-- `org_comments` nao distingue kind; o hook `useDomainFeedComentarios` so pede
-- a proxima pagina; e o Feed ja sabe desenhar bloco de PROJETO, nao so de
-- tarefa.
--
-- Conferido no sandbox antes de escrever: os 107 eventos existentes tem TODOS
-- author_id, author_name e project_id preenchidos, e nenhum tem parent_id.
-- Nao ha nulo capaz de quebrar avatar, agrupamento por origem ou thread.
--
-- Decisao (usuario, 31/08): entram TODOS os kinds. Tudo que aparece como
-- notificacao de projeto ou tarefa deve aparecer no Feed. Sem lista de
-- permitidos, para que kind novo entre sozinho e ninguem precise lembrar de
-- voltar aqui.
--
-- OS TRES INDICES PARCIAIS ANDAM JUNTO. Eles carregam a mesma condicao no
-- predicado (baseline 11060, 11067 e 11081) e sao o que sustenta a paginacao
-- por cursor. Deixando-os como estao, a consulta alargada deixa de ser coberta
-- e o Feed cai em varredura. Aqui eles perdem so o `kind`, mantendo o
-- `excluido = false`, que a funcao continua exigindo.
--
-- Fora de escopo, de proposito: nao mexe em RLS, na view, em dado nenhum e nao
-- faz backfill. Sem mudanca de schema, nao precisa regerar types.ts. O
-- comportamento de quem VE o que continua vindo da RLS de `org_comments`.
--
-- Reversao: devolver `AND f.kind = 'comment'` ao WHERE e recriar os tres
-- indices com o predicado do baseline.

CREATE OR REPLACE FUNCTION public.feed_org_comments(
  _cursor_created_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
  _cursor_id uuid DEFAULT NULL::uuid,
  _limit integer DEFAULT 20,
  _client_ids uuid[] DEFAULT NULL::uuid[],
  _project_ids uuid[] DEFAULT NULL::uuid[],
  _author_ids uuid[] DEFAULT NULL::uuid[],
  _only_mentions boolean DEFAULT false,
  _since timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS SETOF public.org_comments_feed
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT f.*
    FROM public.org_comments_feed f
   WHERE f.excluido = false
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
                   AND m.motivo = 'mencao'
              )
         )
   ORDER BY f.created_at DESC, f.id DESC
   LIMIT LEAST(GREATEST(COALESCE(_limit, 20), 1), 50);
$function$;

COMMENT ON FUNCTION public.feed_org_comments(
  timestamp with time zone, uuid, integer, uuid[], uuid[], uuid[], boolean, timestamp with time zone
) IS
  'Uma pagina do feed de projetos e tarefas, em ordem cronologica decrescente. '
  'Traz a conversa humana E os eventos de sistema (revisao, solicitacao de '
  'documentos e o que vier depois): todo kind de org_comments entra, o recorte e '
  'apenas excluido = false. Paginacao por cursor em (created_at, id), nunca '
  'OFFSET. Filtros opcionais e cumulativos: cliente, projeto, autor, mencoes a '
  'mim (so motivo = mencao, nao a notificacao de resposta) e piso de periodo; '
  'parametro nulo = sem filtro, array vazio = nenhum resultado. A relevancia vem '
  'da RLS de org_comments (funcao SECURITY INVOKER lendo view security_invoker).';

-- Os tres indices que a funcao usa, sem o `kind` no predicado.
DROP INDEX IF EXISTS public.org_comments_feed_cronologico_idx;
CREATE INDEX org_comments_feed_cronologico_idx
  ON public.org_comments USING btree (created_at DESC, id DESC)
  WHERE (excluido = false);

DROP INDEX IF EXISTS public.org_comments_feed_autor_idx;
CREATE INDEX org_comments_feed_autor_idx
  ON public.org_comments USING btree (author_id, created_at DESC, id DESC)
  WHERE (excluido = false);

DROP INDEX IF EXISTS public.org_comments_project_feed_idx;
CREATE INDEX org_comments_project_feed_idx
  ON public.org_comments USING btree (project_id, created_at DESC, id DESC)
  WHERE (excluido = false);

-- GATE: falha a migration se o filtro de kind sobreviveu em qualquer um dos
-- quatro objetos, ou se algum indice sumiu no caminho.
DO $$
DECLARE
  v_src text;
  v_faltando text;
BEGIN
  SELECT p.prosrc INTO v_src
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'feed_org_comments';

  IF v_src IS NULL THEN
    RAISE EXCEPTION 'GATE: feed_org_comments nao existe apos a migration';
  END IF;
  IF v_src LIKE '%kind%' THEN
    RAISE EXCEPTION 'GATE: feed_org_comments ainda filtra por kind: %', v_src;
  END IF;
  IF v_src NOT LIKE '%excluido = false%' THEN
    RAISE EXCEPTION 'GATE: feed_org_comments perdeu o recorte de excluido';
  END IF;

  SELECT string_agg(i.nome, ', ') INTO v_faltando
    FROM (VALUES
      ('org_comments_feed_cronologico_idx'),
      ('org_comments_feed_autor_idx'),
      ('org_comments_project_feed_idx')
    ) AS i(nome)
   WHERE NOT EXISTS (
     SELECT 1 FROM pg_indexes x
      WHERE x.schemaname = 'public'
        AND x.indexname = i.nome
        AND x.indexdef NOT LIKE '%kind%'
   );

  IF v_faltando IS NOT NULL THEN
    RAISE EXCEPTION 'GATE: indice ausente ou ainda com kind no predicado: %', v_faltando;
  END IF;
END $$;
