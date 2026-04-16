
-- Grupo A: 40 policies — trocar has_role(uid,'team_member') por has_role_or_higher(uid,'team_member'::app_role)

-- 1. catalog_clients
DROP POLICY IF EXISTS "Team members can view catalog_clients" ON public.catalog_clients;
CREATE POLICY "Team members can view catalog_clients" ON public.catalog_clients FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 2. cliente_clusters
DROP POLICY IF EXISTS "team_member_select_cliente_clusters" ON public.cliente_clusters;
CREATE POLICY "team_member_select_cliente_clusters" ON public.cliente_clusters FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 3. contatos — EXISTS variant
DROP POLICY IF EXISTS "Equipe pode ver contatos" ON public.contatos;
CREATE POLICY "Equipe pode ver contatos" ON public.contatos FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 4. contatos — OR variant
DROP POLICY IF EXISTS "Team members and admins can view contatos" ON public.contatos;
CREATE POLICY "Team members and admins can view contatos" ON public.contatos FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 5. contribuinte_bal_config
DROP POLICY IF EXISTS "Team members can read contribuinte_bal_config" ON public.contribuinte_bal_config;
CREATE POLICY "Team members can read contribuinte_bal_config" ON public.contribuinte_bal_config FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 6. daily_standups
DROP POLICY IF EXISTS "Team members can view standups" ON public.daily_standups;
CREATE POLICY "Team members can view standups" ON public.daily_standups FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 7. deliverable_attachments
DROP POLICY IF EXISTS "Team members can view deliverable attachments" ON public.deliverable_attachments;
CREATE POLICY "Team members can view deliverable attachments" ON public.deliverable_attachments FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 8. demand_items
DROP POLICY IF EXISTS "Team members can view demand items" ON public.demand_items;
CREATE POLICY "Team members can view demand items" ON public.demand_items FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 9. difal_decisao
DROP POLICY IF EXISTS "Team members can view difal_decisao" ON public.difal_decisao;
CREATE POLICY "Team members can view difal_decisao" ON public.difal_decisao FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 10. difal_sessao
DROP POLICY IF EXISTS "Team members can view difal_sessao" ON public.difal_sessao;
CREATE POLICY "Team members can view difal_sessao" ON public.difal_sessao FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 11. fiscal_task_comments
DROP POLICY IF EXISTS "Team members can view fiscal task comments" ON public.fiscal_task_comments;
CREATE POLICY "Team members can view fiscal task comments" ON public.fiscal_task_comments FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 12. fiscal_tasks (Members — preserva AND composto)
DROP POLICY IF EXISTS "Members can view their project fiscal_tasks" ON public.fiscal_tasks;
CREATE POLICY "Members can view their project fiscal_tasks" ON public.fiscal_tasks FOR SELECT TO authenticated
  USING (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    AND (
      (project_id IS NULL)
      OR is_project_member(auth.uid(), project_id)
      OR (EXISTS (
        SELECT 1 FROM org_projects tp
        WHERE tp.id = fiscal_tasks.project_id
          AND tp.estrutura_area_id IS NOT NULL
          AND is_area_member(auth.uid(), tp.estrutura_area_id)
      ))
    )
  );

-- 13. improvement_savings_details
DROP POLICY IF EXISTS "Team members can view savings details" ON public.improvement_savings_details;
CREATE POLICY "Team members can view savings details" ON public.improvement_savings_details FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 14. improvement_team_members
DROP POLICY IF EXISTS "Team members can view improvement members" ON public.improvement_team_members;
CREATE POLICY "Team members can view improvement members" ON public.improvement_team_members FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 15. job_roles
DROP POLICY IF EXISTS "Team members can view job roles" ON public.job_roles;
CREATE POLICY "Team members can view job roles" ON public.job_roles FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 16. process_stages
DROP POLICY IF EXISTS "Team members can view process stages" ON public.process_stages;
CREATE POLICY "Team members can view process stages" ON public.process_stages FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 17. processes
DROP POLICY IF EXISTS "Team members can view processes" ON public.processes;
CREATE POLICY "Team members can view processes" ON public.processes FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 18. project_documents
DROP POLICY IF EXISTS "Team members can view project documents" ON public.project_documents;
CREATE POLICY "Team members can view project documents" ON public.project_documents FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 19. project_processes
DROP POLICY IF EXISTS "Team members can view project processes" ON public.project_processes;
CREATE POLICY "Team members can view project processes" ON public.project_processes FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 20. project_work_packages
DROP POLICY IF EXISTS "Team members can view all work packages" ON public.project_work_packages;
CREATE POLICY "Team members can view all work packages" ON public.project_work_packages FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 21. projects — team member policy
DROP POLICY IF EXISTS "Team members can view projects" ON public.projects;
CREATE POLICY "Team members can view projects" ON public.projects FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 22. projects — client policy (preserva EXISTS de client_visible_projects)
DROP POLICY IF EXISTS "Clients can view projects assigned to them" ON public.projects;
CREATE POLICY "Clients can view projects assigned to them" ON public.projects FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM client_visible_projects cvp WHERE cvp.project_id = projects.id AND cvp.user_id = auth.uid()))
    OR has_role_or_higher(auth.uid(), 'team_member'::app_role)
  );

