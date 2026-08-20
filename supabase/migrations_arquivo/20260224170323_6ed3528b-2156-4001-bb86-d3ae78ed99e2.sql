
-- 1. fiscal_tasks: adicionar lider ao INSERT
DROP POLICY "Team members can create fiscal tasks" ON fiscal_tasks;
CREATE POLICY "Team members can create fiscal tasks" ON fiscal_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'team_member') OR
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'lider')
  );

-- 2. tax_projects: restringir INSERT a admin e lider
DROP POLICY "Team members can create tax_projects" ON tax_projects;
CREATE POLICY "Admins and leaders can create tax_projects" ON tax_projects
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'lider')
  );

-- 3. tax_projects: adicionar lider ao DELETE
DROP POLICY "Admins can delete tax_projects" ON tax_projects;
CREATE POLICY "Admins and leaders can delete tax_projects" ON tax_projects
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'lider')
  );
