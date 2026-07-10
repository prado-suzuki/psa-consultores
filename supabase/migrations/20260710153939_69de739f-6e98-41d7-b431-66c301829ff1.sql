-- RLS-03 Blindagem tickets: SELECT herda visibilidade do cliente; UPDATE apertado

DROP POLICY IF EXISTS rls_tickets_select ON public.tickets;
CREATE POLICY rls_tickets_select ON public.tickets FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND cliente_id IS NOT NULL
      AND public.cliente_visivel_para(cliente_id))
  OR auth.uid() = user_id
  OR public.is_ticket_assigned_to(id, auth.uid())
);

DROP POLICY IF EXISTS rls_tickets_update ON public.tickets;
CREATE POLICY rls_tickets_update ON public.tickets FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role_or_higher(auth.uid(),'sublider'::app_role)
  OR assigned_to = auth.uid()
  OR (auth.uid() = user_id AND public.has_role(auth.uid(),'client'::app_role))
)
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role_or_higher(auth.uid(),'sublider'::app_role)
  OR assigned_to = auth.uid()
  OR (auth.uid() = user_id AND public.has_role(auth.uid(),'client'::app_role))
);