
# Renomear `fiscal_tasks` → `org_tasks` e `fiscal_task_comments` → `org_task_comments`

Escopo completo: renomear no banco + renomear hooks, tipos, query keys e arquivos no código, mantendo todas as funcionalidades intactas. Nenhuma mudança comportamental.

## 1. Migration única no banco

Renomeia tabelas, índices, constraints (PK/FK), trigger e policies RLS — sem migrar dados (apenas DDL).

```sql
-- Tabelas
ALTER TABLE public.fiscal_tasks RENAME TO org_tasks;
ALTER TABLE public.fiscal_task_comments RENAME TO org_task_comments;

-- Índices
ALTER INDEX fiscal_tasks_pkey RENAME TO org_tasks_pkey;
ALTER INDEX fiscal_task_comments_pkey RENAME TO org_task_comments_pkey;
ALTER INDEX idx_fiscal_tasks_project_id RENAME TO idx_org_tasks_project_id;
ALTER INDEX idx_fiscal_tasks_client_id RENAME TO idx_org_tasks_client_id;

-- FKs (9 no total)
ALTER TABLE public.org_tasks
  RENAME CONSTRAINT fiscal_tasks_parent_task_id_fkey TO org_tasks_parent_task_id_fkey;
ALTER TABLE public.org_tasks
  RENAME CONSTRAINT fiscal_tasks_assigned_to_fkey TO org_tasks_assigned_to_fkey;
ALTER TABLE public.org_tasks
  RENAME CONSTRAINT fiscal_tasks_created_by_fkey TO org_tasks_created_by_fkey;
ALTER TABLE public.org_tasks
  RENAME CONSTRAINT fiscal_tasks_project_id_fkey TO org_tasks_project_id_fkey;
ALTER TABLE public.org_tasks
  RENAME CONSTRAINT fiscal_tasks_client_id_fkey TO org_tasks_client_id_fkey;
ALTER TABLE public.org_tasks
  RENAME CONSTRAINT fiscal_tasks_contribuinte_id_fkey TO org_tasks_contribuinte_id_fkey;
ALTER TABLE public.org_tasks
  RENAME CONSTRAINT fiscal_tasks_categoria_id_fkey TO org_tasks_categoria_id_fkey;
ALTER TABLE public.org_task_comments
  RENAME CONSTRAINT fiscal_task_comments_task_id_fkey TO org_task_comments_task_id_fkey;
ALTER TABLE public.org_task_comments
  RENAME CONSTRAINT fiscal_task_comments_user_id_fkey TO org_task_comments_user_id_fkey;

-- Trigger
ALTER TRIGGER update_fiscal_tasks_updated_at ON public.org_tasks
  RENAME TO update_org_tasks_updated_at;

-- Policies RLS (8 policies)
ALTER POLICY rls_fiscal_tasks_select ON public.org_tasks RENAME TO rls_org_tasks_select;
ALTER POLICY rls_fiscal_tasks_insert ON public.org_tasks RENAME TO rls_org_tasks_insert;
ALTER POLICY rls_fiscal_tasks_update ON public.org_tasks RENAME TO rls_org_tasks_update;
ALTER POLICY rls_fiscal_tasks_delete ON public.org_tasks RENAME TO rls_org_tasks_delete;
ALTER POLICY rls_fiscal_task_comments_insert ON public.org_task_comments RENAME TO rls_org_task_comments_insert;
ALTER POLICY rls_fiscal_task_comments_update ON public.org_task_comments RENAME TO rls_org_task_comments_update;
ALTER POLICY rls_fiscal_task_comments_delete ON public.org_task_comments RENAME TO rls_org_task_comments_delete;
ALTER POLICY "Team members can view fiscal task comments" ON public.org_task_comments
  RENAME TO "Team members can view org task comments";
```

Sem realtime publication, sem views, sem dados a migrar.

## 2. Renomear hook + tipos (raiz)

