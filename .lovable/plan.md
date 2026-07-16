## Auditoria RLS-P1-06 — resultados (somente leitura, nada foi alterado)

### Query 1 — matriz de policies (19 tabelas)

Todas as tabelas da leva têm CRUD completo com checagem real. Padrão por tabela:

**Pais (cluster_id direto):** `processes`, `process_stages` (via `processes.cluster_id`), `documentos_processo`, `gargalos`, `process_improvements`, `sistemas_processo`, `sistema_clusters`
- SELECT/INSERT/UPDATE: `admin OR (team_member+ AND cluster_id = ANY(resolve_user_cluster_ids))`
- DELETE: `admin OR (lider+ AND cluster_id = ANY(...))`
- Nomes: `rls_<tabela>_<cmd>`
- Exceção `sistemas_processo.SELECT`: inclui OR via `sistema_clusters` (compartilhamento M:N — correto, RLS-P1-04).

**Filhas (via helper de visibilidade):**
- `etapa_documentos`, `etapa_responsaveis`, `etapa_sistemas` → `process_stage_cluster_visivel(etapa_id)`
- `gargalo_processos`, `gargalo_responsaveis` → `gargalo_cluster_visivel(gargalo_id)`
- `melhoria_processos`, `melhoria_sistemas`, `melhoria_responsaveis`, `melhoria_acoes_td` → `melhoria_cluster_visivel(melhoria_id)`
- `sistema_responsaveis` → `sistema_cluster_visivel(sistema_id)`
- Todas com o mesmo padrão team_member+ (SELECT/INSERT/UPDATE) e lider+ (DELETE).

**`projeto_justificativas`:**
- SELECT `projeto_justificativas_select`: `admin OR EXISTS(projects p WHERE p.id=projeto_id AND (p.cluster_id IS NULL OR ANY(resolve_user_cluster_ids)))` (09/07, mantido)
- SELECT `team_member_select_projeto_justificativas`: `has_role_or_higher(team_member)` ⚠️ **policy permissiva legada convivendo com a de cluster — PostgREST usa OR entre policies do mesmo cmd, então isso anula o isolamento do SELECT**
- INSERT `team_member_insert_projeto_justificativas`: `WITH CHECK has_role_or_higher(team_member)` (sem checagem de cluster)
- UPDATE `projeto_justificativas_update`: cluster real (team_member+, RLS-P1-05, OK)
- DELETE `projeto_justificativas_delete`: cluster real (lider+, RLS-P1-05, OK)

**`documento_horas_historico`:**
- SELECT `dhh_select`: `alterado_por = auth.uid() OR lider+`
- INSERT `dhh_insert`: `alterado_por = auth.uid() AND team_member+`
- UPDATE `dhh_update`: admin-only
- DELETE `dhh_delete`: admin-only ✅ (RLS-04 preservada)

### Query 2 — policies permissivas escondidas (`qual='true' OR with_check='true'`)

**0 linhas.** ✅

### Query 3 — tabelas da leva sem policy de DELETE

**1 linha: `gargalo_melhorias`** ⚠️
- É uma junction table (4 colunas, 2 policies existentes).
- Sem DELETE explícito → hoje nenhum usuário consegue deletar vínculo (RLS restritivo por default), o que na prática **fecha** o DELETE. Não é vazamento, mas fica implícito. Vale confirmar se front precisa desvincular melhoria de gargalo.

### Query 4 — `documento_horas_historico`

| policyname | cmd | qual | with_check |
|---|---|---|---|
| dhh_delete | DELETE | `has_role(auth.uid(),'admin')` | — |
| dhh_insert | INSERT | — | `alterado_por = auth.uid() AND has_role_or_higher(team_member)` |
| dhh_select | SELECT | `alterado_por = auth.uid() OR has_role_or_higher(lider)` | — |
| dhh_update | UPDATE | `has_role(auth.uid(),'admin')` | `has_role(auth.uid(),'admin')` |

DELETE fechado a admin, herança da RLS-04 intacta. ✅

---

## Achados que merecem sua decisão

1. **`projeto_justificativas` — SELECT permissivo remanescente** (`team_member_select_projeto_justificativas`, USING `has_role_or_higher(team_member)` sem cluster). Como PostgREST faz OR entre múltiplas policies SELECT do mesmo comando, essa policy **neutraliza** o isolamento por cluster do `projeto_justificativas_select`. Além disso o INSERT legado (`team_member_insert_projeto_justificativas`) também não checa cluster. A RLS-P1-05 só endureceu UPDATE/DELETE — SELECT e INSERT ficaram nas policies antigas.
2. **`gargalo_melhorias` sem DELETE policy** — RLS bloqueia por default, então não vaza; mas se o front precisa desvincular, hoje falha silenciosamente para não-admin (na verdade falha para todos, já que não há policy).

Nenhuma migration foi criada nesta auditoria. Se quiser, o próximo passo é uma migration pontual RLS-P1-06 fechando o SELECT/INSERT de `projeto_justificativas` (drop das duas `team_member_*` legadas + recriação com checagem de cluster no mesmo padrão do UPDATE/DELETE) e, opcionalmente, DELETE explícito em `gargalo_melhorias`. Me avise se quer que eu monte o plano dessa migration.
