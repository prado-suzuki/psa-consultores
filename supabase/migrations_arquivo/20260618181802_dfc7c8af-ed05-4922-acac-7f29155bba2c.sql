DROP POLICY IF EXISTS rls_org_tasks_select ON public.org_tasks;

CREATE POLICY rls_org_tasks_select
ON public.org_tasks
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
  OR assigned_to = auth.uid()
  OR created_by = auth.uid()
);