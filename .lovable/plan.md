## Parte 1 — VALIDAÇÃO dos 3 arquivos

### (a) Tabelas protegidas — NENHUM DELETE/UPDATE/DROP/ALTER/TRUNCATE
Varri os 3 arquivos por `^(DELETE|UPDATE|DROP|ALTER|TRUNCATE)`:

- **Arquivo 1 (`20260606100000`)**: 24 DELETEs, todos em tabelas do MAPA OSG (`melhoria_*`, `cascata_*`, `etapa_*`, `gargalo*`, `process_*`, `documentos_processo`, `sistemas_processo`, `sistema_*`, `documento_horas_historico`, `projeto_justificativas`, `projects`). Zero DELETE/UPDATE/DROP/ALTER nas tabelas protegidas.
- **Arquivo 2 (`20260606100001`)**: **zero mutações destrutivas**. Só `INSERT INTO gargalos / processes / process_stages`.
- **Arquivo 3 (`20260606100002`)**: **zero mutações destrutivas**. Só `INSERT INTO` junções OSG.

As únicas referências às tabelas protegidas (`project_processes`, `sprint_deliverables`, `daily_standups`, `sprints`, `estrutura_clusters`) estão dentro do bloco de validação do arquivo 1 e são **somente `SELECT count(*)`** para detectar refs cruzadas. `job_roles` é referenciado apenas via UUIDs literais como `responsavel_id` — não há SELECT/UPDATE/DELETE na tabela. `profiles`, `profiles_safe`, `tools`, `routines`, `demand_items`, `tasks`, `org_tasks`, `project_documents`, `sprint_backlog_items`, `sprint_events`, `sprint_metrics`, `deliverable_attachments`, `estrutura_areas`, `estrutura_equipes`, `estrutura_equipe_membros`, `catalog_clients`, `user_roles` **não aparecem em lugar nenhum**. ✅

### (b) Todo DELETE filtra por cluster OSG
Confirmado nas 24 cláusulas. Padrões:

- Direto: `WHERE cluster_id = v_cluster` (onde `v_cluster := '0523512c-f980-4236-8a7c-53e06c9c7a80'`) — em `process_improvements`, `cascata_eventos`, `processes`, `gargalos`, `sistema_clusters`, `documentos_processo`, `sistemas_processo`, `projects`.
- Subquery equivalente para tabelas-filha sem `cluster_id` próprio: `WHERE <fk>_id IN (SELECT id FROM <pai> WHERE cluster_id = v_cluster)` — em `melhoria_*`, `cascata_evento_etapas`, `etapa_responsaveis/documentos/sistemas` (via `process_stages` JOIN `processes`), `gargalo_responsaveis`, `gargalo_processos`, `process_scenarios`, `process_stages`, `documento_horas_historico`, `sistema_responsaveis`, `projeto_justificativas`. ✅

### (c) Rows fora do OSG preservadas
Como todo DELETE tem `cluster_id = OSG` ou subquery equivalente:
- `cluster_id IS NULL` (Digital Rotina herda) → **não match** → preservado.
- `cluster_id` de outro cluster em `projects`/`processes`/`process_stages`/`process_improvements`/`process_scenarios` → **não match** → preservado.
- Linhas órfãs em `process_improvements` com `process_id` OSG mas `cluster_id NULL/outro` são detectadas pela Validação 2 e **abortam** o cleanup antes de qualquer DELETE rodar (evita o cascade da FK). ✅

### (d) Validações pré-cleanup abortam via RAISE EXCEPTION
Bloco `DO $cleanup$` (linhas 63–273) tem 3 guardas, cada uma com `RAISE EXCEPTION` que dispara rollback automático da transação:
1. **Refs cruzadas Equipe↔OSG** (linhas 92–122): soma de `project_processes`, `sprint_deliverables`, `daily_standups` (project+process), `sprints` → se > 0, `RAISE EXCEPTION 'ABORTADO: ...'`.
2. **Improvements órfãos** (linhas 142–160): `process_improvements` com `process_id` OSG mas `cluster_id` NULL/outro → `RAISE EXCEPTION`.
3. **Contagens vs baseline v4** (linhas 193–271): se contagem atual > baseline (processes>32, stages>167, resp>176, docs>204, sist>219, gargalos>91, etc.) → `RAISE EXCEPTION 'ABORTADO: contagens excedem baseline v4...'`. ✅

Também há guard de existência do cluster (linha 74) que aborta se o UUID do OSG não estiver em `estrutura_clusters`.

---

## Parte 2 — PLANO DE EXECUÇÃO

Se a validação passar, executar nesta ordem, **sem modificar nenhum arquivo**, cada um em sua própria transação (BEGIN/COMMIT já presentes nos arquivos):

1. **Aplicar `20260606100000_osg_v5_full_remap.sql`** via tool de migration.
   - Helper `mapa_uuid()` + 3 validações + cleanup + reinserção de `projects` (6), `documentos_processo` (50), `sistemas_processo` (16), `sistema_clusters` (16), `projeto_justificativas` (6).
   - **Se abortar via RAISE EXCEPTION** (qualquer das 3 validações falhar ou cluster não existir): rollback automático, **parar imediatamente**, não executar os arquivos 2 e 3, e devolver a mensagem exata do RAISE.

2. **Aplicar `20260606100001_osg_v5_processes_and_stages.sql`** somente se #1 commitar.
   - 30 `gargalos` + 33 `processes` + ~170 `process_stages`.

3. **Aplicar `20260606100002_osg_v5_junctions_and_extras.sql`** somente se #2 commitar.
   - `etapa_responsaveis`, `etapa_sistemas`, `etapa_documentos`, `gargalo_processos`, 10 `process_improvements` + junções, 5 `cascata_eventos` + etapas.

4. **Reporte final**: capturar mensagens `NOTICE` emitidas pelo bloco `DO $cleanup$` (3 "Validação X/3 OK", contagens "fora do OSG preservados") e, após os 3 commits, rodar `SELECT count(*)` em cada tabela OSG (projects, processes, process_stages, etapa_responsaveis/documentos/sistemas, gargalos, gargalo_processos, documentos_processo, sistemas_processo, sistema_clusters, process_improvements, cascata_eventos, projeto_justificativas) filtrando por `cluster_id = '0523512c-f980-4236-8a7c-53e06c9c7a80'` para confirmar o novo baseline v5.

### Observações técnicas
- Os arquivos são SQL puro e idempotentes na re-inserção via `mapa_uuid()` — uma 2ª execução do arquivo 1, após cleanup limpo, regravaria as mesmas linhas com os mesmos IDs determinísticos.
- Como a tool `supabase--migration` cria uma migração nova (com nome próprio gerado pelo Lovable), o conteúdo dos 3 arquivos será reproduzido sem alteração; cada chamada será uma transação independente.
