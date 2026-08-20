
-- Drop the existing restrictive admin-only policy
DROP POLICY IF EXISTS "Admins can manage participante_dev" ON public.participante_dev;

-- Create granular policies for team_member + admin
CREATE POLICY "Team members can create participante_dev"
  ON public.participante_dev FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can update participante_dev"
  ON public.participante_dev FOR UPDATE
  USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can delete participante_dev"
  ON public.participante_dev FOR DELETE
  USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
