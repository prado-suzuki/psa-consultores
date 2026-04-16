
-- 1. org_projects: replace broad member policy with role-specific ones

DROP POLICY IF EXISTS "Members can view their org_projects" ON public.org_projects;

-- Leaders: can see all projects in their area
CREATE POLICY "Leaders can view area org_projects"
  ON public.org_projects FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'lider'::app_role)
    AND estrutura_area_id IS NOT NULL
    AND is_area_member(auth.uid(), estrutura_area_id)
  );

-- Sub-leaders / Team members: only projects where they are a member or creator
CREATE POLICY "Members can view their org_projects"
  ON public.org_projects FOR SELECT TO authenticated
  USING (
    is_project_member(auth.uid(), id)
    OR created_by = auth.uid()
  );

-- 2. fiscal_tasks: replace broad member policy with role-specific ones

DROP POLICY IF EXISTS "Members can view their project fiscal_tasks" ON public.fiscal_tasks;

-- Leaders: tasks from projects in their area
CREATE POLICY "Leaders can view area fiscal_tasks"
  ON public.fiscal_tasks FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'lider'::app_role)
    AND (
      project_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.org_projects tp
        WHERE tp.id = fiscal_tasks.project_id
          AND tp.estrutura_area_id IS NOT NULL
          AND is_area_member(auth.uid(), tp.estrutura_area_id)
      )
    )
  );

-- Sub-leaders / Team members: project member OR assigned to the task
CREATE POLICY "Members can view their fiscal_tasks"
  ON public.fiscal_tasks FOR SELECT TO authenticated
  USING (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    AND (
      project_id IS NULL
      OR is_project_member(auth.uid(), project_id)
      OR assigned_to = auth.uid()
    )
  );
