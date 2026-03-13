-- Fase 4: Simplificar RLS policies removendo JOIN com tax_areas

-- Policy 1: tax_projects SELECT — eliminar JOIN com tax_areas
ALTER POLICY "Members can view their tax_projects"
ON public.tax_projects
USING (
  is_project_member(auth.uid(), id)
  OR (
    tax_projects.estrutura_area_id IS NOT NULL
    AND is_area_member(auth.uid(), tax_projects.estrutura_area_id)
  )
);

-- Policy 2: fiscal_tasks SELECT — eliminar JOIN tax_projects→tax_areas
ALTER POLICY "Members can view their project fiscal_tasks"
ON public.fiscal_tasks
USING (
  has_role(auth.uid(), 'team_member'::app_role)
  AND (
    project_id IS NULL
    OR is_project_member(auth.uid(), project_id)
    OR EXISTS (
      SELECT 1 FROM tax_projects tp
      WHERE tp.id = fiscal_tasks.project_id
        AND tp.estrutura_area_id IS NOT NULL
        AND is_area_member(auth.uid(), tp.estrutura_area_id)
    )
  )
);