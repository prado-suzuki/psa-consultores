DROP POLICY IF EXISTS rls_org_tasks_select ON public.org_tasks;

CREATE POLICY rls_org_tasks_select
ON public.org_tasks
FOR SELECT
TO authenticated
USING (
  -- Admin: tudo
  public.has_role(auth.uid(), 'admin'::app_role)
  -- Líder/Sub-líder: tarefas de projetos visíveis por área/equipe
  OR (
    project_id IS NOT NULL
    AND (
      public.has_role(auth.uid(), 'lider'::app_role)
      OR public.has_role(auth.uid(), 'sublider'::app_role)
    )
    AND public.can_view_org_project(auth.uid(), project_id)
  )
  -- Membro comum: apenas tarefas atribuídas a ele
  OR assigned_to = auth.uid()
  -- Criador da tarefa (preserva fluxo de quem criou para outro)
  OR created_by = auth.uid()
);