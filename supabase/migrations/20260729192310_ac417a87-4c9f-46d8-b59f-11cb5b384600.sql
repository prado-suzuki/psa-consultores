
-- Drop dependent policies first
DROP POLICY IF EXISTS difal_decisao_select ON public.difal_decisao;
DROP POLICY IF EXISTS difal_sessao_select ON public.difal_sessao;

ALTER TABLE public.difal_sessao
  ALTER COLUMN cliente_id TYPE uuid USING cliente_id::uuid;

ALTER TABLE public.difal_sessao
  ADD CONSTRAINT difal_sessao_cliente_id_fkey
  FOREIGN KEY (cliente_id) REFERENCES public.cliente(id) ON DELETE RESTRICT;

CREATE POLICY difal_sessao_select
  ON public.difal_sessao
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.cliente_visivel_para(cliente_id)
  );

CREATE POLICY difal_decisao_select
  ON public.difal_decisao
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.difal_sessao s
      WHERE s.id = difal_decisao.sessao_id
        AND public.cliente_visivel_para(s.cliente_id)
    )
  );

-- ============================================================
-- cliente_clusters: scope by user's clusters
-- ============================================================
DROP POLICY IF EXISTS lider_manage_cliente_clusters ON public.cliente_clusters;
DROP POLICY IF EXISTS sublider_or_higher_manage_cliente_clusters ON public.cliente_clusters;

CREATE POLICY admin_manage_cliente_clusters
  ON public.cliente_clusters
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY sublider_or_higher_manage_own_cluster_links
  ON public.cliente_clusters
  FOR ALL
  TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'sublider'::app_role)
    AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))
  )
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'sublider'::app_role)
    AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))
  );

-- ============================================================
-- Restrict public-role policies to authenticated
-- ============================================================
DROP POLICY IF EXISTS ordem_servico_select ON public.ordem_servico;
CREATE POLICY ordem_servico_select ON public.ordem_servico
  FOR SELECT TO authenticated
  USING (
    (excluido = false)
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.cliente_visivel_para(id_cliente)
      OR ((cluster_id IS NOT NULL) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))
    )
  );

DROP POLICY IF EXISTS rls_ordem_servico_delete ON public.ordem_servico;
CREATE POLICY rls_ordem_servico_delete ON public.ordem_servico
  FOR DELETE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

DROP POLICY IF EXISTS rls_ordem_servico_update ON public.ordem_servico;
CREATE POLICY rls_ordem_servico_update ON public.ordem_servico
  FOR UPDATE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

DROP POLICY IF EXISTS rls_distribuicao_dcomp_delete ON public.distribuicao_dcomp;
CREATE POLICY rls_distribuicao_dcomp_delete ON public.distribuicao_dcomp
  FOR DELETE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

DROP POLICY IF EXISTS rls_distribuicao_dcomp_insert ON public.distribuicao_dcomp;
CREATE POLICY rls_distribuicao_dcomp_insert ON public.distribuicao_dcomp
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS rls_distribuicao_dcomp_update ON public.distribuicao_dcomp;
CREATE POLICY rls_distribuicao_dcomp_update ON public.distribuicao_dcomp
  FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

DROP POLICY IF EXISTS cliente_select_scoped ON public.cliente;
CREATE POLICY cliente_select_scoped ON public.cliente
  FOR SELECT TO authenticated
  USING (
    (excluido = false)
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) AND public.cliente_visivel_para(id))
      OR (public.resolve_user_cliente_id(auth.uid()) = id)
    )
  );

DROP POLICY IF EXISTS rls_cliente_delete ON public.cliente;
CREATE POLICY rls_cliente_delete ON public.cliente
  FOR DELETE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

DROP POLICY IF EXISTS rls_cliente_update ON public.cliente;
CREATE POLICY rls_cliente_update ON public.cliente
  FOR UPDATE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

DROP POLICY IF EXISTS "Clients can read their own representante" ON public.representante;
CREATE POLICY "Clients can read their own representante" ON public.representante
  FOR SELECT TO authenticated
  USING ((excluido = false) AND (auth.uid() = user_id));

DROP POLICY IF EXISTS rls_representante_delete ON public.representante;
CREATE POLICY rls_representante_delete ON public.representante
  FOR DELETE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

DROP POLICY IF EXISTS rls_representante_update ON public.representante;
CREATE POLICY rls_representante_update ON public.representante
  FOR UPDATE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

DROP POLICY IF EXISTS team_select_representante ON public.representante;
CREATE POLICY team_select_representante ON public.representante
  FOR SELECT TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS contribuinte_select ON public.contribuinte;
CREATE POLICY contribuinte_select ON public.contribuinte
  FOR SELECT TO authenticated
  USING ((excluido = false) AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.cliente_visivel_para(cliente_id)));

DROP POLICY IF EXISTS rls_contribuinte_delete ON public.contribuinte;
CREATE POLICY rls_contribuinte_delete ON public.contribuinte
  FOR DELETE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

DROP POLICY IF EXISTS rls_contribuinte_update ON public.contribuinte;
CREATE POLICY rls_contribuinte_update ON public.contribuinte
  FOR UPDATE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

DROP POLICY IF EXISTS distribuicao_receita_select ON public.distribuicao_receita;
CREATE POLICY distribuicao_receita_select ON public.distribuicao_receita
  FOR SELECT TO authenticated
  USING (
    (excluido = false)
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.ordem_servico os
        WHERE os.id = distribuicao_receita.id_ordem_servico
          AND public.cliente_visivel_para(os.id_cliente)
      )
    )
  );

DROP POLICY IF EXISTS rls_distribuicao_receita_delete ON public.distribuicao_receita;
CREATE POLICY rls_distribuicao_receita_delete ON public.distribuicao_receita
  FOR DELETE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

DROP POLICY IF EXISTS rls_distribuicao_receita_update ON public.distribuicao_receita;
CREATE POLICY rls_distribuicao_receita_update ON public.distribuicao_receita
  FOR UPDATE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));
