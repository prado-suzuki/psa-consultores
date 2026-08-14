DROP FUNCTION IF EXISTS public.feed_org_comments(timestamptz, uuid, integer);

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

CREATE INDEX IF NOT EXISTS org_comments_feed_autor_idx
  ON public.org_comments (author_id, created_at DESC, id DESC)
  WHERE excluido = false AND kind = 'comment'::public.org_comment_kind;

CREATE INDEX IF NOT EXISTS org_comment_mentions_usuario_idx
  ON public.org_comment_mentions (mentioned_user_id, comment_id);

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