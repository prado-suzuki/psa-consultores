DROP POLICY IF EXISTS rls_org_projects_select ON public.org_projects;

CREATE POLICY rls_org_projects_select
ON public.org_projects
FOR SELECT
TO public
USING (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  OR created_by = (select auth.uid())
  OR responsible_id = (select auth.uid())
  OR leader_id = (select auth.uid())
  OR public.can_view_org_project((select auth.uid()), id)
);