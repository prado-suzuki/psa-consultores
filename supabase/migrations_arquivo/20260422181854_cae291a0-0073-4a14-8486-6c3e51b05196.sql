-- =====================================================================
-- REORGANIZACAO RLS v2 — todos os 5 lotes em uma migration
-- Padroniza INSERT/UPDATE/DELETE em 55 tabelas com 7 padroes canonicos
-- baseados em has_role_or_higher (hierarquia linear).
-- =====================================================================

-- ===================== LOTE 1: TEAM_OPERATIONAL =====================

-- contribuinte_bal_config
DROP POLICY IF EXISTS "Team members can insert contribuinte_bal_config" ON public.contribuinte_bal_config;
DROP POLICY IF EXISTS "Team members can update contribuinte_bal_config" ON public.contribuinte_bal_config;
ALTER TABLE public.contribuinte_bal_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_contribuinte_bal_config_insert" ON public.contribuinte_bal_config
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_contribuinte_bal_config_update" ON public.contribuinte_bal_config
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_contribuinte_bal_config_delete" ON public.contribuinte_bal_config
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- dcomp
DROP POLICY IF EXISTS "Internal roles can delete dcomp" ON public.dcomp;
DROP POLICY IF EXISTS "Internal roles can create dcomp" ON public.dcomp;
DROP POLICY IF EXISTS "Internal roles can update dcomp" ON public.dcomp;
ALTER TABLE public.dcomp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_dcomp_insert" ON public.dcomp
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_dcomp_update" ON public.dcomp
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_dcomp_delete" ON public.dcomp
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- deliverable_attachments
DROP POLICY IF EXISTS "Team members can delete deliverable attachments" ON public.deliverable_attachments;
DROP POLICY IF EXISTS "Team members can upload deliverable attachments" ON public.deliverable_attachments;
ALTER TABLE public.deliverable_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_deliverable_attachments_insert" ON public.deliverable_attachments
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_deliverable_attachments_update" ON public.deliverable_attachments
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_deliverable_attachments_delete" ON public.deliverable_attachments
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- demand_items
DROP POLICY IF EXISTS "Admins can delete demand items" ON public.demand_items;
DROP POLICY IF EXISTS "Team members can create demand items" ON public.demand_items;
DROP POLICY IF EXISTS "Team members can update demand items" ON public.demand_items;
ALTER TABLE public.demand_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_demand_items_insert" ON public.demand_items
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_demand_items_update" ON public.demand_items
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_demand_items_delete" ON public.demand_items
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- difal_decisao
DROP POLICY IF EXISTS "Admins can delete difal_decisao" ON public.difal_decisao;
DROP POLICY IF EXISTS "Team members can create difal_decisao" ON public.difal_decisao;
DROP POLICY IF EXISTS "Team members can update difal_decisao" ON public.difal_decisao;
ALTER TABLE public.difal_decisao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_difal_decisao_insert" ON public.difal_decisao
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_difal_decisao_update" ON public.difal_decisao
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_difal_decisao_delete" ON public.difal_decisao
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- difal_sessao
DROP POLICY IF EXISTS "Admins can delete difal_sessao" ON public.difal_sessao;
DROP POLICY IF EXISTS "Team members can create difal_sessao" ON public.difal_sessao;
DROP POLICY IF EXISTS "Team members can update difal_sessao" ON public.difal_sessao;
ALTER TABLE public.difal_sessao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_difal_sessao_insert" ON public.difal_sessao
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_difal_sessao_update" ON public.difal_sessao
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_difal_sessao_delete" ON public.difal_sessao
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- documents
DROP POLICY IF EXISTS "Admins can view all documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can upload documents" ON public.documents;
DROP POLICY IF EXISTS "Users can upload documents" ON public.documents;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_documents_insert" ON public.documents
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_documents_update" ON public.documents
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_documents_delete" ON public.documents
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- fiscal_task_comments
DROP POLICY IF EXISTS "Team members can create fiscal task comments" ON public.fiscal_task_comments;
ALTER TABLE public.fiscal_task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_fiscal_task_comments_insert" ON public.fiscal_task_comments
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_fiscal_task_comments_update" ON public.fiscal_task_comments
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_fiscal_task_comments_delete" ON public.fiscal_task_comments
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- improvement_savings_details
DROP POLICY IF EXISTS "Team members can delete savings details" ON public.improvement_savings_details;
DROP POLICY IF EXISTS "Team members can create savings details" ON public.improvement_savings_details;
DROP POLICY IF EXISTS "Team members can update savings details" ON public.improvement_savings_details;
ALTER TABLE public.improvement_savings_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_improvement_savings_details_insert" ON public.improvement_savings_details
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_improvement_savings_details_update" ON public.improvement_savings_details
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_improvement_savings_details_delete" ON public.improvement_savings_details
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- org_project_members
DROP POLICY IF EXISTS "Admins can manage org_project_members" ON public.org_project_members;
DROP POLICY IF EXISTS "Team can delete org_project_members" ON public.org_project_members;
DROP POLICY IF EXISTS "Team can insert org_project_members" ON public.org_project_members;
DROP POLICY IF EXISTS "Team can update org_project_members" ON public.org_project_members;
ALTER TABLE public.org_project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_org_project_members_insert" ON public.org_project_members
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_org_project_members_update" ON public.org_project_members
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_org_project_members_delete" ON public.org_project_members
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- per
DROP POLICY IF EXISTS "Internal roles can delete per" ON public.per;
DROP POLICY IF EXISTS "Internal roles can create per" ON public.per;
DROP POLICY IF EXISTS "Internal roles can update per" ON public.per;
ALTER TABLE public.per ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_per_insert" ON public.per
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_per_update" ON public.per
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_per_delete" ON public.per
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- per_situacao
DROP POLICY IF EXISTS "Internal roles can delete per_situacao" ON public.per_situacao;
DROP POLICY IF EXISTS "Internal roles can create per_situacao" ON public.per_situacao;
DROP POLICY IF EXISTS "Internal roles can update per_situacao" ON public.per_situacao;
ALTER TABLE public.per_situacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_per_situacao_insert" ON public.per_situacao
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_per_situacao_update" ON public.per_situacao
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_per_situacao_delete" ON public.per_situacao
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- pis_cofins_class
DROP POLICY IF EXISTS "Team members can insert pis_cofins_class" ON public.pis_cofins_class;
DROP POLICY IF EXISTS "Team members can update pis_cofins_class" ON public.pis_cofins_class;
ALTER TABLE public.pis_cofins_class ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_pis_cofins_class_insert" ON public.pis_cofins_class
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_pis_cofins_class_update" ON public.pis_cofins_class
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_pis_cofins_class_delete" ON public.pis_cofins_class
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- pis_cofins_regra
DROP POLICY IF EXISTS "Team members can insert pis_cofins_regra" ON public.pis_cofins_regra;
DROP POLICY IF EXISTS "Team members can update pis_cofins_regra" ON public.pis_cofins_regra;
ALTER TABLE public.pis_cofins_regra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_pis_cofins_regra_insert" ON public.pis_cofins_regra
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_pis_cofins_regra_update" ON public.pis_cofins_regra
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_pis_cofins_regra_delete" ON public.pis_cofins_regra
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- procedimentos
DROP POLICY IF EXISTS "delete_procedimentos" ON public.procedimentos;
DROP POLICY IF EXISTS "insert_procedimentos" ON public.procedimentos;
DROP POLICY IF EXISTS "update_procedimentos" ON public.procedimentos;
ALTER TABLE public.procedimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_procedimentos_insert" ON public.procedimentos
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_procedimentos_update" ON public.procedimentos
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_procedimentos_delete" ON public.procedimentos
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- process_stages
DROP POLICY IF EXISTS "Team members can delete process stages" ON public.process_stages;
DROP POLICY IF EXISTS "Team members can create process stages" ON public.process_stages;
DROP POLICY IF EXISTS "Team members can update process stages" ON public.process_stages;
ALTER TABLE public.process_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_process_stages_insert" ON public.process_stages
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_process_stages_update" ON public.process_stages
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_process_stages_delete" ON public.process_stages
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- processes
DROP POLICY IF EXISTS "Team members can delete processes" ON public.processes;
DROP POLICY IF EXISTS "Team members can create processes" ON public.processes;
DROP POLICY IF EXISTS "Team members can update processes" ON public.processes;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_processes_insert" ON public.processes
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_processes_update" ON public.processes
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_processes_delete" ON public.processes
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- project_documents
DROP POLICY IF EXISTS "Admins can delete project documents" ON public.project_documents;
DROP POLICY IF EXISTS "Team members can create project documents" ON public.project_documents;
DROP POLICY IF EXISTS "Team members can update project documents" ON public.project_documents;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_project_documents_insert" ON public.project_documents
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_project_documents_update" ON public.project_documents
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_project_documents_delete" ON public.project_documents
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- project_processes
DROP POLICY IF EXISTS "Team members can delete project processes" ON public.project_processes;
DROP POLICY IF EXISTS "Team members can create project processes" ON public.project_processes;
DROP POLICY IF EXISTS "Team members can update project processes" ON public.project_processes;
ALTER TABLE public.project_processes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_project_processes_insert" ON public.project_processes
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_project_processes_update" ON public.project_processes
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_project_processes_delete" ON public.project_processes
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- project_servicos
DROP POLICY IF EXISTS "Team can delete project_servicos" ON public.project_servicos;
DROP POLICY IF EXISTS "Team can insert project_servicos" ON public.project_servicos;
DROP POLICY IF EXISTS "Team can update project_servicos" ON public.project_servicos;
ALTER TABLE public.project_servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_project_servicos_insert" ON public.project_servicos
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_project_servicos_update" ON public.project_servicos
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_project_servicos_delete" ON public.project_servicos
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- project_work_packages
DROP POLICY IF EXISTS "Team members can delete work packages" ON public.project_work_packages;
DROP POLICY IF EXISTS "Team members can create work packages" ON public.project_work_packages;
DROP POLICY IF EXISTS "Team members can update work packages" ON public.project_work_packages;
ALTER TABLE public.project_work_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_project_work_packages_insert" ON public.project_work_packages
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_project_work_packages_update" ON public.project_work_packages
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_project_work_packages_delete" ON public.project_work_packages
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- projects
DROP POLICY IF EXISTS "Team members can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Team members can create projects" ON public.projects;
DROP POLICY IF EXISTS "Team members can update projects" ON public.projects;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_projects_insert" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_projects_update" ON public.projects
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_projects_delete" ON public.projects
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- routines
DROP POLICY IF EXISTS "Admins can delete routines" ON public.routines;
DROP POLICY IF EXISTS "Team members can create routines" ON public.routines;
DROP POLICY IF EXISTS "Team members can update routines" ON public.routines;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_routines_insert" ON public.routines
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_routines_update" ON public.routines
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_routines_delete" ON public.routines
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- sprint_backlog_items
DROP POLICY IF EXISTS "Admins can delete backlog items" ON public.sprint_backlog_items;
DROP POLICY IF EXISTS "Team members can create backlog items" ON public.sprint_backlog_items;
DROP POLICY IF EXISTS "Team members can update backlog items" ON public.sprint_backlog_items;
ALTER TABLE public.sprint_backlog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_sprint_backlog_items_insert" ON public.sprint_backlog_items
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_sprint_backlog_items_update" ON public.sprint_backlog_items
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_sprint_backlog_items_delete" ON public.sprint_backlog_items
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- sprint_deliverables
DROP POLICY IF EXISTS "Admins can delete deliverables" ON public.sprint_deliverables;
DROP POLICY IF EXISTS "Team members can create deliverables" ON public.sprint_deliverables;
DROP POLICY IF EXISTS "Team members can update deliverables" ON public.sprint_deliverables;
ALTER TABLE public.sprint_deliverables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_sprint_deliverables_insert" ON public.sprint_deliverables
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_sprint_deliverables_update" ON public.sprint_deliverables
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_sprint_deliverables_delete" ON public.sprint_deliverables
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- sprint_events
DROP POLICY IF EXISTS "Admins can delete events" ON public.sprint_events;
DROP POLICY IF EXISTS "Team members can create events" ON public.sprint_events;
DROP POLICY IF EXISTS "Team members can update events" ON public.sprint_events;
ALTER TABLE public.sprint_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_sprint_events_insert" ON public.sprint_events
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_sprint_events_update" ON public.sprint_events
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_sprint_events_delete" ON public.sprint_events
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- sprint_metrics
DROP POLICY IF EXISTS "Admins can delete metrics" ON public.sprint_metrics;
DROP POLICY IF EXISTS "Team members can create metrics" ON public.sprint_metrics;
DROP POLICY IF EXISTS "Team members can update metrics" ON public.sprint_metrics;
ALTER TABLE public.sprint_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_sprint_metrics_insert" ON public.sprint_metrics
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_sprint_metrics_update" ON public.sprint_metrics
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_sprint_metrics_delete" ON public.sprint_metrics
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- sprints
DROP POLICY IF EXISTS "Team members can delete sprints" ON public.sprints;
DROP POLICY IF EXISTS "Team members can create sprints" ON public.sprints;
DROP POLICY IF EXISTS "Team members can update sprints" ON public.sprints;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_sprints_insert" ON public.sprints
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_sprints_update" ON public.sprints
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_sprints_delete" ON public.sprints
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- tasks
DROP POLICY IF EXISTS "Team members can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members can update tasks" ON public.tasks;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_tasks_insert" ON public.tasks
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_tasks_update" ON public.tasks
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_tasks_delete" ON public.tasks
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- tools
DROP POLICY IF EXISTS "Admins can delete tools" ON public.tools;
DROP POLICY IF EXISTS "Team members can create tools" ON public.tools;
DROP POLICY IF EXISTS "Team members can update tools" ON public.tools;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_tools_insert" ON public.tools
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_tools_update" ON public.tools
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_tools_delete" ON public.tools
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- work_package_activities
DROP POLICY IF EXISTS "Team members can create activities" ON public.work_package_activities;
ALTER TABLE public.work_package_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_work_package_activities_insert" ON public.work_package_activities
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_work_package_activities_update" ON public.work_package_activities
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_work_package_activities_delete" ON public.work_package_activities
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- ===================== LOTE 2: LEADER_WRITE + ADMIN_ONLY =====================

