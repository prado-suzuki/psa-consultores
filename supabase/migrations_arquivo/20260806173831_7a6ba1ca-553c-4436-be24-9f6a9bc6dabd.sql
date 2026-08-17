-- cliente: escopo de cluster na escrita (UPDATE/DELETE). INSERT permanece por papel,
-- pois o vínculo de cluster só existe após a inserção (trigger deferido).
DROP POLICY IF EXISTS rls_cliente_update ON public.cliente;
CREATE POLICY rls_cliente_update ON public.cliente FOR UPDATE TO authenticated
USING (excluido = false AND has_role_or_higher(auth.uid(), 'sublider'::app_role) AND cliente_visivel_para(id))
WITH CHECK (has_role_or_higher(auth.uid(), 'sublider'::app_role) AND cliente_visivel_para(id));

DROP POLICY IF EXISTS rls_cliente_delete ON public.cliente;
CREATE POLICY rls_cliente_delete ON public.cliente FOR DELETE TO authenticated
USING (excluido = false AND has_role_or_higher(auth.uid(), 'sublider'::app_role) AND cliente_visivel_para(id));

-- contribuinte
DROP POLICY IF EXISTS rls_contribuinte_insert ON public.contribuinte;
CREATE POLICY rls_contribuinte_insert ON public.contribuinte FOR INSERT TO authenticated
WITH CHECK (has_role_or_higher(auth.uid(), 'sublider'::app_role) AND cliente_visivel_para(cliente_id));

DROP POLICY IF EXISTS rls_contribuinte_update ON public.contribuinte;
CREATE POLICY rls_contribuinte_update ON public.contribuinte FOR UPDATE TO authenticated
USING (excluido = false AND has_role_or_higher(auth.uid(), 'sublider'::app_role) AND cliente_visivel_para(cliente_id))
WITH CHECK (has_role_or_higher(auth.uid(), 'sublider'::app_role) AND cliente_visivel_para(cliente_id));

DROP POLICY IF EXISTS rls_contribuinte_delete ON public.contribuinte;
CREATE POLICY rls_contribuinte_delete ON public.contribuinte FOR DELETE TO authenticated
USING (excluido = false AND has_role_or_higher(auth.uid(), 'sublider'::app_role) AND cliente_visivel_para(cliente_id));

-- representante
DROP POLICY IF EXISTS rls_representante_insert ON public.representante;
CREATE POLICY rls_representante_insert ON public.representante FOR INSERT TO authenticated
WITH CHECK (has_role_or_higher(auth.uid(), 'sublider'::app_role) AND cliente_visivel_para(id_cliente));

DROP POLICY IF EXISTS rls_representante_update ON public.representante;
CREATE POLICY rls_representante_update ON public.representante FOR UPDATE TO authenticated
USING (excluido = false AND has_role_or_higher(auth.uid(), 'sublider'::app_role) AND cliente_visivel_para(id_cliente))
WITH CHECK (has_role_or_higher(auth.uid(), 'sublider'::app_role) AND cliente_visivel_para(id_cliente));

DROP POLICY IF EXISTS rls_representante_delete ON public.representante;
CREATE POLICY rls_representante_delete ON public.representante FOR DELETE TO authenticated
USING (excluido = false AND has_role_or_higher(auth.uid(), 'sublider'::app_role) AND cliente_visivel_para(id_cliente));

-- ordem_servico
DROP POLICY IF EXISTS rls_ordem_servico_insert ON public.ordem_servico;
CREATE POLICY rls_ordem_servico_insert ON public.ordem_servico FOR INSERT TO authenticated
WITH CHECK (
  has_role_or_higher(auth.uid(), 'sublider'::app_role)
  AND (cliente_visivel_para(id_cliente)
       OR (cluster_id IS NOT NULL AND cluster_id = ANY (resolve_user_cluster_ids(auth.uid()))))
);

