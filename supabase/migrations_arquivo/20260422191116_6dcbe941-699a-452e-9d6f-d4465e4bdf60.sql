
-- ── admin OR lider → has_role_or_higher('lider') ──────────────
DROP POLICY IF EXISTS "Admin e lider acessam analises semestrais" ON public.analises_semestrais;
CREATE POLICY "lider_manage_analises_semestrais" ON public.analises_semestrais
FOR ALL TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

DROP POLICY IF EXISTS "Admin e lider acessam atualizacoes" ON public.atualizacoes_meta;
CREATE POLICY "lider_manage_atualizacoes_meta" ON public.atualizacoes_meta
FOR ALL TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

DROP POLICY IF EXISTS "Team members can manage centros_custo" ON public.centros_custo;
CREATE POLICY "lider_manage_centros_custo" ON public.centros_custo
FOR ALL TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

DROP POLICY IF EXISTS "Admin e lider acessam ciclos" ON public.ciclos_avaliacao;
CREATE POLICY "lider_manage_ciclos_avaliacao" ON public.ciclos_avaliacao
FOR ALL TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

DROP POLICY IF EXISTS "Team members can manage empresas_faturamento" ON public.empresas_faturamento;
CREATE POLICY "lider_manage_empresas_faturamento" ON public.empresas_faturamento
FOR ALL TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

DROP POLICY IF EXISTS "Admin and lider can manage area lideres" ON public.estrutura_area_lideres;
CREATE POLICY "lider_manage_area_lideres" ON public.estrutura_area_lideres
FOR ALL TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

DROP POLICY IF EXISTS "Admin and lider can manage areas" ON public.estrutura_areas;
CREATE POLICY "lider_manage_areas" ON public.estrutura_areas
FOR ALL TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

DROP POLICY IF EXISTS "Admin and lider can manage clusters" ON public.estrutura_clusters;
CREATE POLICY "lider_manage_clusters" ON public.estrutura_clusters
FOR ALL TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

DROP POLICY IF EXISTS "Admin and lider can manage equipe membros" ON public.estrutura_equipe_membros;
CREATE POLICY "lider_manage_equipe_membros" ON public.estrutura_equipe_membros
FOR ALL TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

DROP POLICY IF EXISTS "Admin and lider can manage equipes" ON public.estrutura_equipes;
CREATE POLICY "lider_manage_equipes" ON public.estrutura_equipes
FOR ALL TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

DROP POLICY IF EXISTS "Admin e lider acessam feedbacks" ON public.feedbacks;
CREATE POLICY "lider_manage_feedbacks" ON public.feedbacks
FOR ALL TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

DROP POLICY IF EXISTS "Admin e lider acessam itens de acao" ON public.itens_acao_1a1;
CREATE POLICY "lider_manage_itens_acao_1a1" ON public.itens_acao_1a1
FOR ALL TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

DROP POLICY IF EXISTS "Admin e lider acessam kpis" ON public.kpis_meta;
CREATE POLICY "lider_manage_kpis_meta" ON public.kpis_meta
FOR ALL TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

DROP POLICY IF EXISTS "Admin e lider acessam metas" ON public.metas;
CREATE POLICY "lider_manage_metas" ON public.metas
FOR ALL TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

DROP POLICY IF EXISTS "Admin e lider acessam reunioes 1a1" ON public.reunioes_1a1;
CREATE POLICY "lider_manage_reunioes_1a1" ON public.reunioes_1a1
FOR ALL TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- ── admin/lider/sublider/team_member → has_role_or_higher('team_member') ──
DROP POLICY IF EXISTS "Internal roles can view clientes" ON public.cliente;
CREATE POLICY "team_select_cliente" ON public.cliente
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "Internal roles can view contribuintes" ON public.contribuinte;
CREATE POLICY "team_select_contribuinte" ON public.contribuinte
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "Internal roles can view dcomp" ON public.dcomp;
CREATE POLICY "team_select_dcomp" ON public.dcomp
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "Internal roles can select distribuicao_receita" ON public.distribuicao_receita;
CREATE POLICY "team_select_distribuicao_receita" ON public.distribuicao_receita
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "Team members can manage efd_correcoes" ON public.efd_correcoes;
CREATE POLICY "team_manage_efd_correcoes" ON public.efd_correcoes
FOR ALL TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "Internal roles can read empresas_faturamento" ON public.empresas_faturamento;
CREATE POLICY "team_select_empresas_faturamento" ON public.empresas_faturamento
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "Team and admin can select inscricoes" ON public.inscricao_contribuinte;
CREATE POLICY "team_select_inscricao_contribuinte" ON public.inscricao_contribuinte
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "Internal roles can view ordem_servico" ON public.ordem_servico;
CREATE POLICY "team_select_ordem_servico" ON public.ordem_servico
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "Team can view org_project_members" ON public.org_project_members;
CREATE POLICY "team_select_org_project_members" ON public.org_project_members
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "Team can view os_produtos" ON public.os_produtos_contratados;
CREATE POLICY "team_select_os_produtos" ON public.os_produtos_contratados
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "Internal roles can view per" ON public.per;
CREATE POLICY "team_select_per" ON public.per
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "Internal roles can view per_situacao" ON public.per_situacao;
CREATE POLICY "team_select_per_situacao" ON public.per_situacao
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "Team members can read pis_cofins_class" ON public.pis_cofins_class;
CREATE POLICY "team_select_pis_cofins_class" ON public.pis_cofins_class
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "Team members can read pis_cofins_regra" ON public.pis_cofins_regra;
CREATE POLICY "team_select_pis_cofins_regra" ON public.pis_cofins_regra
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "Team members can manage produto_segmento" ON public.produto_segmento;
CREATE POLICY "team_manage_produto_segmento" ON public.produto_segmento
FOR ALL TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "Team can select project_servicos" ON public.project_servicos;
CREATE POLICY "team_select_project_servicos" ON public.project_servicos
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "Team can view representante" ON public.representante;
CREATE POLICY "team_select_representante" ON public.representante
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "Team members can manage client documents" ON public.client_documents;
CREATE POLICY "team_manage_client_documents" ON public.client_documents
FOR ALL TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "Team members can manage project assignments" ON public.client_visible_projects;
CREATE POLICY "team_manage_client_visible_projects" ON public.client_visible_projects
FOR ALL TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- ── admin/lider/sublider → has_role_or_higher('sublider') ──────
DROP POLICY IF EXISTS "Leaders can manage os_produtos" ON public.os_produtos_contratados;
CREATE POLICY "sublider_manage_os_produtos" ON public.os_produtos_contratados
FOR ALL TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

-- ── procedimentos: preservar filtro condicional do team_member ──
DROP POLICY IF EXISTS "select_procedimentos_member" ON public.procedimentos;
CREATE POLICY "select_procedimentos_member" ON public.procedimentos
FOR SELECT TO authenticated
USING (
  public.has_role_or_higher(auth.uid(), 'sublider'::app_role)
  OR (
    public.has_role(auth.uid(), 'team_member'::app_role)
    AND status_publicacao = 'ativo'::text
    AND status_geracao = 'gerado'::text
    AND confirmado_por IS NOT NULL
  )
);