-- cliente
DROP POLICY IF EXISTS "Admins can delete clientes" ON public.cliente;
DROP POLICY IF EXISTS "Leaders can create clientes" ON public.cliente;
DROP POLICY IF EXISTS "Leaders can update clientes" ON public.cliente;
ALTER TABLE public.cliente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_cliente_insert" ON public.cliente
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));
CREATE POLICY "rls_cliente_update" ON public.cliente
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));
CREATE POLICY "rls_cliente_delete" ON public.cliente
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

-- contribuinte
DROP POLICY IF EXISTS "Admins can delete contribuintes" ON public.contribuinte;
DROP POLICY IF EXISTS "Leaders can create contribuintes" ON public.contribuinte;
DROP POLICY IF EXISTS "Leaders can update contribuintes" ON public.contribuinte;
ALTER TABLE public.contribuinte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_contribuinte_insert" ON public.contribuinte
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));
CREATE POLICY "rls_contribuinte_update" ON public.contribuinte
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));
CREATE POLICY "rls_contribuinte_delete" ON public.contribuinte
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

-- distribuicao_receita
DROP POLICY IF EXISTS "Leaders can delete distribuicao_receita" ON public.distribuicao_receita;
DROP POLICY IF EXISTS "Leaders can insert distribuicao_receita" ON public.distribuicao_receita;
DROP POLICY IF EXISTS "Leaders can update distribuicao_receita" ON public.distribuicao_receita;
ALTER TABLE public.distribuicao_receita ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_distribuicao_receita_insert" ON public.distribuicao_receita
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));
CREATE POLICY "rls_distribuicao_receita_update" ON public.distribuicao_receita
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));
CREATE POLICY "rls_distribuicao_receita_delete" ON public.distribuicao_receita
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

