
-- ── Chamados ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "rls_tickets_select" ON public.tickets;
CREATE POLICY "rls_tickets_select" ON public.tickets
FOR SELECT TO authenticated
USING (
  public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
  OR auth.uid() = user_id
  OR public.is_ticket_assigned_to(id, auth.uid())
);

DROP POLICY IF EXISTS "rls_ticket_messages_select" ON public.ticket_messages;
CREATE POLICY "rls_ticket_messages_select" ON public.ticket_messages
FOR SELECT TO authenticated
USING (
  public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_messages.ticket_id
      AND (t.user_id = auth.uid() OR public.is_ticket_assigned_to(t.id, auth.uid()))
  )
);

DROP POLICY IF EXISTS "rls_ticket_attachments_select" ON public.ticket_attachments;
CREATE POLICY "rls_ticket_attachments_select" ON public.ticket_attachments
FOR SELECT TO authenticated
USING (
  public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_attachments.ticket_id
      AND (t.user_id = auth.uid() OR public.is_ticket_assigned_to(t.id, auth.uid()))
  )
);

-- ── Projetos / Tarefas ──────────────────────────────────────
DROP POLICY IF EXISTS "rls_org_projects_select" ON public.org_projects;
CREATE POLICY "rls_org_projects_select" ON public.org_projects
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "rls_fiscal_tasks_select" ON public.fiscal_tasks;
CREATE POLICY "rls_fiscal_tasks_select" ON public.fiscal_tasks
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- projects (tax): drop policies SELECT existentes e recriar única
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='projects' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', pol.policyname);
  END LOOP;
END $$;
CREATE POLICY "rls_projects_select" ON public.projects
FOR SELECT TO authenticated
USING (
  public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.client_visible_projects cvp
    WHERE cvp.project_id = projects.id AND cvp.user_id = auth.uid()
  )
);

-- ── Auditoria & Perfis ──────────────────────────────────────
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='audit_logs' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.audit_logs', pol.policyname);
  END LOOP;
END $$;
CREATE POLICY "rls_audit_logs_select" ON public.audit_logs
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "rls_profiles_select_internal" ON public.profiles;
CREATE POLICY "rls_profiles_select_internal" ON public.profiles
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- ── Board / Desempenho ──────────────────────────────────────
DROP POLICY IF EXISTS "rls_analises_semestrais_select" ON public.analises_semestrais;
CREATE POLICY "rls_analises_semestrais_select" ON public.analises_semestrais
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "rls_atualizacoes_meta_select" ON public.atualizacoes_meta;
CREATE POLICY "rls_atualizacoes_meta_select" ON public.atualizacoes_meta
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "rls_ciclos_avaliacao_select" ON public.ciclos_avaliacao;
CREATE POLICY "rls_ciclos_avaliacao_select" ON public.ciclos_avaliacao
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "rls_feedbacks_select" ON public.feedbacks;
CREATE POLICY "rls_feedbacks_select" ON public.feedbacks
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "rls_itens_acao_1a1_select" ON public.itens_acao_1a1;
CREATE POLICY "rls_itens_acao_1a1_select" ON public.itens_acao_1a1
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "rls_kpis_meta_select" ON public.kpis_meta;
CREATE POLICY "rls_kpis_meta_select" ON public.kpis_meta
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "rls_metas_select" ON public.metas;
CREATE POLICY "rls_metas_select" ON public.metas
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "rls_relatorios_gerados_select" ON public.relatorios_gerados;
CREATE POLICY "rls_relatorios_gerados_select" ON public.relatorios_gerados
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "rls_reunioes_1a1_select" ON public.reunioes_1a1;
CREATE POLICY "rls_reunioes_1a1_select" ON public.reunioes_1a1
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "rls_performance_preferencias_select" ON public.performance_preferencias;
CREATE POLICY "rls_performance_preferencias_select" ON public.performance_preferencias
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- ── Demais órfãs ────────────────────────────────────────────
DROP POLICY IF EXISTS "rls_contatos_select" ON public.contatos;
CREATE POLICY "rls_contatos_select" ON public.contatos
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

DROP POLICY IF EXISTS "rls_documents_select" ON public.documents;
CREATE POLICY "rls_documents_select" ON public.documents
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "rls_efd_correcoes_select" ON public.efd_correcoes;
CREATE POLICY "rls_efd_correcoes_select" ON public.efd_correcoes
FOR SELECT TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "rls_gestao_area_password_select" ON public.gestao_area_password;
CREATE POLICY "rls_gestao_area_password_select" ON public.gestao_area_password
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
