## Avaliação do plano

Verifiquei o estado atual e o plano é **viável e seguro**. Resultado das checagens:

**Arquivos** (existem, prontos para aplicar):
- `supabase/migrations/20260512120000_process_code_autogen.sql` (70 linhas)
- `supabase/migrations/20260512130000_process_scenarios.sql` (182 linhas)
- `supabase/migrations/20260512140000_processes_equipe_fk.sql` (48 linhas)
- `supabase/functions/calculate-process-roi/index.ts` — já contém o refactor `mode='compute'` / `mode='persist'` com `per_unit/per_month/per_year`, `avg_hourly_cost_implementation` e `hours_per_month` parametrizáveis. Só falta redeploy.

**Banco** (nada aplicado ainda — confirmado via `information_schema` / `pg_proc` / `pg_type`):
- `processes.equipe_id` → não existe
- `process_scenarios` → não existe
- `generate_process_code()` → não existe
- enum `scenario_kind` → não existe

**Pré-requisitos das migrations** (todos OK):
- `processes.client_id` ✓, `processes.code` ✓, `processes.area` ✓ (preservado)
- `catalog_clients.name` ✓ (preservado, usado no backfill)
- `estrutura_equipes.name` ✓ (usado no backfill)
- `public.projects` ✓ (FK em `process_scenarios.project_id`)
- `public.process_improvements` ✓ (FK em `process_scenarios.improvement_id`)

Nenhum conflito de nome de FK/índice/trigger detectado. As migrations são idempotentes (`IF NOT EXISTS`, `DROP TRIGGER IF EXISTS`, `DO $$ ... duplicate_object`).

---

## Plano de execução

### Passo 1 — Aplicar migration A: `generate_process_code()` + trigger + índice único parcial
Roda o SQL de `20260512120000_process_code_autogen.sql` via `supabase--migration`.

### Passo 2 — Aplicar migration B: enums + `process_scenarios` + RLS + 2 triggers
Roda o SQL de `20260512130000_process_scenarios.sql`. Cria os 4 enums, a tabela com FKs para `processes`, `process_improvements`, `projects`, `profiles`, RLS para `admin/team_member/lider/sublider`, e os triggers `set_scenario_updated_at` + `freeze_scenario_parameters`.

### Passo 3 — Aplicar migration C: `processes.equipe_id` + backfill
Roda o SQL de `20260512140000_processes_equipe_fk.sql`. Adiciona FK opcional para `estrutura_equipes`, índice, e executa o backfill case-insensitive via `LIKE` entre `catalog_clients.name` e `estrutura_equipes.name`. Não toca em `catalog_clients` nem em `processes.area`.

### Passo 4 — Redeploy da edge function
`supabase--deploy_edge_functions(["calculate-process-roi"])`.

### Passo 5 — Validação automatizada
Executa via `supabase--read_query`:
```sql
SELECT
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='processes' AND column_name='equipe_id'),
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name='process_scenarios'),
  (SELECT COUNT(*) FROM pg_proc WHERE proname='generate_process_code'),
  (SELECT COUNT(*) FROM processes WHERE equipe_id IS NOT NULL);
```
Espera-se `1, 1, 1, >=0` (o backfill pode retornar 0 se nenhum nome de cluster casar — não é erro).

E testa a function via `supabase--curl_edge_functions` com:
```json
{"mode":"compute","scenario_payload":{"baseline_time_hours":10,"improved_time_hours":4,"baseline_volume":100,"baseline_people_involved":2,"improved_volume":100,"improved_people_involved":2,"implementation_hours":20,"baseline_cost_monthly":5000,"improved_cost_monthly":2000}}
```
Resultado esperado: `200` com `success:true`, `mode:"compute"` e bloco `results.views` populado.

### Cuidados respeitados
- `catalog_clients` e `processes.area` permanecem intocados.
- Migrations já versionadas não são alteradas; aplico exatamente o SQL existente.
- Se qualquer passo falhar, reporto a mensagem exata do Postgres antes de propor fix.

### Observação fora de escopo (não vou tocar agora)
A function `gerar-sintese-executiva/index.ts` está com bug pré-existente (usa `corsHeaders` sem declarar — só importa `buildCorsHeaders`). Isso já está quebrado independentemente deste plano e não bloqueia nada aqui. Posso corrigir depois se quiser.

Posso aplicar?