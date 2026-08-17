-- 1. Rename tables
ALTER TABLE tax_categorias RENAME TO servicos_prestados;
ALTER TABLE tax_area_categorias RENAME TO area_servicos;
ALTER TABLE tax_project_categorias RENAME TO project_servicos;

-- 2. Rename columns categoria_id → servico_id
ALTER TABLE area_servicos RENAME COLUMN categoria_id TO servico_id;
ALTER TABLE project_servicos RENAME COLUMN categoria_id TO servico_id;
ALTER TABLE fiscal_tasks RENAME COLUMN categoria_id TO servico_id;

-- 3. Add cluster_id to servicos_prestados and populate with PSA Fiscal
ALTER TABLE servicos_prestados ADD COLUMN cluster_id UUID REFERENCES estrutura_clusters(id);
UPDATE servicos_prestados SET cluster_id = (SELECT id FROM estrutura_clusters WHERE name = 'PSA Fiscal' LIMIT 1);

-- 4. Drop unused estrutura_area_id column
ALTER TABLE servicos_prestados DROP COLUMN IF EXISTS estrutura_area_id;

-- 5. Recreate RLS policies for servicos_prestados
DROP POLICY IF EXISTS "admin_all_tax_categorias" ON servicos_prestados;
DROP POLICY IF EXISTS "team_member_select_tax_categorias" ON servicos_prestados;

CREATE POLICY "admin_all_servicos_prestados" ON servicos_prestados
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "team_lider_select_servicos_prestados" ON servicos_prestados
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'team_member')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'lider')
  );

-- 6. Recreate RLS policies for area_servicos
DROP POLICY IF EXISTS "admin_all_tax_area_categorias" ON area_servicos;
DROP POLICY IF EXISTS "team_select_tax_area_categorias" ON area_servicos;

CREATE POLICY "admin_all_area_servicos" ON area_servicos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "team_lider_select_area_servicos" ON area_servicos
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'team_member')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'lider')
  );

-- 7. Recreate RLS policies for project_servicos
DROP POLICY IF EXISTS "admin_lider_select_tax_project_categorias" ON project_servicos;
DROP POLICY IF EXISTS "admin_lider_insert_tax_project_categorias" ON project_servicos;
DROP POLICY IF EXISTS "admin_lider_delete_tax_project_categorias" ON project_servicos;

CREATE POLICY "team_lider_select_project_servicos" ON project_servicos
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'team_member')
    OR public.has_role(auth.uid(), 'lider')
  );

CREATE POLICY "admin_lider_insert_project_servicos" ON project_servicos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'lider')
  );

CREATE POLICY "admin_lider_delete_project_servicos" ON project_servicos
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'lider')
  );