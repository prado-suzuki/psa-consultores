
-- 1. Create is_area_member helper function
CREATE OR REPLACE FUNCTION public.is_area_member(_user_id uuid, _estrutura_area_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM estrutura_equipe_membros em
    JOIN estrutura_equipes eq ON eq.id = em.equipe_id
    WHERE em.user_id = _user_id
      AND eq.area_id = _estrutura_area_id
  )
$$;

-- 2. Replace SELECT policy on tax_projects for team_member
DROP POLICY IF EXISTS "Members can view their tax_projects" ON public.tax_projects;

CREATE POLICY "Members can view their tax_projects"
  ON public.tax_projects
  FOR SELECT
  TO authenticated
  USING (
    is_project_member(auth.uid(), id)
    OR EXISTS (
      SELECT 1 FROM public.tax_areas ta
      WHERE ta.id = tax_projects.area_id
        AND ta.estrutura_area_id IS NOT NULL
        AND is_area_member(auth.uid(), ta.estrutura_area_id)
    )
  );

-- 3. Replace SELECT policy on fiscal_tasks for team_member
DROP POLICY IF EXISTS "Members can view their project fiscal_tasks" ON public.fiscal_tasks;

CREATE POLICY "Members can view their project fiscal_tasks"
  ON public.fiscal_tasks
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'team_member'::app_role)
    AND (
      project_id IS NULL
      OR is_project_member(auth.uid(), project_id)
      OR EXISTS (
        SELECT 1 FROM public.tax_projects tp
        JOIN public.tax_areas ta ON ta.id = tp.area_id
        WHERE tp.id = fiscal_tasks.project_id
          AND ta.estrutura_area_id IS NOT NULL
          AND is_area_member(auth.uid(), ta.estrutura_area_id)
      )
    )
  );
