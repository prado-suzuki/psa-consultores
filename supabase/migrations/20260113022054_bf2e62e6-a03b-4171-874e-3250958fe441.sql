-- Create access change log table for tracking permission changes
CREATE TABLE public.access_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  changed_by UUID NOT NULL,
  action TEXT NOT NULL, -- 'role_added', 'role_removed', 'user_created', 'access_granted', 'access_revoked'
  old_value TEXT,
  new_value TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.access_change_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view the log
CREATE POLICY "Admins podem ver histórico de alterações"
ON public.access_change_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert logs
CREATE POLICY "Admins podem inserir no histórico"
ON public.access_change_log
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_access_change_log_user_id ON public.access_change_log(user_id);
CREATE INDEX idx_access_change_log_created_at ON public.access_change_log(created_at DESC);