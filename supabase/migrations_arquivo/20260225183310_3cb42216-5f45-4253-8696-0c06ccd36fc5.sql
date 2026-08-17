-- Fix: UPDATE policy on fiscal_tasks also allows access without role check when project_id IS NULL

DROP POLICY IF EXISTS "Members can update their project fiscal_tasks" ON fiscal_tasks;

CREATE POLICY "Members can update their project fiscal_tasks"
ON fiscal_tasks
FOR UPDATE
TO authenticated
USING (
  (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'lider'::app_role))
  AND
  (project_id IS NULL OR is_project_member(auth.uid(), project_id))
);