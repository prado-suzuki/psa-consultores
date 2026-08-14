
DROP POLICY "Team members can create fiscal tasks" ON public.fiscal_tasks;

CREATE POLICY "Team members can create fiscal tasks" ON public.fiscal_tasks
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'team_member'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'lider'::app_role)
  OR has_role(auth.uid(), 'sublider'::app_role)
);