-- inscricao_contribuinte
DROP POLICY IF EXISTS "Team and admin can delete inscricoes" ON public.inscricao_contribuinte;
DROP POLICY IF EXISTS "Team and admin can insert inscricoes" ON public.inscricao_contribuinte;
DROP POLICY IF EXISTS "Team and admin can update inscricoes" ON public.inscricao_contribuinte;
ALTER TABLE public.inscricao_contribuinte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_inscricao_contribuinte_insert" ON public.inscricao_contribuinte
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));
CREATE POLICY "rls_inscricao_contribuinte_update" ON public.inscricao_contribuinte
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));
CREATE POLICY "rls_inscricao_contribuinte_delete" ON public.inscricao_contribuinte
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

-- ordem_servico
DROP POLICY IF EXISTS "Admins can delete ordem_servico" ON public.ordem_servico;
DROP POLICY IF EXISTS "Leaders can create ordem_servico" ON public.ordem_servico;
DROP POLICY IF EXISTS "Leaders can update ordem_servico" ON public.ordem_servico;
ALTER TABLE public.ordem_servico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_ordem_servico_insert" ON public.ordem_servico
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));
CREATE POLICY "rls_ordem_servico_update" ON public.ordem_servico
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));
CREATE POLICY "rls_ordem_servico_delete" ON public.ordem_servico
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

