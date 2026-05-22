# Expandir allowlist de `rls_precheck_allowed_tables`

## Escopo

A planilha lista **54 tabelas** com operações UPDATE/DELETE em RLS. Esta tarefa cobre **somente o passo 1** (migração SQL da allowlist). Os passos 2 (atualizar `PrecheckTable` em `useRlsPrecheck.ts`) e 3 (aplicar `assertCanPerform` nas mutations do frontend) ficam para tarefas seguintes, por tabela ou por lote, já que envolvem editar muitos hooks.

## O que será feito

Uma única migração com `INSERT ... ON CONFLICT (table_name) DO UPDATE SET allowed_ops = EXCLUDED.allowed_ops`, idempotente, contendo:

- **51 tabelas** com `ARRAY['update','delete']`:
  `catalog_clients, cliente, comentarios_avaliacao, contatos, contribuinte, contribuinte_bal_config, daily_standups, dcomp, deliverable_attachments, demand_items, difal_decisao, difal_sessao, distribuicao_dcomp, distribuicao_receita, documents, export_profiles, improvement_savings_details, inscricao_contribuinte, novidades, ordem_servico, org_project_members, org_projects, org_task_comments, org_tasks, per, per_situacao, pis_cofins_class, pis_cofins_regra, procedimentos, process_stages, processes, project_documents, project_processes, project_servicos, projects, relatorios_gerados, representante, routines, setor_cliente, sprint_backlog_items, sprint_deliverables, sprint_events, sprint_metrics, sprints, task_comments, tasks, ticket_messages, tickets, tool_area_access, tools, user_roles`
- **2 tabelas** com `ARRAY['update']` somente:
  `correcoes_icms, profiles`
- **1 tabela** com `ARRAY['delete']` somente:
  `ticket_attachments`

`tools` e `tool_area_access` já estavam no seed; o `ON CONFLICT DO UPDATE` apenas reconfirma os valores.

## Não está no escopo (próximos passos, sob demanda)

- Atualizar o union `PrecheckTable` em `src/hooks/useRlsPrecheck.ts`.
- Aplicar `await assertCanPerform(tabela, op, id)` antes de cada `.update()` / `.delete()` nos hooks correspondentes.

Se preferir, posso já incluir o passo 2 (atualizar o tipo) nesta mesma execução — confirme. O passo 3 sugiro tratar tabela a tabela (ou por módulo) para não inflar o diff.

## Observações

- `audit_logs` e `access_change_log` aparecem na planilha mas só com INSERT — não entram (allowlist só aceita update/delete).
- Tabelas com FK pesado (cliente, contribuinte, projects, sprints, user_roles — marcadas "Crítico") entram normalmente; o precheck não altera comportamento de quem tem permissão, só melhora a mensagem para quem não tem.
