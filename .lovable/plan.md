## Análise — `20260617100000_psa_consultores_inplace_qualitativo.sql`

### 1. Validação de enums vs. frontend

| Coluna | Valores na migração | Aceitos no frontend | Status |
|---|---|---|---|
| `documentos_processo.formato` | `PDF`, `Excel`, `PowerPoint` | `PDF`, `Word`, `Excel`, `PowerPoint`, `Markdown`, `Texto` | ✅ |
| `documentos_processo.origem` | `Interno`, `Cliente` | `Interno`, `Cliente` | ✅ |
| `documentos_processo.estruturado` | `Estruturado`, `Não Estruturado` | `Estruturado`, `Semi Estruturado`, `Não Estruturado` | ✅ |
| `process_stages.execution` | `manual`, `semi_automatica` | `manual`, `semi_automatica`, `automatica` | ✅ |
| `processes.frequency` | `Diária`, `Semanal`, `Mensal` (PT capitalizado) | `Diária`, `Semanal`, `Quinzenal`, `Mensal`, `Trimestral`, `Anual` — case-sensitive em `FATOR_ANUAL` | ✅ |
| `process_improvements.improvement_status` | `Backlog`, `Concluído` | `Não iniciado`, `Em progresso`, `Concluído`, `Backlog` (de `src/types.ts`) | ✅ — Obs.: o enum real é `Em progresso`, não `Em andamento` (o briefing usou o nome antigo), mas a migração não insere nenhum dos dois, então não há impacto |
| `projects.status` | `Melhorias` (todos os 10) | `Mapeamento`, `Diagnóstico`, `Melhorias`, `ROI` (`ProjetoStatus`) | ✅ |
| `gargalos.origem` | `Sistema`, `Processo`, `Externo`, `Pessoas` | `Processo`, `Sistema`, `Pessoas`, `Cliente`, `Externo` | ✅ |

Nenhum valor fora dos enums.

### 2. Integridade Digital Rotina (dailys & sprints)

- Os 17 IDs de `processes` e 10 IDs de `projects` são **UPDATEd** in-place (linhas 77-84 e 107-120) — apenas `description`, `cluster_id`, `status`, `area`, metadados MAPA e `updated_at`. **Ids preservados** → FKs em `daily_standups.process_id` e `sprint_deliverables.project_id` permanecem válidas. ✅
- O bloco DO inicial (linhas 16-39) faz `RAISE EXCEPTION` se algum dos 17 processes ou 10 projects legados não existir, abortando antes de qualquer escrita. ✅
- `DELETE FROM public.process_stages` (linha 46) é escopado a `process_id = ANY([os 17 ids])` — não toca stages de outros clusters. ✅
- `PROC-GERAL-001` (DP) não está na lista e o bloco DO inclui guard explícito que aborta se ele estiver vinculado ao cluster PSA. ✅
- Nenhum `DELETE` em `processes` ou `projects` em toda a migração — só UPDATE. ✅

### 3. Segurança dos DELETEs de catálogos

Todos os DELETEs (linhas 42-61) são escopados a uma das duas formas:

- **Por `cluster_id = 'b21b0b89-...'`**: `gargalos`, `process_improvements`, `sistema_clusters`, `sistemas_processo`, `documentos_processo`, e suas tabelas-ponte (`gargalo_melhorias/processos/responsaveis`, `melhoria_*`, `sistema_responsaveis`, `documento_horas_historico`) via subselect filtrado por cluster.
- **Por `etapa_id IN (SELECT id FROM process_stages WHERE process_id = ANY([17 ids]))`**: `etapa_documentos`, `etapa_sistemas`, `etapa_responsaveis`, `gargalo_etapas`.

Nenhum DELETE global. Cluster OSG (`0523512c-...`) e legado `NULL` não são tocados. ✅

### 4. Bloco de validação final

Existe `DO $$ ... $$` (linha 865+) que valida 9 contagens-chave e dispara `RAISE EXCEPTION` se não baterem: 10 projects, 17 processes, 64 stages AS-IS, 78 documentos, 22 sistemas, 13 gargalos, 21 melhorias, 152 etapa_documentos, 90 etapa_sistemas (e segue com etapa_responsaveis). Falha de qualquer contagem aborta o `COMMIT`. ✅

### 5. Plano de execução

A migração roda em uma transação única (`BEGIN; ... COMMIT;`) na seguinte ordem:

1. Cria função auxiliar `public.psa_mapa_uuid(slug)` (md5 determinístico para ids reaproveitáveis).
2. Pré-flight: valida existência do cluster PSA, dos 10 projects e 17 processes legados, e que `PROC-GERAL-001` não esteja indevidamente no cluster.
3. Limpeza idempotente escopada ao cluster PSA: bridges de etapa → `process_stages` dos 17 ids → bridges de gargalos/melhorias → `gargalos`/`process_improvements` → `sistema_clusters`/`sistemas_processo`/`documentos_processo`.
4. **UPDATE in-place** dos 10 projects (descrições, status, área, cluster).
5. **UPDATE in-place** dos 17 processes (descrição, área, cluster, project_id, prioridade, frequência, complexidade, entregável).
6. INSERT das 64 etapas AS-IS (ids determinísticos via `psa_mapa_uuid`).
7. INSERT dos 78 documentos, 22 sistemas, 13 gargalos, 21 melhorias (todos com `ON CONFLICT (id) DO UPDATE` para idempotência).
8. INSERT das pontes: `etapa_documentos` (152), `etapa_sistemas` (90), `etapa_responsaveis`, `gargalo_etapas/processos`, `melhoria_processos`.
9. Bloco final de validação por contagens → `RAISE EXCEPTION` aborta a transação se algo divergir.

### Conclusão

**Seguro aplicar** via Lovable Cloud. Não há risco para dailys/sprints (ids preservados), não há risco para outros clusters (todos os DELETEs escopados), enums batem com o frontend, e a transação tem rollback automático em caso de qualquer divergência de contagem.

Próximo passo: aprovar este plano para que eu rode a migração via `supabase--migration` em build mode.
