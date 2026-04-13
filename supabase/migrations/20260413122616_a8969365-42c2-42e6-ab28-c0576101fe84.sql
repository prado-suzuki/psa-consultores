CREATE POLICY "team_member_insert_ticket_attachments"
ON public.ticket_attachments FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = uploaded_by
  AND (
    has_role(auth.uid(), 'team_member'::app_role)
    OR has_role(auth.uid(), 'lider'::app_role)
    OR has_role(auth.uid(), 'sublider'::app_role)
  )
);