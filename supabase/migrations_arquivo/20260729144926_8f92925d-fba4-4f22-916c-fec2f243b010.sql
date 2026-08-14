-- =============================================================================
-- Feed de conversas (fase 2)
-- =============================================================================

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

DROP POLICY IF EXISTS org_comments_select ON public.org_comments;

CREATE POLICY org_comments_select
ON public.org_comments
FOR SELECT
TO authenticated
USING (
  (SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  OR project_id = ANY (public.visible_org_project_ids((SELECT auth.uid())))
  OR (
    entity_type = 'org_task'::public.org_comment_entity
    AND entity_id = ANY (public.own_org_task_ids((SELECT auth.uid())))
  )
);

CREATE INDEX IF NOT EXISTS org_comments_feed_cronologico_idx
  ON public.org_comments (created_at DESC, id DESC)
  WHERE excluido = false AND kind = 'comment'::public.org_comment_kind;

CREATE INDEX IF NOT EXISTS org_project_members_user_idx
  ON public.org_project_members (user_id);

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