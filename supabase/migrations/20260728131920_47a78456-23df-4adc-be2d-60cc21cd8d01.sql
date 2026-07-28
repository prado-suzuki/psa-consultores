-- Tabela de anexos de comentários
CREATE TABLE public.org_comment_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.org_comments(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  file_type text,
  width integer,
  height integer,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX org_comment_attachments_comment_id_idx
  ON public.org_comment_attachments (comment_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_comment_attachments TO authenticated;
GRANT ALL ON public.org_comment_attachments TO service_role;

ALTER TABLE public.org_comment_attachments ENABLE ROW LEVEL SECURITY;

-- SELECT: herda visibilidade do comentário
CREATE POLICY "org_comment_attachments_select"
  ON public.org_comment_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_comments c
      WHERE c.id = org_comment_attachments.comment_id
        AND c.excluido = false
        AND (
          (c.entity_type = 'org_project'
            AND c.entity_id = ANY (public.visible_org_project_ids(auth.uid())))
          OR (c.entity_type = 'org_task'
            AND (
              c.project_id = ANY (public.visible_org_project_ids(auth.uid()))
              OR c.entity_id = ANY (public.own_org_task_ids(auth.uid()))
            ))
        )
    )
  );

-- INSERT: uploaded_by = auth.uid() E comentário visível E autor do comentário é o próprio usuário
CREATE POLICY "org_comment_attachments_insert"
  ON public.org_comment_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.org_comments c
      WHERE c.id = org_comment_attachments.comment_id
        AND c.excluido = false
        AND c.author_id = auth.uid()
    )
  );

-- DELETE: autor do anexo OU lider+
CREATE POLICY "org_comment_attachments_delete"
  ON public.org_comment_attachments
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
  );

-- Storage policies para bucket comment-attachments
CREATE POLICY "comment_attachments_storage_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'comment-attachments'
    AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
  );

CREATE POLICY "comment_attachments_storage_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'comment-attachments'
    AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
  );

CREATE POLICY "comment_attachments_storage_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'comment-attachments'
    AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
  );