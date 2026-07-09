
-- RLS-05 Fiscal

-- PASSO 1: split ALL → INSERT/UPDATE/DELETE
CREATE POLICY rls_efd_correcoes_insert ON public.efd_correcoes
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY rls_efd_correcoes_update ON public.efd_correcoes
  FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY rls_efd_correcoes_delete ON public.efd_correcoes
  FOR DELETE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
DROP POLICY team_manage_efd_correcoes ON public.efd_correcoes;

CREATE POLICY rls_os_produtos_contratados_insert ON public.os_produtos_contratados
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));
CREATE POLICY rls_os_produtos_contratados_update ON public.os_produtos_contratados
  FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));
CREATE POLICY rls_os_produtos_contratados_delete ON public.os_produtos_contratados
  FOR DELETE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));
DROP POLICY sublider_manage_os_produtos ON public.os_produtos_contratados;

-- PASSO 2: helper
CREATE OR REPLACE FUNCTION public.can_view_contribuinte(_uid uuid, _contribuinte_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid, 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.contribuinte c
        WHERE c.id = _contribuinte_id
          AND public.cliente_visivel_para(c.cliente_id)
      );
$$;

-- PASSO 3: DROP SELECT antigas
DROP POLICY team_select_contribuinte              ON public.contribuinte;
DROP POLICY team_select_inscricao_contribuinte    ON public.inscricao_contribuinte;
DROP POLICY "Equipe pode visualizar correcoes ICMS" ON public.correcoes_icms;
DROP POLICY team_select_per                       ON public.per;
DROP POLICY team_select_per_situacao              ON public.per_situacao;
DROP POLICY team_select_dcomp                     ON public.dcomp;
DROP POLICY team_select_distribuicao_dcomp        ON public.distribuicao_dcomp;
DROP POLICY team_select_distribuicao_receita      ON public.distribuicao_receita;
DROP POLICY team_select_os_produtos               ON public.os_produtos_contratados;
DROP POLICY "Team members can view difal_sessao"  ON public.difal_sessao;
DROP POLICY "Team members can view difal_decisao" ON public.difal_decisao;
DROP POLICY rls_efd_correcoes_select              ON public.efd_correcoes;
DROP POLICY team_select_pis_cofins_regra          ON public.pis_cofins_regra;
DROP POLICY team_select_pis_cofins_class          ON public.pis_cofins_class;

-- PASSO 4: SELECT diretas UUID
CREATE POLICY contribuinte_select ON public.contribuinte
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)
      OR public.cliente_visivel_para(cliente_id));

CREATE POLICY inscricao_contribuinte_select ON public.inscricao_contribuinte
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)
      OR public.can_view_contribuinte(auth.uid(), contribuinte_id));

CREATE POLICY correcoes_icms_select ON public.correcoes_icms
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)
      OR public.can_view_contribuinte(auth.uid(), contribuinte_id));

CREATE POLICY per_select ON public.per
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)
      OR public.can_view_contribuinte(auth.uid(), id_contribuinte));

-- PASSO 5: SELECT com colunas TEXT
CREATE POLICY efd_correcoes_select ON public.efd_correcoes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.contribuinte c
    WHERE c.id::text = efd_correcoes.contribuinte_id
      AND public.cliente_visivel_para(c.cliente_id)
  ));

CREATE POLICY difal_sessao_select ON public.difal_sessao
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.cliente c
    WHERE c.id::text = difal_sessao.cliente_id
      AND public.cliente_visivel_para(c.id)
  ));

-- PASSO 6: SELECT indiretas
CREATE POLICY per_situacao_select ON public.per_situacao
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.per p
    WHERE p.nr_per = per_situacao.nr_proc_per
      AND public.can_view_contribuinte(auth.uid(), p.id_contribuinte)
  ));

CREATE POLICY dcomp_select ON public.dcomp
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.per p
    WHERE p.nr_per = dcomp.nr_per_orig
      AND public.can_view_contribuinte(auth.uid(), p.id_contribuinte)
  ));

CREATE POLICY distribuicao_dcomp_select ON public.distribuicao_dcomp
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.dcomp d
    JOIN public.per p ON p.nr_per = d.nr_per_orig
    WHERE d.nr_documento = distribuicao_dcomp.nr_documento
      AND public.can_view_contribuinte(auth.uid(), p.id_contribuinte)
  ));

CREATE POLICY distribuicao_receita_select ON public.distribuicao_receita
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.ordem_servico os
    WHERE os.id = distribuicao_receita.id_ordem_servico
      AND public.cliente_visivel_para(os.id_cliente)
  ));

CREATE POLICY os_produtos_contratados_select ON public.os_produtos_contratados
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.ordem_servico os
    WHERE os.id = os_produtos_contratados.ordem_servico_id
      AND public.cliente_visivel_para(os.id_cliente)
  ));

CREATE POLICY difal_decisao_select ON public.difal_decisao
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.difal_sessao s
    JOIN public.cliente c ON c.id::text = s.cliente_id
    WHERE s.id = difal_decisao.sessao_id
      AND public.cliente_visivel_para(c.id)
  ));

-- Catálogos
CREATE POLICY pis_cofins_regra_select ON public.pis_cofins_regra
  FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(),'team_member'::app_role));

CREATE POLICY pis_cofins_class_select ON public.pis_cofins_class
  FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(),'team_member'::app_role));
