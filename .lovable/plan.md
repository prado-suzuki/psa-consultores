

# Migração em batch: 43 SELECT policies → has_role_or_higher

## Contagem

- **Grupo A**: 40 policies (nomes corrigidos conforme banco)
- **Grupo B**: 3 policies parcialmente bloqueantes
- **Total**: 43 DROP + CREATE numa única transaction

## Nomes reais das policies (corrigidos vs lista do usuário)

Diferenças encontradas entre os nomes informados e os nomes reais no banco:

| # | Nome informado | Nome real no banco |
|---|---|---|
| 12 | Members can view their project... | Members can view their project fiscal_tasks |
| 13 | Team members can view improvement_savings_details | Team members can view savings details |
| 14 | Team members can view improvement_team_members | Team members can view improvement members |
| 16 | Team members can view process_stages | Team members can view process stages |
| 18 | Team members can view project_documents | Team members can view project documents |
| 19 | Team members can view project_processes | Team members can view project processes |
| 20 | Team members can view project_work_packages | Team members can view all work packages |
| 24 | Team members can view sprint_backlog_items | Team members can view backlog items |
| 25 | Team members can view sprint_deliverables | Team members can view deliverables |
| 34 | Team members can view tool_area_access | Team members can view tool access |
| 37 | Team members can view work_package_activities | Team members can view activities |
| 38 | Team members can view files | Team members can view files ✓ |
| 39 | Team members can view work_package_relations | Team members can view relations |
| 40 | Team members can view work_package_watchers | Team members can view watchers |

## Padrões de USING encontrados (4 variantes)

1. `has_role(uid, 'team_member') OR has_role(uid, 'admin')` → substituir tudo por `has_role_or_higher(uid, 'team_member'::app_role)` (já cobre admin)
2. `has_role(uid, 'team_member')` sozinho → substituir por `has_role_or_higher(uid, 'team_member'::app_role)`
3. `EXISTS (SELECT 1 FROM user_roles WHERE user_id = uid AND role IN ('team_member','admin'))` → substituir por `has_role_or_higher(uid, 'team_member'::app_role)`
4. Condições compostas com AND (fiscal_tasks, tickets, ticket_messages, ticket_attachments) → substituir apenas a parte do role check, manter o AND

## Casos especiais preservados

- **fiscal_tasks** ("Members can view their project fiscal_tasks"): mantém `AND ((project_id IS NULL) OR is_project_member(...) OR (EXISTS (...is_area_member...)))`
- **tickets** ("Team members can view assigned tickets"): mantém `AND (assigned_to = auth.uid())`
- **ticket_attachments** / **ticket_messages**: mantém `AND is_ticket_assigned_to(ticket_id, auth.uid())`
- **projects** ("Clients can view projects assigned to them"): mantém `EXISTS (SELECT 1 FROM client_visible_projects...)`, troca apenas os `has_role` por `has_role_or_higher`
- **audit_logs**: mantém `AND (area = ANY (ARRAY['tax','osg']))`

## Nota sobre fiscal_tasks

A tabela `fiscal_tasks` tem 3 SELECT policies separadas: Admins, Leaders, Members. Só a de Members precisa mudar (para incluir sublider). As de admin e lider permanecem intactas.

## SQL da migração

Uma única migration com BEGIN/COMMIT contendo 43 DROP POLICY IF EXISTS + CREATE POLICY statements.

## Verificação pós-migração

```sql
SELECT tablename, policyname, qual 
FROM pg_policies 
WHERE qual::text ILIKE '%has_role_or_higher%' 
AND cmd = 'SELECT'
ORDER BY tablename;
```

Resultado esperado: 44 policies (43 desta migração + 1 de page_permissions da migração anterior).

