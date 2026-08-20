DROP POLICY "Team members podem ver permissões de página" ON public.page_permissions;

CREATE POLICY "Team members podem ver permissões de página"
  ON public.page_permissions
  FOR SELECT
  TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));