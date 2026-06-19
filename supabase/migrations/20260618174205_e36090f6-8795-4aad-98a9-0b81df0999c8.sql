DROP POLICY IF EXISTS rls_org_tasks_update ON public.org_tasks;
CREATE POLICY rls_org_tasks_update ON public.org_tasks
  FOR UPDATE TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (has_role_or_higher(auth.uid(), 'team_member'::app_role));