
-- Allow team members to view tickets assigned to them
CREATE POLICY "Team members can view assigned tickets"
ON public.tickets FOR SELECT
USING (
  has_role(auth.uid(), 'team_member'::app_role) AND assigned_to = auth.uid()
);

-- Allow team members to update tickets assigned to them
CREATE POLICY "Team members can update assigned tickets"
ON public.tickets FOR UPDATE
USING (
  has_role(auth.uid(), 'team_member'::app_role) AND assigned_to = auth.uid()
);
