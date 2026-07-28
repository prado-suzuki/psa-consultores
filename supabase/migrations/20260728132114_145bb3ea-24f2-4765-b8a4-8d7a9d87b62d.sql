-- =============================================================================
-- EDU-13: view de feed + RPC transacional + realtime + rls_precheck
-- =============================================================================

-- 1) VIEW org_comments_feed (security_invoker: respeita RLS do chamador)
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
      AND r.excluido = false
  ) AS reply_count,
  (
    SELECT COUNT(*)::int
    FROM public.org_comment_attachments a
    WHERE a.comment_id = c.id
  ) AS attachment_count
FROM public.org_comments c
JOIN public.org_projects p ON p.id = c.project_id
LEFT JOIN public.org_tasks t
  ON t.id = c.entity_id
 AND c.entity_type = 'org_task'::public.org_comment_entity
WHERE c.excluido = false;

GRANT SELECT ON public.org_comments_feed TO authenticated;

-- 2) RPC criar_org_comment (SECURITY INVOKER — respeita RLS)
CREATE OR REPLACE FUNCTION public.criar_org_comment(
  _id           uuid,
  _entity_type  public.org_comment_entity,
  _entity_id    uuid,
  _parent_id    uuid,
  _body         text,
  _mentions     uuid[],
  _attachments  jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid         uuid := auth.uid();
  v_author_name text;
  v_mention     uuid;
  v_att         jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória' USING ERRCODE = '42501';
  END IF;

  SELECT NULLIF(BTRIM(COALESCE(pr.first_name,'') || ' ' || COALESCE(pr.last_name,'')), '')
    INTO v_author_name
    FROM public.profiles pr
   WHERE pr.id = v_uid;

  INSERT INTO public.org_comments (
    id, entity_type, entity_id, parent_id, kind, body,
    author_id, author_name
  ) VALUES (
    COALESCE(_id, gen_random_uuid()),
    _entity_type, _entity_id, _parent_id,
    'comment'::public.org_comment_kind,
    _body,
    v_uid, v_author_name
  );

  IF _mentions IS NOT NULL THEN
    FOREACH v_mention IN ARRAY _mentions LOOP
      IF v_mention IS NOT NULL THEN
        INSERT INTO public.org_comment_mentions (comment_id, mentioned_user_id)
        VALUES (COALESCE(_id, gen_random_uuid()), v_mention)
        ON CONFLICT (comment_id, mentioned_user_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  IF _attachments IS NOT NULL AND jsonb_typeof(_attachments) = 'array' THEN
    FOR v_att IN SELECT * FROM jsonb_array_elements(_attachments) LOOP
      INSERT INTO public.org_comment_attachments (
        comment_id, file_path, file_name, file_size, file_type,
        width, height, uploaded_by
      ) VALUES (
        _id,
        v_att->>'file_path',
        v_att->>'file_name',
        NULLIF(v_att->>'file_size','')::int,
        v_att->>'file_type',
        NULLIF(v_att->>'width','')::int,
        NULLIF(v_att->>'height','')::int,
        v_uid
      );
    END LOOP;
  END IF;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.criar_org_comment(
  uuid, public.org_comment_entity, uuid, uuid, text, uuid[], jsonb
) TO authenticated;

-- 3) Realtime — publica a tabela base (view não suporta)
ALTER PUBLICATION supabase_realtime ADD TABLE public.org_comments;

-- 4) Registros administrativos — rls_precheck_allowed_tables
INSERT INTO public.rls_precheck_allowed_tables (table_name, allowed_ops) VALUES
  ('org_comments',            ARRAY['update']),
  ('org_comment_mentions',    ARRAY['update']),
  ('org_comment_attachments', ARRAY['delete'])
ON CONFLICT (table_name) DO UPDATE
  SET allowed_ops = EXCLUDED.allowed_ops;