-- representante
DROP POLICY IF EXISTS "Leaders can delete representante" ON public.representante;
DROP POLICY IF EXISTS "Team can insert representante" ON public.representante;
DROP POLICY IF EXISTS "Team can update representante" ON public.representante;
ALTER TABLE public.representante ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_representante_insert" ON public.representante
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));
CREATE POLICY "rls_representante_update" ON public.representante
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));
CREATE POLICY "rls_representante_delete" ON public.representante
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

-- setor_cliente
DROP POLICY IF EXISTS "Admin can delete setor_cliente" ON public.setor_cliente;
DROP POLICY IF EXISTS "Admin can insert setor_cliente" ON public.setor_cliente;
DROP POLICY IF EXISTS "Admin can update setor_cliente" ON public.setor_cliente;
ALTER TABLE public.setor_cliente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_setor_cliente_insert" ON public.setor_cliente
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));
CREATE POLICY "rls_setor_cliente_update" ON public.setor_cliente
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));
CREATE POLICY "rls_setor_cliente_delete" ON public.setor_cliente
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

-- catalog_clients (ADMIN_ONLY)
DROP POLICY IF EXISTS "Admins can delete catalog_clients" ON public.catalog_clients;
DROP POLICY IF EXISTS "Admins can create catalog_clients" ON public.catalog_clients;
DROP POLICY IF EXISTS "Admins can update catalog_clients" ON public.catalog_clients;
ALTER TABLE public.catalog_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_catalog_clients_insert" ON public.catalog_clients
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'admin'::app_role));
CREATE POLICY "rls_catalog_clients_update" ON public.catalog_clients
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'admin'::app_role));
CREATE POLICY "rls_catalog_clients_delete" ON public.catalog_clients
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'admin'::app_role));

