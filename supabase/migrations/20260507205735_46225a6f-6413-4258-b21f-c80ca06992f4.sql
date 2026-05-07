-- Recriar policy de INSERT em org_projects com padrão (select auth.uid())
DROP POLICY IF EXISTS rls_org_projects_insert ON public.org_projects;

CREATE POLICY rls_org_projects_insert
ON public.org_projects
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role_or_higher((select auth.uid()), 'sublider'::public.app_role)
  OR (
    public.has_role_or_higher((select auth.uid()), 'team_member'::public.app_role)
    AND created_by = (select auth.uid())
  )
);