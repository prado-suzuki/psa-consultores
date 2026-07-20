# Permitir team_member editar tarefas que ele criou (org_tasks)

## Objetivo
Ajustar o trigger `trg_org_tasks_team_member_status_only` para que um `team_member` possa editar por inteiro as tarefas em que `created_by = auth.uid()`, mantendo a restrição atual (só status/horas/revisor) para tarefas apenas delegadas.

## Escopo
- Uma única migration SQL.
- Alteração exclusiva na função `public.org_tasks_team_member_status_only()` via `CREATE OR REPLACE FUNCTION`.
- Sem tocar em: policies (`rls_org_tasks_*`), trigger `trg_org_tasks_validate_reviewer`, funções de revisão delegada, frontend, hooks, ou tabelas vizinhas.

## Passos

### 1. Pré-voo (somente leitura)
Executar as 4 consultas do briefing para confirmar:
- Baseline atual da função (guardar `pg_get_functiondef`).
- Os 2 triggers existentes em `org_tasks` (`trg_org_tasks_team_member_status_only`, `trg_org_tasks_validate_reviewer`).
- Policy `rls_org_tasks_update` contém `created_by = auth.uid()`.
- Colunas `created_by`, `assigned_to`, `reviewer_id`, `status`, `estimated_hours`, `actual_hours` existem.

Se qualquer divergência: parar e reportar antes de aplicar.

### 2. Migration
Aplicar `CREATE OR REPLACE FUNCTION public.org_tasks_team_member_status_only()` conforme SQL do briefing, preservando:
- Ramo revisor delegado (não concluir; em `review` só devolve para ajuste).
- Ramo sublíder+ (edita tudo).
- Ramo delegado (só status/horas/revisor).

Adicionar entre "sublíder+" e "delegado":

```sql
IF OLD.created_by = v_user_id THEN
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Nao e permitido alterar o criador da tarefa (created_by)'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END IF;
```

Finalizar com `REVOKE ALL ON FUNCTION ... FROM PUBLIC;`.

### 3. GATE

**SQL:**
- `pg_get_functiondef` da função contém o ramo `IF OLD.created_by = v_user_id THEN`.
- `count(*)` de triggers não-internos em `org_tasks` continua = 2.

**App:**
1. team_member criador edita título/descrição/data/prioridade da própria tarefa → salva sem erro.
2. team_member em tarefa delegada (criada por outro): edição de conteúdo continua bloqueada (42501 "Tarefa delegada..."); status/horas continua funcionando.
3. Fluxo de revisão delegada inalterado (revisor em `review` só devolve para ajuste; não conclui).
4. sublíder/líder/admin seguem editando tudo.

## Fora de escopo
Frontend, hooks (`useOrgTasks`, `useUpdateOrgTask`), UI do modal, mensagens, outras policies/triggers/tabelas.