-- novidades (ADMIN_ONLY)
DROP POLICY IF EXISTS "Novidades ativas sao publicas" ON public.novidades;
DROP POLICY IF EXISTS "Admins podem deletar novidades" ON public.novidades;
DROP POLICY IF EXISTS "Admins podem criar novidades" ON public.novidades;
DROP POLICY IF EXISTS "Admins podem atualizar novidades" ON public.novidades;
ALTER TABLE public.novidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_novidades_insert" ON public.novidades
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'admin'::app_role));
CREATE POLICY "rls_novidades_update" ON public.novidades
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'admin'::app_role));
CREATE POLICY "rls_novidades_delete" ON public.novidades
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'admin'::app_role));

-- tool_area_access (ADMIN_ONLY)
DROP POLICY IF EXISTS "Admins can delete tool access" ON public.tool_area_access;
DROP POLICY IF EXISTS "Admins can manage tool access" ON public.tool_area_access;
DROP POLICY IF EXISTS "Admins can update tool access" ON public.tool_area_access;
ALTER TABLE public.tool_area_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_tool_area_access_insert" ON public.tool_area_access
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'admin'::app_role));
CREATE POLICY "rls_tool_area_access_update" ON public.tool_area_access
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'admin'::app_role));
CREATE POLICY "rls_tool_area_access_delete" ON public.tool_area_access
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'admin'::app_role));

