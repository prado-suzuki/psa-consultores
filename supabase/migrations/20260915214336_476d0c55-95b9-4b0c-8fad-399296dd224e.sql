DROP POLICY IF EXISTS rls_org_tasks_select ON public.org_tasks;

CREATE POLICY rls_org_tasks_select ON public.org_tasks
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      project_id IS NOT NULL
      AND (has_role(auth.uid(), 'lider'::app_role) OR has_role(auth.uid(), 'sublider'::app_role))
      AND can_view_org_project(auth.uid(), project_id)
    )
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR (
      reviewer_id = auth.uid()
      AND status IN ('review'::fiscal_task_status, 'em_ajuste'::fiscal_task_status)
    )
  );