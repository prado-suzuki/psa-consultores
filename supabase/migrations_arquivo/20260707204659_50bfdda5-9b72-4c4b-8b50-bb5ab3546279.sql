DO $$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['tickets','ticket_messages','ticket_attachments']
  LOOP
    FOR p IN SELECT policyname FROM pg_policies
             WHERE schemaname='public' AND tablename=t AND cmd='SELECT'
    LOOP EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t); END LOOP;
  END LOOP;
END $$;

CREATE POLICY rls_tickets_select ON public.tickets
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
        AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))
    OR auth.uid() = user_id
    OR public.is_ticket_assigned_to(id, auth.uid())
  );

CREATE POLICY rls_ticket_messages_select ON public.ticket_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_messages.ticket_id));

CREATE POLICY rls_ticket_attachments_select ON public.ticket_attachments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_attachments.ticket_id));