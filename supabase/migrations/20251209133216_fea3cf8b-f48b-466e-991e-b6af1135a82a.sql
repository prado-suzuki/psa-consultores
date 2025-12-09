-- Add DELETE policies for projects and sprints (tasks already has one for admins)
-- Allow team members and admins to delete projects
CREATE POLICY "Team members can delete projects"
ON public.projects FOR DELETE
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Allow team members and admins to delete sprints
CREATE POLICY "Team members can delete sprints"
ON public.sprints FOR DELETE
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Update tasks DELETE policy to include team members
DROP POLICY IF EXISTS "Admins can delete tasks" ON public.tasks;
CREATE POLICY "Team members can delete tasks"
ON public.tasks FOR DELETE
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));