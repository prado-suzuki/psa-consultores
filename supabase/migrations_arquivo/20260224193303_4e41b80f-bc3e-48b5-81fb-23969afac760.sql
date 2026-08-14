
-- ============================================================
-- 1. PROFILES – SELECT para team_member e lider
-- ============================================================
CREATE POLICY "Team members can read all profiles"
  ON public.profiles FOR SELECT
  USING (has_role(auth.uid(), 'team_member'::app_role));

CREATE POLICY "Leaders can read all profiles"
  ON public.profiles FOR SELECT
  USING (has_role(auth.uid(), 'lider'::app_role));

-- ============================================================
-- 2. TAX_PROJECTS – team_member no INSERT, criador no DELETE
-- ============================================================

-- 2a. DROP + recreate INSERT policy (adicionar team_member)
DROP POLICY IF EXISTS "Lider and admin can create tax_projects" ON public.tax_projects;
CREATE POLICY "Team can create tax_projects"
  ON public.tax_projects FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'lider'::app_role)
    OR has_role(auth.uid(), 'team_member'::app_role)
  );

-- 2b. DROP + recreate DELETE policy (adicionar criador)
DROP POLICY IF EXISTS "Lider and admin can delete tax_projects" ON public.tax_projects;
CREATE POLICY "Admin lider or creator can delete tax_projects"
  ON public.tax_projects FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'lider'::app_role)
    OR (created_by = auth.uid())
  );

-- ============================================================
-- 3. FISCAL_TASKS – lider no DELETE
-- ============================================================
DROP POLICY IF EXISTS "Admin or creator can delete fiscal_tasks" ON public.fiscal_tasks;
CREATE POLICY "Admin lider or creator can delete fiscal_tasks"
  ON public.fiscal_tasks FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'lider'::app_role)
    OR (created_by = auth.uid())
  );

-- ============================================================
-- 4. TAX_PROJECT_CATEGORIAS – lider no SELECT/INSERT/DELETE
-- ============================================================
DROP POLICY IF EXISTS "Team members can view tax_project_categorias" ON public.tax_project_categorias;
CREATE POLICY "Team and lider can view tax_project_categorias"
  ON public.tax_project_categorias FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'team_member'::app_role)
    OR has_role(auth.uid(), 'lider'::app_role)
  );

DROP POLICY IF EXISTS "Team members can insert tax_project_categorias" ON public.tax_project_categorias;
CREATE POLICY "Team and lider can insert tax_project_categorias"
  ON public.tax_project_categorias FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'team_member'::app_role)
    OR has_role(auth.uid(), 'lider'::app_role)
  );

DROP POLICY IF EXISTS "Team members can delete tax_project_categorias" ON public.tax_project_categorias;
CREATE POLICY "Team and lider can delete tax_project_categorias"
  ON public.tax_project_categorias FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'team_member'::app_role)
    OR has_role(auth.uid(), 'lider'::app_role)
  );

-- ============================================================
-- 5. TAX_AREA_CATEGORIAS – lider no SELECT
-- ============================================================
DROP POLICY IF EXISTS "Team members can view tax_area_categorias" ON public.tax_area_categorias;
CREATE POLICY "Team and lider can view tax_area_categorias"
  ON public.tax_area_categorias FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'team_member'::app_role)
    OR has_role(auth.uid(), 'lider'::app_role)
  );
