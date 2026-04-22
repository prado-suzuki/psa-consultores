-- ── org_projects ──────────────────────────────────────────────────
DROP POLICY IF EXISTS rls_org_projects_select ON public.org_projects;
CREATE POLICY rls_org_projects_select ON public.org_projects
FOR SELECT TO authenticated
USING (
  public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
  OR (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND (
      public.is_project_member(auth.uid(), id)
      OR (estrutura_area_id IS NOT NULL AND public.is_area_member(auth.uid(), estrutura_area_id))
      OR responsible_id = auth.uid()
      OR leader_id = auth.uid()
      OR created_by = auth.uid()
    )
  )
);

-- ── fiscal_tasks ──────────────────────────────────────────────────
DROP POLICY IF EXISTS rls_fiscal_tasks_select ON public.fiscal_tasks;
CREATE POLICY rls_fiscal_tasks_select ON public.fiscal_tasks
FOR SELECT TO authenticated
USING (
  public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
  OR (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND (
      assigned_to = auth.uid()
      OR created_by = auth.uid()
      OR (project_id IS NOT NULL AND public.is_project_member(auth.uid(), project_id))
      OR (project_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.org_projects op
            WHERE op.id = fiscal_tasks.project_id
              AND op.estrutura_area_id IS NOT NULL
              AND public.is_area_member(auth.uid(), op.estrutura_area_id)
          ))
    )
  )
);

-- ── projects (legado) ─────────────────────────────────────────────
DROP POLICY IF EXISTS rls_projects_select ON public.projects;
CREATE POLICY rls_projects_select ON public.projects
FOR SELECT TO authenticated
USING (
  public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
  OR (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.client_visible_projects cvp
    WHERE cvp.project_id = projects.id AND cvp.user_id = auth.uid()
  )
);

-- ── tasks (legado, ligadas a sprints) ────────────────────────────
DROP POLICY IF EXISTS "Team members can view tasks" ON public.tasks;
DROP POLICY IF EXISTS rls_tasks_select ON public.tasks;
CREATE POLICY rls_tasks_select ON public.tasks
FOR SELECT TO authenticated
USING (
  public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
  OR (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND (
      assigned_to = auth.uid()
      OR created_by = auth.uid()
    )
  )
);