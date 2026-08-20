-- Fix: SELECT policy on fiscal_tasks allows anonymous access when project_id IS NULL
-- Drop the overly permissive policy and replace with one requiring authentication + role

DROP POLICY IF EXISTS "Members can view their project fiscal_tasks" ON fiscal_tasks;

CREATE POLICY "Members can view their project fiscal_tasks"
ON fiscal_tasks
FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'lider'::app_role))
  AND
  (project_id IS NULL OR is_project_member(auth.uid(), project_id))
);