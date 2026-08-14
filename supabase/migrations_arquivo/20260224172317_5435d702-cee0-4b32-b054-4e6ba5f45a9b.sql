CREATE POLICY "Members can insert audit_logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (
    performed_by = auth.uid()
    AND (
      has_role(auth.uid(), 'team_member'::app_role)
      OR has_role(auth.uid(), 'lider'::app_role)
    )
  );