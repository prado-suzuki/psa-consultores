
-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  area text NOT NULL, -- 'tax' or 'osg'
  entity_type text NOT NULL, -- 'project', 'task', 'subtask'
  entity_id uuid NOT NULL,
  entity_name text NOT NULL,
  action text NOT NULL, -- 'created', 'updated', 'deleted'
  changed_fields jsonb,
  performed_by uuid NOT NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  details text
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access audit_logs"
ON public.audit_logs FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Team members can insert logs
CREATE POLICY "Team members can insert audit_logs"
ON public.audit_logs FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin')
);

-- Team members can view logs of their projects (tax area)
CREATE POLICY "Members can view tax audit_logs"
ON public.audit_logs FOR SELECT
USING (
  (area = 'tax' AND has_role(auth.uid(), 'team_member') AND (
    entity_type = 'project' AND is_project_member(auth.uid(), entity_id)
    OR entity_type IN ('task', 'subtask') AND EXISTS (
      SELECT 1 FROM fiscal_tasks ft
      WHERE ft.id = entity_id
      AND ft.project_id IS NOT NULL
      AND is_project_member(auth.uid(), ft.project_id)
    )
  ))
  OR (area = 'osg' AND has_role(auth.uid(), 'team_member'))
);

-- Add index for performance
CREATE INDEX idx_audit_logs_area_performed_at ON public.audit_logs (area, performed_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
