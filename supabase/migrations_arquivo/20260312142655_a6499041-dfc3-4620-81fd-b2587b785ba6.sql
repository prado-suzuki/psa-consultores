-- 1. tax_project_members: harmonizar INSERT/DELETE + adicionar UPDATE

DROP POLICY IF EXISTS "Team members can insert project members" ON public.tax_project_members;
DROP POLICY IF EXISTS "Team members can delete project members" ON public.tax_project_members;

CREATE POLICY "Team can insert tax_project_members"
  ON public.tax_project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'lider'::app_role)
    OR public.has_role(auth.uid(), 'sublider'::app_role)
    OR public.has_role(auth.uid(), 'team_member'::app_role)
  );

CREATE POLICY "Team can update tax_project_members"
  ON public.tax_project_members FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'lider'::app_role)
    OR public.has_role(auth.uid(), 'sublider'::app_role)
    OR public.has_role(auth.uid(), 'team_member'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'lider'::app_role)
    OR public.has_role(auth.uid(), 'sublider'::app_role)
    OR public.has_role(auth.uid(), 'team_member'::app_role)
  );

CREATE POLICY "Team can delete tax_project_members"
  ON public.tax_project_members FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'lider'::app_role)
    OR public.has_role(auth.uid(), 'sublider'::app_role)
    OR public.has_role(auth.uid(), 'team_member'::app_role)
  );

-- 2. project_servicos: limpar duplicatas + adicionar UPDATE + incluir sublider

DROP POLICY IF EXISTS "team_lider_select_project_servicos" ON public.project_servicos;
DROP POLICY IF EXISTS "Team and lider can view tax_project_categorias" ON public.project_servicos;
DROP POLICY IF EXISTS "admin_lider_insert_project_servicos" ON public.project_servicos;
DROP POLICY IF EXISTS "Team and lider can insert tax_project_categorias" ON public.project_servicos;
DROP POLICY IF EXISTS "admin_lider_delete_project_servicos" ON public.project_servicos;
DROP POLICY IF EXISTS "Team and lider can delete tax_project_categorias" ON public.project_servicos;

CREATE POLICY "Team can select project_servicos"
  ON public.project_servicos FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'lider'::app_role)
    OR public.has_role(auth.uid(), 'sublider'::app_role)
    OR public.has_role(auth.uid(), 'team_member'::app_role)
  );

CREATE POLICY "Team can insert project_servicos"
  ON public.project_servicos FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'lider'::app_role)
    OR public.has_role(auth.uid(), 'sublider'::app_role)
    OR public.has_role(auth.uid(), 'team_member'::app_role)
  );

CREATE POLICY "Team can update project_servicos"
  ON public.project_servicos FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'lider'::app_role)
    OR public.has_role(auth.uid(), 'sublider'::app_role)
    OR public.has_role(auth.uid(), 'team_member'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'lider'::app_role)
    OR public.has_role(auth.uid(), 'sublider'::app_role)
    OR public.has_role(auth.uid(), 'team_member'::app_role)
  );

CREATE POLICY "Team can delete project_servicos"
  ON public.project_servicos FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'lider'::app_role)
    OR public.has_role(auth.uid(), 'sublider'::app_role)
    OR public.has_role(auth.uid(), 'team_member'::app_role)
  );