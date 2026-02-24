
DROP POLICY IF EXISTS "Members can view tax audit_logs" ON public.audit_logs;

CREATE POLICY "Members can view tax audit_logs"
ON public.audit_logs FOR SELECT
USING (
  (area IN ('tax', 'osg') AND (
    has_role(auth.uid(), 'team_member'::app_role)
    OR has_role(auth.uid(), 'lider'::app_role)
  ))
);
