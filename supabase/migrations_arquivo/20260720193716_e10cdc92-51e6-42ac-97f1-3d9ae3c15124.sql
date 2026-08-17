DROP POLICY IF EXISTS rls_org_tasks_delete ON public.org_tasks;

CREATE POLICY rls_org_tasks_delete ON public.org_tasks
FOR DELETE TO authenticated
USING (
  public.has_role_or_higher(auth.uid(),'lider'::app_role)
  OR (
    public.has_role_or_higher(auth.uid(),'sublider'::app_role)
    AND created_by = auth.uid()
  )
);