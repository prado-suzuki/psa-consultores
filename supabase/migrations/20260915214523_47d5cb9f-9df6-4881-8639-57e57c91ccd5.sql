DROP POLICY IF EXISTS rls_org_tasks_select ON public.org_tasks;
CREATE POLICY rls_org_tasks_select ON public.org_tasks
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      project_id IS NOT NULL
      AND (public.has_role(auth.uid(), 'lider'::public.app_role) OR public.has_role(auth.uid(), 'sublider'::public.app_role))
      AND public.can_view_org_project(auth.uid(), project_id)
    )
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR (reviewer_id = auth.uid() AND status = ANY (ARRAY['review'::public.fiscal_task_status, 'em_ajuste'::public.fiscal_task_status]))
  );