- `src/hooks/useFiscalTasks.ts` → `src/hooks/useOrgTasks.ts`
  - Tipos: `FiscalTask` → `OrgTask`, `FiscalTaskStatus` → `OrgTaskStatus`, `FiscalTaskPriority` → `OrgTaskPriority`, `FiscalTaskCategory` → `OrgTaskCategory`, `FiscalRecurrenceType` → `OrgRecurrenceType`, `FiscalTaskComment` → `OrgTaskComment`, `CreateFiscalTaskInput` → `CreateOrgTaskInput`.
  - Hooks: `useFiscalTasks` → `useOrgTasks`, `useCreateFiscalTask` → `useCreateOrgTask`, `useUpdateFiscalTask` → `useUpdateOrgTask`, `useDeleteFiscalTask` → `useDeleteOrgTask`, `useReassignFiscalTask` → `useReassignOrgTask`, `useFiscalTaskComments` → `useOrgTaskComments`, `useCreateFiscalTaskComment` → `useCreateOrgTaskComment`.
  - Strings: `.from('fiscal_tasks')` → `.from('org_tasks')`, `.from('fiscal_task_comments')` → `.from('org_task_comments')`.
  - Query keys: `['fiscal-tasks', ...]` → `['org-tasks', ...]`, `['fiscal-task-comments', ...]` → `['org-task-comments', ...]`.

## 3. Atualizar consumidores (cascata de imports)

Atualizar imports e usos de tipos/hooks em:
- `src/lib/taskStatusColors.ts`
- `src/pages/equipe/fiscal/FiscalDemandasTarefas.tsx`
- `src/components/equipe/fiscal/tasks/`:
  - `ReassignModal.tsx`, `TaskCalendar.tsx`, `TaskCard.tsx`, `TaskFilters.tsx`, `TaskFutureView.tsx`, `TaskGantt.tsx`, `TaskKanban.tsx`, `TaskModal.tsx`, `TaskTable.tsx`, `TaskTodayView.tsx`

Em cada um: substituir `from '@/hooks/useFiscalTasks'` por `from '@/hooks/useOrgTasks'` e renomear identificadores (`FiscalTask`→`OrgTask`, etc.). Nenhuma lógica muda.

## 4. Atualizar outros hooks/componentes que consultam as tabelas direto

Apenas trocar a string da tabela:
- `src/hooks/useFiscalDashboardData.ts` — `'fiscal_tasks'` → `'org_tasks'`
- `src/hooks/useOrgProjects.ts` — `'fiscal_tasks'` + comentário
- `src/hooks/usePerformanceData.ts` — 4 ocorrências de `'fiscal_tasks'`
- `src/components/equipe/audit/AuditLogTable.tsx` — `'fiscal_tasks'`
- `src/pages/equipe/board/BoardDashboard.tsx` — `'fiscal_tasks'`

## 5. Edge functions

- `supabase/functions/delete-team-member/index.ts` — entradas `'fiscal_tasks'` e `'fiscal_task_comments'` no array de cleanup.
- `supabase/functions/dw-query/index.ts` — allowlist de tabelas.
- `supabase/functions/gerar-sintese-executiva/index.ts` — query.
- Redeploy das 3 funções.

## 6. Tipos auto-gerados

`src/integrations/supabase/types.ts` é regenerado automaticamente após a migration — não editar manualmente.

## 7. Ordem de execução (sem janela de quebra)

1. Aplicar a migration (passo 1).
2. Aplicar todos os edits de código + renames de arquivo (passos 2–5) num único deploy.
3. Redeployar as 3 edge functions.
4. Smoke test: abrir Tarefas Fiscal, criar/editar/comentar uma tarefa, abrir Board Dashboard, abrir Performance, abrir Audit log.

## Detalhes técnicos

- `entity_type` em `audit_logs` continua usando `'task'`/`'subtask'` — sem migração de dados.
- Sem mudança de comportamento, RLS, validações ou contratos de API.
- Nenhuma referência a `fiscal_task` em `protectedPages.ts`, rotas ou storage buckets.
- A coluna `categoria_id` (FK para `fiscal_tasks_categoria_id_fkey`) sugere que existe uma tabela `fiscal_task_categorias` ou similar — **não está no escopo deste plano** (apenas as 2 tabelas pedidas).

## Riscos

- Baixo. Renomeação puramente cosmética + DDL atômico no Postgres. Se a migration aplicar e o deploy de código atrasar, o app fica indisponível na tela de Tarefas/Board até o deploy concluir (Lovable aplica os dois juntos).
