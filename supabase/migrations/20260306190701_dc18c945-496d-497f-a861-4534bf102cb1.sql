-- 1. Líderes veem todos os projetos
CREATE POLICY "Leaders can view all tax_projects"
  ON public.tax_projects FOR SELECT
  TO public
  USING (has_role(auth.uid(), 'lider'::app_role));

-- 2. Corrigir fiscal_tasks: separar lider da checagem de membership
DROP POLICY IF EXISTS "Members can view their project fiscal_tasks" ON public.fiscal_tasks;

CREATE POLICY "Leaders can view all fiscal_tasks"
  ON public.fiscal_tasks FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'lider'::app_role));

CREATE POLICY "Members can view their project fiscal_tasks"
  ON public.fiscal_tasks FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'team_member'::app_role)
    AND (project_id IS NULL OR is_project_member(auth.uid(), project_id))
  );