-- 23. routines
DROP POLICY IF EXISTS "Team members can view routines" ON public.routines;
CREATE POLICY "Team members can view routines" ON public.routines FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 24. sprint_backlog_items
DROP POLICY IF EXISTS "Team members can view backlog items" ON public.sprint_backlog_items;
CREATE POLICY "Team members can view backlog items" ON public.sprint_backlog_items FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 25. sprint_deliverables
DROP POLICY IF EXISTS "Team members can view deliverables" ON public.sprint_deliverables;
CREATE POLICY "Team members can view deliverables" ON public.sprint_deliverables FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 26. sprint_events
DROP POLICY IF EXISTS "Team members can view events" ON public.sprint_events;
CREATE POLICY "Team members can view events" ON public.sprint_events FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 27. sprint_metrics
DROP POLICY IF EXISTS "Team members can view metrics" ON public.sprint_metrics;
CREATE POLICY "Team members can view metrics" ON public.sprint_metrics FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 28. sprints
DROP POLICY IF EXISTS "Team members can view sprints" ON public.sprints;
CREATE POLICY "Team members can view sprints" ON public.sprints FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 29. task_comments
DROP POLICY IF EXISTS "Team members can view comments" ON public.task_comments;
CREATE POLICY "Team members can view comments" ON public.task_comments FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 30. tasks
DROP POLICY IF EXISTS "Team members can view tasks" ON public.tasks;
CREATE POLICY "Team members can view tasks" ON public.tasks FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 31. ticket_attachments (preserva AND is_ticket_assigned_to)
DROP POLICY IF EXISTS "team_member_select_ticket_attachments" ON public.ticket_attachments;
CREATE POLICY "team_member_select_ticket_attachments" ON public.ticket_attachments FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role) AND is_ticket_assigned_to(ticket_id, auth.uid()));

-- 32. ticket_messages (preserva AND is_ticket_assigned_to)
DROP POLICY IF EXISTS "team_member_select_ticket_messages" ON public.ticket_messages;
CREATE POLICY "team_member_select_ticket_messages" ON public.ticket_messages FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role) AND is_ticket_assigned_to(ticket_id, auth.uid()));

-- 33. tickets (preserva AND assigned_to = uid)
DROP POLICY IF EXISTS "Team members can view assigned tickets" ON public.tickets;
CREATE POLICY "Team members can view assigned tickets" ON public.tickets FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role) AND (assigned_to = auth.uid()));

-- 34. tool_area_access
DROP POLICY IF EXISTS "Team members can view tool access" ON public.tool_area_access;
CREATE POLICY "Team members can view tool access" ON public.tool_area_access FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 35. tools
DROP POLICY IF EXISTS "Team members can view tools" ON public.tools;
CREATE POLICY "Team members can view tools" ON public.tools FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 36. user_roles
DROP POLICY IF EXISTS "Team members can view all roles" ON public.user_roles;
CREATE POLICY "Team members can view all roles" ON public.user_roles FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 37. work_package_activities
DROP POLICY IF EXISTS "Team members can view activities" ON public.work_package_activities;
CREATE POLICY "Team members can view activities" ON public.work_package_activities FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 38. work_package_files
DROP POLICY IF EXISTS "Team members can view files" ON public.work_package_files;
CREATE POLICY "Team members can view files" ON public.work_package_files FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 39. work_package_relations
DROP POLICY IF EXISTS "Team members can view relations" ON public.work_package_relations;
CREATE POLICY "Team members can view relations" ON public.work_package_relations FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 40. work_package_watchers
DROP POLICY IF EXISTS "Team members can view watchers" ON public.work_package_watchers;
CREATE POLICY "Team members can view watchers" ON public.work_package_watchers FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- Grupo B: 3 policies parcialmente bloqueantes

-- 41. area_servicos
DROP POLICY IF EXISTS "team_lider_select_area_servicos" ON public.area_servicos;
CREATE POLICY "team_lider_select_area_servicos" ON public.area_servicos FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 42. audit_logs (preserva AND area filter)
DROP POLICY IF EXISTS "Members can view tax audit_logs" ON public.audit_logs;
CREATE POLICY "Members can view tax audit_logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role) AND (area = ANY (ARRAY['tax','osg'])));

-- 43. servicos_prestados
DROP POLICY IF EXISTS "team_lider_select_servicos_prestados" ON public.servicos_prestados;
CREATE POLICY "team_lider_select_servicos_prestados" ON public.servicos_prestados FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));
