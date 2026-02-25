DROP POLICY IF EXISTS "Members can update their project fiscal_tasks" ON public.fiscal_tasks;

CREATE POLICY "Members can update their project fiscal_tasks"
ON public.fiscal_tasks
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'lider'::app_role)
  OR (
    has_role(auth.uid(), 'team_member'::app_role)
    AND (project_id IS NULL OR is_project_member(auth.uid(), project_id))
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'lider'::app_role)
  OR (
    has_role(auth.uid(), 'team_member'::app_role)
    AND (project_id IS NULL OR is_project_member(auth.uid(), project_id))
  )
);