-- user_roles (ADMIN_ONLY)
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_user_roles_insert" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'admin'::app_role));
CREATE POLICY "rls_user_roles_update" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'admin'::app_role));
CREATE POLICY "rls_user_roles_delete" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'admin'::app_role));

-- ===================== LOTE 3: OWNER_WITH_TEAM + PROJECT_MEMBER_SCOPED =====================

-- comentarios_avaliacao
DROP POLICY IF EXISTS "Autenticados inserem comentarios" ON public.comentarios_avaliacao;
DROP POLICY IF EXISTS "Autor edita proprio comentario" ON public.comentarios_avaliacao;
ALTER TABLE public.comentarios_avaliacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_comentarios_avaliacao_insert" ON public.comentarios_avaliacao
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) AND auth.uid() = autor_id);
CREATE POLICY "rls_comentarios_avaliacao_update" ON public.comentarios_avaliacao
  FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) AND auth.uid() = autor_id)
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) AND auth.uid() = autor_id);
CREATE POLICY "rls_comentarios_avaliacao_delete" ON public.comentarios_avaliacao
  FOR DELETE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) AND auth.uid() = autor_id);

-- daily_standups
DROP POLICY IF EXISTS "Team members can delete their standups" ON public.daily_standups;
DROP POLICY IF EXISTS "Team members can create their standups" ON public.daily_standups;
DROP POLICY IF EXISTS "Team members can update their standups" ON public.daily_standups;
ALTER TABLE public.daily_standups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_daily_standups_insert" ON public.daily_standups
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) AND auth.uid() = user_id);
CREATE POLICY "rls_daily_standups_update" ON public.daily_standups
  FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) AND auth.uid() = user_id)
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) AND auth.uid() = user_id);
CREATE POLICY "rls_daily_standups_delete" ON public.daily_standups
  FOR DELETE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) AND auth.uid() = user_id);

-- export_profiles
DROP POLICY IF EXISTS "Users can delete own export profiles" ON public.export_profiles;
DROP POLICY IF EXISTS "Users can create own export profiles" ON public.export_profiles;
DROP POLICY IF EXISTS "Users can update own export profiles" ON public.export_profiles;
ALTER TABLE public.export_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_export_profiles_insert" ON public.export_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) AND auth.uid() = user_id);
CREATE POLICY "rls_export_profiles_update" ON public.export_profiles
  FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) AND auth.uid() = user_id)
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) AND auth.uid() = user_id);
CREATE POLICY "rls_export_profiles_delete" ON public.export_profiles
  FOR DELETE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) AND auth.uid() = user_id);

-- task_comments
DROP POLICY IF EXISTS "Team members can create comments" ON public.task_comments;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_task_comments_insert" ON public.task_comments
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) AND auth.uid() = user_id);
CREATE POLICY "rls_task_comments_update" ON public.task_comments
  FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) AND auth.uid() = user_id)
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) AND auth.uid() = user_id);
CREATE POLICY "rls_task_comments_delete" ON public.task_comments
  FOR DELETE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) AND auth.uid() = user_id);

