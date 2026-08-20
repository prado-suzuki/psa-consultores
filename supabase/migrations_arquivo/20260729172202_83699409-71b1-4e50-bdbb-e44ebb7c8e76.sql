
-- 1. comentarios_avaliacao: usar has_role_or_higher
DROP POLICY IF EXISTS "Membro ve comentarios destinados a ele" ON public.comentarios_avaliacao;
CREATE POLICY "Membro ve comentarios destinados a ele"
ON public.comentarios_avaliacao FOR SELECT TO authenticated
USING (
  ((auth.uid() = destinatario_id) AND (visivel_para_membro = true))
  OR (auth.uid() = autor_id)
  OR public.has_role_or_higher(auth.uid(), 'lider'::app_role)
);

-- 2. kpis_meta: escopar SELECT aos donos/responsáveis ou admin
DROP POLICY IF EXISTS rls_kpis_meta_select ON public.kpis_meta;
CREATE POLICY rls_kpis_meta_select
ON public.kpis_meta FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.metas m
    WHERE m.id = kpis_meta.meta_id
      AND (m.responsavel_id = auth.uid() OR m.created_by = auth.uid())
  )
);

-- 3. org_comment_attachments: aplicar visibilidade do projeto/tarefa
DROP POLICY IF EXISTS org_comment_attachments_select ON public.org_comment_attachments;
CREATE POLICY org_comment_attachments_select
ON public.org_comment_attachments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_comments c
    WHERE c.id = org_comment_attachments.comment_id
      AND c.excluido = false
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR c.project_id = ANY (public.visible_org_project_ids(auth.uid()))
        OR (c.entity_type = 'org_task'::org_comment_entity
            AND c.entity_id = ANY (public.own_org_task_ids(auth.uid())))
      )
  )
);

-- 4. org_comment_mentions: restringir a mencionado/autor/visibilidade do comentário
DROP POLICY IF EXISTS org_comment_mentions_select ON public.org_comment_mentions;
CREATE POLICY org_comment_mentions_select
ON public.org_comment_mentions FOR SELECT TO authenticated
USING (
  mentioned_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.org_comments c
    WHERE c.id = org_comment_mentions.comment_id
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR c.author_id = auth.uid()
        OR c.project_id = ANY (public.visible_org_project_ids(auth.uid()))
        OR (c.entity_type = 'org_task'::org_comment_entity
            AND c.entity_id = ANY (public.own_org_task_ids(auth.uid())))
      )
  )
);
