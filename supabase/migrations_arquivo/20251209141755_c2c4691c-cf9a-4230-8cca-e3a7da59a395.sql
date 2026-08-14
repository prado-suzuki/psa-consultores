-- Add DELETE policy for daily_standups
CREATE POLICY "Team members can delete their standups"
ON public.daily_standups
FOR DELETE
TO authenticated
USING (
  (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  AND auth.uid() = user_id
);