-- fiscal_tasks
DROP POLICY IF EXISTS "Admins can view all fiscal_tasks" ON public.fiscal_tasks;
DROP POLICY IF EXISTS "Leaders can view all fiscal_tasks" ON public.fiscal_tasks;
DROP POLICY IF EXISTS "Leaders can view area fiscal_tasks" ON public.fiscal_tasks;
DROP POLICY IF EXISTS "Members can view their fiscal_tasks" ON public.fiscal_tasks;
DROP POLICY IF EXISTS "Admin lider or creator can delete fiscal_tasks" ON public.fiscal_tasks;
DROP POLICY IF EXISTS "Team members can create fiscal tasks" ON public.fiscal_tasks;
DROP POLICY IF EXISTS "Members can update their project fiscal_tasks" ON public.fiscal_tasks;
ALTER TABLE public.fiscal_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_fiscal_tasks_insert" ON public.fiscal_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'sublider'::app_role)
    OR (
      public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
      AND (project_id IS NULL OR public.is_project_member(auth.uid(), project_id))
    )
  );
CREATE POLICY "rls_fiscal_tasks_update" ON public.fiscal_tasks
  FOR UPDATE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'sublider'::app_role)
    OR (
      public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
      AND (project_id IS NULL OR public.is_project_member(auth.uid(), project_id))
    )
  )
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'sublider'::app_role)
    OR (
      public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
      AND (project_id IS NULL OR public.is_project_member(auth.uid(), project_id))
    )
  );
CREATE POLICY "rls_fiscal_tasks_delete" ON public.fiscal_tasks
  FOR DELETE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role) OR created_by = auth.uid());

-- org_projects
DROP POLICY IF EXISTS "Admins can view all org_projects" ON public.org_projects;
DROP POLICY IF EXISTS "Creators can view own org_projects" ON public.org_projects;
DROP POLICY IF EXISTS "Leaders can view all org_projects" ON public.org_projects;
DROP POLICY IF EXISTS "Leaders can view area org_projects" ON public.org_projects;
DROP POLICY IF EXISTS "Members can view their org_projects" ON public.org_projects;
DROP POLICY IF EXISTS "Admin lider or creator can delete org_projects" ON public.org_projects;
DROP POLICY IF EXISTS "Team can create org_projects" ON public.org_projects;
DROP POLICY IF EXISTS "Members can update their org_projects" ON public.org_projects;
ALTER TABLE public.org_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_org_projects_insert" ON public.org_projects
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));
CREATE POLICY "rls_org_projects_update" ON public.org_projects
  FOR UPDATE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'sublider'::app_role)
    OR (
      public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
      AND public.is_project_member(auth.uid(), id)
    )
  )
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'sublider'::app_role)
    OR (
      public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
      AND public.is_project_member(auth.uid(), id)
    )
  );
CREATE POLICY "rls_org_projects_delete" ON public.org_projects
  FOR DELETE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role) OR created_by = auth.uid());

-- ===================== LOTE 4: AUDIT_APPEND_ONLY + SELF_PROFILE + PUBLIC_SUBMIT =====================

-- access_change_log (append-only)
DROP POLICY IF EXISTS "Admins podem inserir no histórico" ON public.access_change_log;
ALTER TABLE public.access_change_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_access_change_log_insert" ON public.access_change_log
  FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid() AND public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- audit_logs (append-only)
DROP POLICY IF EXISTS "Admins full access audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Members can insert audit_logs" ON public.audit_logs;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_audit_logs_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (performed_by = auth.uid() AND public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- profiles (SELF_PROFILE)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- contatos (PUBLIC_SUBMIT)
DROP POLICY IF EXISTS "Equipe pode ver contatos" ON public.contatos;
DROP POLICY IF EXISTS "Team members and admins can view contatos" ON public.contatos;
DROP POLICY IF EXISTS "Admin pode deletar contatos" ON public.contatos;
DROP POLICY IF EXISTS "Qualquer pessoa pode enviar contato" ON public.contatos;
DROP POLICY IF EXISTS "Equipe pode atualizar contatos" ON public.contatos;
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_contatos_insert" ON public.contatos
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "rls_contatos_update" ON public.contatos
  FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "rls_contatos_delete" ON public.contatos
  FOR DELETE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'admin'::app_role));