DROP POLICY IF EXISTS rls_ordem_servico_update ON public.ordem_servico;
CREATE POLICY rls_ordem_servico_update ON public.ordem_servico FOR UPDATE TO authenticated
USING (
  excluido = false AND has_role_or_higher(auth.uid(), 'sublider'::app_role)
  AND (cliente_visivel_para(id_cliente)
       OR (cluster_id IS NOT NULL AND cluster_id = ANY (resolve_user_cluster_ids(auth.uid()))))
)
WITH CHECK (
  has_role_or_higher(auth.uid(), 'sublider'::app_role)
  AND (cliente_visivel_para(id_cliente)
       OR (cluster_id IS NOT NULL AND cluster_id = ANY (resolve_user_cluster_ids(auth.uid()))))
);

DROP POLICY IF EXISTS rls_ordem_servico_delete ON public.ordem_servico;
CREATE POLICY rls_ordem_servico_delete ON public.ordem_servico FOR DELETE TO authenticated
USING (
  excluido = false AND has_role_or_higher(auth.uid(), 'sublider'::app_role)
  AND (cliente_visivel_para(id_cliente)
       OR (cluster_id IS NOT NULL AND cluster_id = ANY (resolve_user_cluster_ids(auth.uid()))))
);

-- distribuicao_dcomp: mesmo escopo do SELECT (can_view_contribuinte via dcomp -> per)
DROP POLICY IF EXISTS rls_distribuicao_dcomp_insert ON public.distribuicao_dcomp;
CREATE POLICY rls_distribuicao_dcomp_insert ON public.distribuicao_dcomp FOR INSERT TO authenticated
WITH CHECK (
  has_role_or_higher(auth.uid(), 'team_member'::app_role)
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.dcomp d
      JOIN public.per p ON p.nr_per::text = d.nr_per_orig::text
      WHERE d.nr_documento::text = distribuicao_dcomp.nr_documento::text
        AND can_view_contribuinte(auth.uid(), p.id_contribuinte)
    )
  )
);

DROP POLICY IF EXISTS rls_distribuicao_dcomp_update ON public.distribuicao_dcomp;
CREATE POLICY rls_distribuicao_dcomp_update ON public.distribuicao_dcomp FOR UPDATE TO authenticated
USING (
  has_role_or_higher(auth.uid(), 'sublider'::app_role)
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.dcomp d
      JOIN public.per p ON p.nr_per::text = d.nr_per_orig::text
      WHERE d.nr_documento::text = distribuicao_dcomp.nr_documento::text
        AND can_view_contribuinte(auth.uid(), p.id_contribuinte)
    )
  )
)
WITH CHECK (
  has_role_or_higher(auth.uid(), 'sublider'::app_role)
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.dcomp d
      JOIN public.per p ON p.nr_per::text = d.nr_per_orig::text
      WHERE d.nr_documento::text = distribuicao_dcomp.nr_documento::text
        AND can_view_contribuinte(auth.uid(), p.id_contribuinte)
    )
  )
);

DROP POLICY IF EXISTS rls_distribuicao_dcomp_delete ON public.distribuicao_dcomp;
CREATE POLICY rls_distribuicao_dcomp_delete ON public.distribuicao_dcomp FOR DELETE TO authenticated
USING (
  has_role_or_higher(auth.uid(), 'sublider'::app_role)
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.dcomp d
      JOIN public.per p ON p.nr_per::text = d.nr_per_orig::text
      WHERE d.nr_documento::text = distribuicao_dcomp.nr_documento::text
        AND can_view_contribuinte(auth.uid(), p.id_contribuinte)
    )
  )
);

-- ticket_messages: UPDATE amarrado ao chamado visível e sem troca de autor/chamado
DROP POLICY IF EXISTS rls_ticket_messages_update ON public.ticket_messages;
CREATE POLICY rls_ticket_messages_update ON public.ticket_messages FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND can_view_ticket(ticket_id))
WITH CHECK (user_id = auth.uid() AND can_view_ticket(ticket_id));

CREATE OR REPLACE FUNCTION public.ticket_messages_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_id IS DISTINCT FROM OLD.ticket_id THEN
    RAISE EXCEPTION 'Não é permitido mover a mensagem para outro chamado';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Não é permitido alterar o autor da mensagem';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_messages_guard_update ON public.ticket_messages;
CREATE TRIGGER trg_ticket_messages_guard_update
BEFORE UPDATE ON public.ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.ticket_messages_guard_update();