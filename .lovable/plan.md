## RLS-06 — liberar `estimated_hours` e `actual_hours` para team_member

### Passo 1 — Pré-voo (já executado)

Trigger `trg_org_tasks_team_member_status_only` em `public.org_tasks` (BEFORE UPDATE, FOR EACH ROW) executa `public.org_tasks_team_member_status_only()`. Corpo atual:

```sql
CREATE OR REPLACE FUNCTION public.org_tasks_team_member_status_only()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role_or_higher(auth.uid(),'sublider'::app_role) THEN
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - 'status' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'updated_at') THEN
    RAISE EXCEPTION 'team_member só pode alterar o status da própria tarefa (RLS-06)'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $function$
```

Existe também o trigger inofensivo `update_org_tasks_updated_at` (função `update_updated_at_column`) — não será tocado.

O padrão `to_jsonb(NEW) - 'status' - 'updated_at'` está presente → prosseguir com o Passo 2.

### Passo 2 — Correção cirúrgica

`CREATE OR REPLACE FUNCTION` com nome, linguagem, `SECURITY DEFINER`, `search_path`, retorno, condição de papel e mensagem idênticos. Única mudança: acrescentar `- 'estimated_hours' - 'actual_hours'` nos dois lados (NEW e OLD) da comparação `to_jsonb(...)`. Nenhuma policy alterada.

Corpo final que será instalado:

```sql
CREATE OR REPLACE FUNCTION public.org_tasks_team_member_status_only()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role_or_higher(auth.uid(),'sublider'::app_role) THEN
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - 'status' - 'updated_at' - 'estimated_hours' - 'actual_hours')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'status' - 'updated_at' - 'estimated_hours' - 'actual_hours') THEN
    RAISE EXCEPTION 'team_member só pode alterar o status da própria tarefa (RLS-06)'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $function$
```

### Passo 3 — GATE fail-safe

Rodado como parte da mesma migration (bloco `DO $$ ... $$`), impersonando João Cruz (`2d1c60f5-ed90-40cd-a361-bb56ba3e1686`) na tarefa `7779a346-5fba-4bd2-9f05-a84bdd198898`:

- **TESTE 1** — `UPDATE ... SET status, estimated_hours, actual_hours` deve passar (rollback via `RAISE EXCEPTION 'GATE_OK_1'`).
- **TESTE 2** — `UPDATE ... SET title = title || ' [gate]'` deve continuar bloqueado pelo trigger.

Qualquer falha em qualquer teste aborta a migration inteira (transação atômica do Supabase) → função volta ao estado anterior automaticamente.

### Entrega no chat pós-execução

1. Saída do Passo 1 (já acima).
2. Corpo final instalado (via `pg_get_functiondef` após a migration).
3. Resultado do GATE (`NOTICE "GATE OK ..."` ou o erro que abortou).

### Fora de escopo

Policies de SELECT/INSERT/UPDATE/DELETE em `org_tasks`, `normEmpty` no hook, TaskModal, Kanban, dropdown inline, RLS-11 (dashboards).
