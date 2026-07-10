# Auditoria RLS — somente leitura

Snapshot direto de `pg_class` / `pg_policies` / `information_schema`. **Nenhuma alteração feita.**

---

## 1. Cobertura de RLS

- **Tabelas em `public`:** 138
- **RLS habilitado:** **138 / 138 (100%)**
- **Com ≥ 1 policy:** **134 / 138 (97,1%)**
- **Sem policies:** 4 (todas backups `_bkp_psa_unify_*`)

🔴 **Zero policies:**

| tabela | RLS | # policies | S | I | U | D |
|---|---|---|---|---|---|---|
| _bkp_psa_unify_20260507_area_servicos | on | 0 | ❌ | ❌ | ❌ | ❌ |
| _bkp_psa_unify_20260507_catalog_clients | on | 0 | ❌ | ❌ | ❌ | ❌ |
| _bkp_psa_unify_20260507_org_projects | on | 0 | ❌ | ❌ | ❌ | ❌ |
| _bkp_psa_unify_20260507_tickets | on | 0 | ❌ | ❌ | ❌ | ❌ |

Mitigante: essas 4 não têm `GRANT` para `authenticated`/`anon` (só `sandbox_exec`), então não são acessíveis pela PostgREST. Ainda assim é dívida de cleanup.

**Distribuição do restante:**
- 4 policies (SPLIT S/I/U/D): 78 tabelas — padrão desejado.
- 2 policies (`ALL` + `SELECT`): 32 tabelas — padrão catálogo/read-only.
- 3 policies: `dashboard_cliente_access`, `dashboard_cluster_access`, `roi_snapshots`, `ticket_attachments`.
- 5 policies: `novidades`, `representante`, `user_page_access`, `cliente_clusters`.
- 6 policies: `user_roles`.
- 1–2 (`INSERT/SELECT` only): `access_change_log`, `audit_logs`, `documento_notificacao_visto`, `rls_precheck_allowed_tables`.

Nenhuma tabela com RLS off.

---

## 2. Tabelas sensíveis

| tabela | S | I | U | D | veredicto |
|---|---|---|---|---|---|
| cliente | 1 | 1 | 1 | 1 | ✅ split CRUD |
| contribuinte | 1 | 1 | 1 | 1 | ✅ |
| ordem_servico | 1 | 1 | 1 | 1 | ✅ |
| tickets | 1 | 1 | 1 | 1 | ✅ |
| representante | 2 | 1 | 1 | 1 | ✅ |
| user_roles | 3 | 1 | 1 | 1 | ✅ (SELECT: admin / team_member+ / self; escrita só admin) |
| profiles | 2 | 0 | 2 | 0 | ⚠️ sem policy explícita de INSERT/DELETE — INSERT ocorre via trigger `handle_new_user` (SECURITY DEFINER); aceitável, mas convém documentar/ formalizar |
| cliente_clusters | 2 SELECT + 3 ALL | — | — | — | ⚠️ policies `ALL` sobrepondo SELECT — revisar duplicidade |

Nenhuma tabela sensível está desprotegida.

---

## 3. Policies suspeitas — `USING (true)`

**49 policies com `qual = 'true'`** distribuídas em **21 tabelas**, todas para `authenticated`, sem `has_role()`/cluster/projeto:

**Aceitável (catálogo global de estrutura):**
- `centros_custo` (SELECT)
- `estrutura_areas`, `estrutura_clusters`, `estrutura_equipes`, `estrutura_equipe_membros` (SELECT)

**⚠️ Dívida real (dados operacionais expostos a qualquer authenticated, incluindo `client`/representante — em SELECT, UPDATE e DELETE):**

| módulo | tabelas afetadas | comandos `USING(true)` |
|---|---|---|
| Processos | `documentos_processo`, `etapa_documentos`, `etapa_responsaveis`, `etapa_sistemas`, `sistemas_processo`, `sistema_clusters`, `sistema_responsaveis` | S/U/D |
| Gargalos | `gargalos`, `gargalo_processos`, `gargalo_responsaveis` | S/U/D |
| Melhorias | `melhoria_acoes_td`, `melhoria_processos`, `melhoria_responsaveis`, `melhoria_sistemas` | S/U/D |
| Projeto | `projeto_justificativas` | U/D |

**16 tabelas** com risco efetivo. Recomenda-se isolar via `can_view_org_project` / cluster no mesmo modelo do RLS-05 Fiscal.

Nenhuma policy filtra `ambiente`/`excluido` (esse filtro é client-side por convenção — leaks cross-ambiente via PostgREST direto são possíveis, mas fora do escopo de RLS).

---

## 4. Checklist da dívida técnica

- ✅ RLS habilitado em 100% das tabelas
- ✅ Helpers `cliente_visivel_para`, `resolve_user_cluster_ids`, `has_role_or_higher`, `can_view_org_project`, `can_view_contribuinte`
- ✅ **RLS-05 Fiscal** — 14 tabelas isoladas por contribuinte (migration `20260709214333`)
- ✅ `cliente` / `contribuinte` / `ordem_servico` / `tickets` / `representante` / `user_roles` — split CRUD com isolamento
- ✅ Backups `_bkp_psa_unify_*` sem grant para `authenticated`/`anon`
- ⏳ `cliente_clusters` — coexistência `ALL` + `SELECT` (revisar/consolidar)
- ⏳ `profiles` — formalizar policy INSERT/DELETE (hoje só via trigger)
- ❌ **RLS-Processos** — 7 tabelas com `USING(true)` (documentos/etapas/sistemas)
- ❌ **RLS-Gargalos** — 3 tabelas com `USING(true)`
- ❌ **RLS-Melhorias** — 4 tabelas com `USING(true)`
- ❌ `projeto_justificativas` — UPDATE/DELETE `USING(true)`
- ❌ Cleanup das 4 backups (`DROP` ou mover para schema `archive`)
- ❌ Decidir se `centros_custo` deve ficar global ou isolar por cluster

---

## 5. Migrations relacionadas a RLS

Todas as migrations em `supabase/migrations/` estão versionadas e aplicadas na ordem cronológica. **Não há migration pendente no repo.**

Últimas relacionadas a RLS/segurança:
- `20260702143524_…`, `20260706200143_…`, `20260706205822_…` — user_roles / access
- `20260707114633_…`, `20260707114655_…` — dashboard access
- `20260707184751_…`, `20260707204659_…` — chamados
- `20260708135606_…`, `20260708151627_…` — estrutura
- `20260709180727_…` — RLS-04
- `20260709202520_…` — helper `can_view_contribuinte`
- **`20260709214333_…` — RLS-05 Fiscal (última aplicada)**

---

## Resumo em uma frase

**138/138 tabelas com RLS habilitado (100%) e 134/138 (97,1%) com policies efetivas — mas ainda há 21 tabelas com 49 policies `USING (true)`, das quais ~16 (processos, gargalos, melhorias, projeto_justificativas) representam a dívida real de isolamento por cluster/projeto a ser endereçada em um próximo RLS-06.**
