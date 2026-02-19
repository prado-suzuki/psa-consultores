
-- 1. Allow creators to see their own tax_projects (fixes .select() after .insert())
CREATE POLICY "Creators can view own tax_projects"
ON public.tax_projects FOR SELECT
USING (created_by = auth.uid());

-- 2. Allow team members to view all user roles (needed to list líderes and team members)
CREATE POLICY "Team members can view all roles"
ON public.user_roles FOR SELECT
USING (has_role(auth.uid(), 'team_member'::app_role));
