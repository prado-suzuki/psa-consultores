BEGIN;

DROP POLICY IF EXISTS rls_org_tasks_select ON public.org_tasks;

CREATE POLICY rls_org_tasks_select
ON public.org_tasks
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    project_id IS NOT NULL
    AND (
      public.has_role(auth.uid(), 'lider'::app_role)
      OR public.has_role(auth.uid(), 'sublider'::app_role)
    )
    AND public.can_view_org_project(auth.uid(), project_id)
  )
  OR assigned_to = auth.uid()
  OR created_by = auth.uid()
);

COMMIT;