-- ===================== LOTE 5: TICKETS_SPECIAL =====================

-- tickets
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Team members can view assigned tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "lider_select_tickets" ON public.tickets;
DROP POLICY IF EXISTS "sublider_select_tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can delete any ticket" ON public.tickets;
DROP POLICY IF EXISTS "lider_delete_tickets" ON public.tickets;
DROP POLICY IF EXISTS "sublider_delete_tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can create their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "lider_insert_tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can update all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Team members can update assigned tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can update their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "lider_update_tickets" ON public.tickets;
DROP POLICY IF EXISTS "sublider_update_tickets" ON public.tickets;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_tickets_insert" ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    (auth.uid() = user_id AND public.has_role(auth.uid(), 'client'::app_role))
    OR public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
  );
CREATE POLICY "rls_tickets_update" ON public.tickets
  FOR UPDATE TO authenticated
  USING (
    (auth.uid() = user_id AND public.has_role(auth.uid(), 'client'::app_role))
    OR public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
  )
  WITH CHECK (
    (auth.uid() = user_id AND public.has_role(auth.uid(), 'client'::app_role))
    OR public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
  );
CREATE POLICY "rls_tickets_delete" ON public.tickets
  FOR DELETE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'admin'::app_role));

-- ticket_messages
DROP POLICY IF EXISTS "Admins can view all messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Users can view messages from their tickets" ON public.ticket_messages;
DROP POLICY IF EXISTS "lider_select_ticket_messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "sublider_select_ticket_messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "team_member_select_ticket_messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Admins can delete any message" ON public.ticket_messages;
DROP POLICY IF EXISTS "lider_delete_ticket_messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Admins can create messages on any ticket" ON public.ticket_messages;
DROP POLICY IF EXISTS "Users can create messages on their tickets" ON public.ticket_messages;
DROP POLICY IF EXISTS "lider_insert_ticket_messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "sublider_insert_ticket_messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "team_member_insert_ticket_messages" ON public.ticket_messages;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_ticket_messages_insert" ON public.ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
      OR EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    )
  );
CREATE POLICY "rls_ticket_messages_update" ON public.ticket_messages
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "rls_ticket_messages_delete" ON public.ticket_messages
  FOR DELETE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'admin'::app_role));

-- ticket_attachments
DROP POLICY IF EXISTS "Admins can view all attachments" ON public.ticket_attachments;
DROP POLICY IF EXISTS "Users can view their ticket attachments" ON public.ticket_attachments;
DROP POLICY IF EXISTS "lider_select_ticket_attachments" ON public.ticket_attachments;
DROP POLICY IF EXISTS "sublider_select_ticket_attachments" ON public.ticket_attachments;
DROP POLICY IF EXISTS "team_member_select_ticket_attachments" ON public.ticket_attachments;
DROP POLICY IF EXISTS "Admins can delete any attachment" ON public.ticket_attachments;
DROP POLICY IF EXISTS "lider_delete_ticket_attachments" ON public.ticket_attachments;
DROP POLICY IF EXISTS "Admins can upload attachments" ON public.ticket_attachments;
DROP POLICY IF EXISTS "Users can upload to their tickets" ON public.ticket_attachments;
DROP POLICY IF EXISTS "team_member_insert_ticket_attachments" ON public.ticket_attachments;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_ticket_attachments_insert" ON public.ticket_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
      OR EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    )
  );
CREATE POLICY "rls_ticket_attachments_delete" ON public.ticket_attachments
  FOR DELETE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'admin'::app_role));