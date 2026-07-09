# RLS-08 — Isolar sprints/daily/backlog por cluster (via `projects.cluster_id`)

## Baseline capturado ✅

**Contagens:** sprints=16 (8 sem `project_id`), sprint_backlog_items=14 (**12 sem `sprint_id`, 11 sem `project_id`**), sprint_deliverables=903, sprint_events=11, sprint_metrics=6, deliverable_attachments=0, daily_standups=298, routines=4, demand_items=0. Membros Digital = 3.

**Policies atuais (padrão nas 9 tabelas):** SELECT aberto p/ `team_member+`; INSERT/UPDATE p/ `team_member` (com `user_id=auth.uid()` em `daily_standups`); DELETE p/ `lider`. Nenhuma escrita fora do previsto → **escritas ficam intactas**.

## Refinamento do backlog

`sprint_backlog_items` tem 12/14 itens sem `sprint_id`. Aplicar apenas `sprint_visivel(sprint_id)` esconderia esses 12 de qualquer não-Digital, mesmo quando o `project_id` do item pertence ao cluster do usuário. Regra ajustada:

```
admin OR digital
OR (sprint_id  IS NOT NULL AND sprint_visivel(sprint_id))
OR (project_id IS NOT NULL AND projects.cluster_id ∈ resolve_user_cluster_ids(auth.uid()))
```

Backlog global (sem sprint e sem projeto) fica Digital-only — coerente com sprints internas.

## Migração (uma transação)

### Helpers SECURITY DEFINER
- `is_membro_digital(uuid) → bool` — membro da área `52f0596b-2904-4f76-a22d-2bad80350458`.
- `sprint_visivel(uuid) → bool` — admin OR digital OR (sprint tem `project_id` cujo `cluster_id` ∈ clusters do user).

### Substituição das 9 SELECT
| Tabela | Regra |
|---|---|
| `sprints` | admin OR digital OR (`project_id` mapeado ao cluster do user) |
| `sprint_backlog_items` | **regra refinada acima** (sprint OR projeto direto) |
| `sprint_deliverables` | `sprint_visivel(sprint_id)` |
| `sprint_events` | `sprint_visivel(sprint_id)` |
| `sprint_metrics` | `sprint_visivel(sprint_id)` |
| `deliverable_attachments` | via `sprint_deliverables.sprint_id` |
| `daily_standups` | admin OR digital OR `user_id=auth.uid()` OR `sprint_visivel(sprint_id)` OR (`project_id` mapeado ao cluster) |
| `routines` | admin OR digital OR `assigned_to=auth.uid()` OR `created_by=auth.uid()` |
| `demand_items` | admin OR digital OR `assigned_to=auth.uid()` |

Cada `CREATE` precedido de `DROP POLICY IF EXISTS "Team members can view <x>"`. INSERT/UPDATE/DELETE das 9 **não tocados**.

## GATES pós-migração
1. `is_membro_digital` = true p/ 3 membros Digital; false p/ 1 usuário fora.
2. Simulando membro Digital (não-admin) via `SET LOCAL request.jwt.claims`: `count(sprints)=16`, `count(sprint_backlog_items)=14`, `count(sprint_deliverables)=903`, `count(daily_standups)=298`.
3. Simulando usuário sem cluster OSG/Consultores e fora do Digital: `count(sprints)=0`, backlog=0.
4. Relatório final: policies das 9 tabelas + contagens (2) vs baseline + (3).

**Se qualquer contagem do (2) < baseline → rollback e reportar.**

## Rollback
Dropar as 9 `<x>_select` novas + os 2 helpers e recriar as 9 SELECT originais (`"Team members can view <x>"` com `USING (has_role_or_higher(auth.uid(),'team_member'))`).

Confirmado — aplicando a migração.
