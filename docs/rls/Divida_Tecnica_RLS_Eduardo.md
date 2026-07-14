# Dívida Técnica de RLS — Tarefas para Revisão

**Responsável:** Eduardo
**Data da auditoria:** 10/07/2026
**Fonte:** Auditoria somente-leitura no schema real do Postgres (`pg_class`, `pg_policies`, `information_schema.role_table_grants`) — 138 tabelas em `public`.

---

## 📊 Estado atual (resumo)

| Indicador | Situação |
|---|---|
| Tabelas com RLS habilitado | **138 / 138 (100%)** ✅ |
| Tabelas com ≥ 1 policy efetiva | **134 / 138 (97,1%)** |
| Tabelas com 0 policies (só backups) | 4 |
| Policies `USING (true)` para `authenticated` | **49 policies em 21 tabelas** 🔴 |
| Dívida real de isolamento (não-catálogo) | **~16 tabelas** |

> **Ponto-chave:** o gap **não** é "faltar RLS" — o RLS está ligado em tudo. O problema real são as **policies `USING (true)`**, que deixam qualquer usuário autenticado (inclusive `client`/`representante`) ler, alterar e apagar dados de módulos operacionais, sem isolamento por cluster/cliente.

---

## 🔴 P1 — Segurança real (prioridade máxima)

**Tarefa: substituir `USING (true)` por checagem de permissão nas 16 tabelas de dados.**

Hoje essas tabelas permitem acesso irrestrito via PostgREST para qualquer usuário autenticado. Trocar por checagem via `has_role()` / `is_project_member()` / `cliente_visivel_para()` — mesmo padrão já aplicado em `cliente`, `contribuinte` e `ordem_servico`.

> 📄 **Esqueleto de migration pronto (rascunho — revisar antes de aplicar):**
> `supabase/migrations/20260710120000_rls_p1_mapa_isolamento_cluster.sql`
> Cobre as 15 tabelas isolando por `cluster_id` (direto ou via FK), no padrão da RLS-05 Fiscal. Contém 2 helpers (`mapa_cluster_visivel` / `mapa_cluster_gerenciavel`), a limpeza automática das policies `USING(true)` e a query de validação final.
> **Antes de aplicar, decidir os 3 pontos marcados como `DECISÃO A/B/C` no arquivo:** (A) linhas com `cluster_id NULL`; (B) piso de papel para escrita/DELETE; (C) se `client`/`timecliente` enxergam MAPA.

**Módulo Processos**
- [ ] `documentos_processo` (SELECT / UPDATE / DELETE)
- [ ] `etapa_documentos` (SELECT / UPDATE / DELETE)
- [ ] `etapa_responsaveis` (SELECT / UPDATE / DELETE)
- [ ] `etapa_sistemas` (SELECT / UPDATE / DELETE)

**Módulo Gargalos**
- [ ] `gargalos` (SELECT / UPDATE / DELETE)
- [ ] `gargalo_processos` (SELECT / UPDATE / DELETE)
- [ ] `gargalo_responsaveis` (SELECT / UPDATE / DELETE)

**Módulo Melhorias**
- [ ] `melhoria_acoes_td` (SELECT / UPDATE / DELETE)
- [ ] `melhoria_processos` (SELECT / UPDATE / DELETE)
- [ ] `melhoria_responsaveis` (SELECT / UPDATE / DELETE)
- [ ] `melhoria_sistemas` (SELECT / UPDATE / DELETE)

**Módulo Sistemas**
- [ ] `sistemas_processo` (SELECT / UPDATE / DELETE)
- [ ] `sistema_clusters` (SELECT / UPDATE / DELETE)
- [ ] `sistema_responsaveis` (SELECT / UPDATE / DELETE)

**Justificativas**
- [ ] `projeto_justificativas` (UPDATE / DELETE)

**Critério de pronto:** nenhuma dessas policies pode continuar com `qual = 'true'` para `authenticated`. Toda operação passa por `has_role`/`is_project_member`/`cliente_visivel_para`.

---

## 🟡 P2 — Revisões e decisões

- [ ] **`cliente_clusters`** — remover a duplicidade de policies `ALL` sobrepondo os `SELECT`. Risco de uma policy permissiva `ALL` anular a intenção do CRUD split.
  *Pronto quando:* matriz de policy limpa, sem `ALL` genérico convivendo com CRUD separado.
- [ ] **`centros_custo`** — decidir formalmente se leitura global é aceitável ou precisa isolar. Registrar a decisão (não deixar em aberto).
- [ ] **`profiles`** — documentar que INSERT vem **apenas** do trigger `handle_new_user` (SECURITY DEFINER) e que a ausência de policy explícita de INSERT/DELETE é intencional.

---

## 🟢 P3 — Cleanup

- [ ] **DROP ou mover para schema `archive`** as 4 tabelas de backup:
  - `_bkp_psa_unify_20260507_area_servicos`
  - `_bkp_psa_unify_20260507_catalog_clients`
  - `_bkp_psa_unify_20260507_org_projects`
  - `_bkp_psa_unify_20260507_tickets`

  *Não vazam hoje (sem grant para `authenticated`/`anon`, só `sandbox_exec`), mas são superfície de risco morta.*

---

## ⚠️ Decisão de arquitetura pendente (bloqueia "fechar" a dívida)

- [x] **`excluido` no RLS** — ✅ **RESOLVIDO em 14/07/2026.** Filtro `excluido = false` incorporado nas policies de SELECT/UPDATE/DELETE das 7 tabelas com soft-delete: `cliente`, `contribuinte`, `representante`, `ordem_servico`, `documento_arquivo`, `correcoes_icms`, `distribuicao_receita`. UPDATE mantém `WITH CHECK` sem o filtro para permitir o próprio ato de soft-delete (`SET excluido = true`). INSERT não muda (default `false`).
- [ ] **`ambiente` no RLS** — **decisão consciente: manter client-side.** Levar para o RLS exigiria injetar o ambiente via Auth Hook (custom claim no JWT) ou interceptor no client (`SET LOCAL app.ambiente`), infra desproporcional ao benefício. Os dois ambientes já usam URLs/anon keys distintas via `src/config/api.ts`, então o vetor "usuário logado em dev lê linhas de prod" só existe para quem tenha login válido nos dois — cenário limitado aos internos, coberto pelo controle de acesso. Registrado como risco aceito.

---

## ✅ Já feito (não mexer)

- RLS habilitado em 100% das tabelas.
- Helpers `cliente_visivel_para` / `resolve_user_cluster_ids`.
- **RLS-05 Fiscal** — 14 tabelas fiscais isoladas por contribuinte (migration `20260709214333`).
- **RLS-06 Soft-delete no policy** — 7 tabelas com `excluido` isoladas via RLS (migration `20260714`).
- `user_roles` — 3 SELECTs (admin / team_member+ / self) + escrita só admin.
- `cliente` / `contribuinte` / `ordem_servico` / `tickets` / `representante` — CRUD split com isolamento por cluster.
- Backups `_bkp_psa_unify_*` sem grant para roles públicos.


---

## 🎯 Definição de "dívida quitada"

1. **Zero** policies `USING (true)` em tabelas de dados (só catálogo global tipo `estrutura_*` e `centros_custo`, se decidido, podem permanecer).
2. **DEC-01 decidida** — ✅ `excluido` no RLS; `ambiente` client-side (aceito e documentado).
3. **Backups removidos** ou arquivados.
