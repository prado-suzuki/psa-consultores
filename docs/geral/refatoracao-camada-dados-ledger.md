# Ledger — Refatoração camada de dados (T4 → T5 → T6)

**Fonte:** `docs/geral/reducao-custo-ia-tarefas.md` (T4/T5/T6)
**Regra base:** `AGENTS.md` §"REGRAS INEGOCIÁVEIS" nº1 — nenhuma chamada `supabase.from/rpc` em `src/pages`/`src/components`.
**Gerado (Fase 0):** inventário das 42 ocorrências, classificado por risco e ordenado.
**Aceite T4:** `git grep 'supabase\.from\|supabase\.rpc' -- src/pages src/components` = 0 (ou exceção com comentário).

## Como ler

- **Risco** — `select` = baixo (leitura). `insert/update/delete/upsert` = médio/alto (mutation, ver §Auditoria).
- **God** — arquivo > 800 linhas (Apêndice A do doc-fonte). Nesses, T4 é absorvido por T5→T6 (não fazer passe isolado).
- **Status** — `pendente` / `wip` / `feito (PR #…)` / `exceção`.

---

## ⚠️ Bloqueadores / verificar ANTES de tocar em mutations

- [x] **Mecanismo de auditoria — CONFIRMADO (gap pré-existente).** A auditoria **não** é feita por trigger no
  banco: os 95 triggers do schema `public` fazem `updated_at`/RLS/validações, **nenhum** escreve em `audit_logs`.
  O único produtor de `audit_logs` é `src/hooks/useAuditLog.ts` (insert com `performed_by = auth.uid()`, exigido
  pela policy `rls_audit_logs_insert`). Como **nenhum** dos 42 arquivos importa `useAuditLog`, as mutations deles
  **não são auditadas hoje**. → Ver decisão de escopo abaixo. Mover a mutation para hook é seguro em si (não há
  trigger a preservar); a questão é se aproveitamos para **fechar o gap** ou apenas movemos como está.
  **DECISÃO (usuário):** *preservar comportamento* — mover a mutation como está, **sem** adicionar `useAuditLog`, e
  registrar cada CUD sem auditoria em `docs/geral/auditoria-gaps-cud.md` para virar tarefa separada depois.
- [ ] **Filtros de tenancy/soft-delete.** Preservar `.eq('ambiente', …)`, `.eq('excluido', false)`, `.eq('ativo', …)`
  ao mover queries (ex.: `ControlePerdcomp.tsx:142`). Perder um filtro desses = vazamento entre ambientes.
- [ ] **Reuso de hooks existentes.** Já existem `useCorrecoesSped.ts`, `useCorrecoesIcms.ts`, `useAuditLog.ts`,
  `useClientesList.ts`. Rotear para o hook existente em vez de criar duplicado.

---

## Resumo

| Bucket | Arquivos | Ocorrências |
|---|---:|---:|
| Total (T4) | 42 | 92 |
| Exceções (tests + util) | 4 | 8 |
| **Fase 1** — cauda longa (não-god) | 29 | ~48 |
| **Fase 2** — god-components (T4+T5+T6) | 9 | ~36 |

---

## Exceções (não forçar para hook — comentar no código)

| Arquivo | Motivo |
|---|---|
| `src/pages/equipe/mapa/MelhoriasPage.test.tsx` | mock `vi.mocked(supabase.from)` — teste |
| `src/pages/equipe/mapa/ProcessosPage.test.tsx` | idem |
| `src/pages/equipe/mapa/ProjetosPage.test.tsx` | idem |
| `src/components/equipe/client-form/constants.ts` | **não é componente** (util). Avaliar mover p/ `useOrdemServicoNumero` ou `src/lib`. Se ficar, comentar exceção. |

---

## Fase 1 — Cauda longa (mecânico, `/clear` entre lotes ou fan-out)

### 1a. Leitura pura (baixo risco) — extrair para `useQuery`

| Status | Arquivo | Ocorr. | Tabelas / nota |
|---|---|---:|---|
| feito (Onda 1) | `pages/gerencial/desempenho/DesempenhoCiclos.tsx` | 1 | `profiles` (lookup nomes) |
| feito (Onda 1) | `pages/gerencial/desempenho/DesempenhoFeedbacks.tsx` | 1 | `profiles` |
| feito (Onda 1) | `pages/gerencial/desempenho/DesempenhoMetas.tsx` | 1 | `profiles` |
| feito (Onda 1) | `pages/gerencial/desempenho/DesempenhoRelatorios.tsx` | 1 | `profiles` |
| feito (Onda 1) | `pages/gerencial/desempenho/DesempenhoVisaoGeral.tsx` | 1 | `profiles_safe` |
| feito (Onda 1) | `pages/gerencial/desempenho/MinhaEvolucao.tsx` | 1 | `profiles` |
| feito (Onda 1) | `pages/gerencial/desempenho/DesempenhoReunioes1a1.tsx` | 2 | `profiles`, `itens_acao_1a1` |
| feito (Onda 1) | `pages/gerencial/desempenho/DesempenhoEvolucao.tsx` | 3 | `profiles`, `metas`, `itens_acao_1a1` |
| feito (Onda 1) | `components/equipe/audit/AuditLogTable.tsx` | 2 | `estrutura_areas`, `audit_logs` |
| feito (Onda 1) | `components/equipe/client-form/HistoricoTab.tsx` | 2 | `profiles`, `audit_logs` |
| feito (Onda 1) | `components/equipe/osg/HistoricoFlutuante.tsx` | 1 | `profiles_safe` |
| pendente | `pages/equipe/EquipeBacklog.tsx` | 3 | `projects`, `processes`, `project_processes` |
| pendente | `pages/equipe/EquipeTarefas.tsx` | 1 | `tasks` (query dinâmica c/ filtro) |
| pendente | `pages/equipe/board/BoardDashboard.tsx` | 2 | `process_improvements`, `org_tasks` (já em `useQuery`) |

> **Oportunidade:** o lookup `profiles/profiles_safe → mapa {id: nome}` se repete em ~9 arquivos.
> Criar **um** `useProfilesNomeMap()` e substituir todos. Reduz muito o total.

### 1b. Mutation simples (não-god) — extrair para `useMutation`; ver §Auditoria

| Status | Arquivo | Ocorr. | Ops |
|---|---|---:|---|
| pendente | `components/ContactSection.tsx` | 1 | insert `contatos` (form público) |
| pendente | `pages/equipe/EquipeNovaTarefa.tsx` | 1 | insert `tasks` |
| pendente | `pages/equipe/EquipeRotinas.tsx` | 2 | select `profiles_safe` + insert `routines` |
| pendente | `pages/equipe/EquipeSprints.tsx` | 3 | 2 select + insert `sprints` |
| pendente | `pages/equipe/EquipeControleAcessos.tsx` | 6 | 2 select + insert/update/delete `catalog_clients` |
| pendente | `pages/gestao/GestaoNovidades.tsx` | 4 | insert/update/delete/update `novidades` |
| pendente | `pages/gerencial/desempenho/DesempenhoDecisoes.tsx` | 2 | select + update `metas` |

### 1c. Cluster correcoes-sped — **1 hook** (`useCorrecoesSped.ts` já existe → estender)

| Status | Arquivo | Ocorr. | Ops (tabela `efd_correcoes`) |
|---|---|---:|---|
| feito (Onda 2) | `components/equipe/dev/correcoes-sped/CorrecoesActionButtons.tsx` | 1 | delete (limpar) |
| feito (Onda 2) | `components/equipe/dev/correcoes-sped/TabD100.tsx` | 3 | update + insert |
| feito (Onda 2) | `components/equipe/dev/correcoes-sped/TabF100.tsx` | 3 | update + insert |
| feito (Onda 2) | `components/equipe/dev/correcoes-sped/TabF120.tsx` | 2 | update + insert |
| feito (Onda 2) | `components/equipe/dev/correcoes-sped/TabF130.tsx` | 2 | update + insert |

### 1d. Cluster perdcomp (não-god) — **1 hook de domínio** (`per`, `per_situacao`, `dcomp`)

| Status | Arquivo | Ocorr. | Ops |
|---|---|---:|---|
| feito (Onda 2) | `components/equipe/dev/perdcomp/CargaPerdcompCSV.tsx` | 3 | upsert `per` + insert `per_situacao`/`dcomp` |
| feito (Onda 2) | `components/equipe/dev/perdcomp/PerFormModal.tsx` | 3 | insert `per` + `per_situacao` (x2) |
| feito (Onda 2) | `components/equipe/dev/perdcomp/SituacaoFormModal.tsx` | 1 | insert `per_situacao` |

---

## Fase 2 — God-components (T4 absorvido por T5→T6; 1 arquivo/sessão + `/verify` + `/code-review`)

Ordem = maior→menor peso de contexto. Fazer o **primeiro como padrão de referência**.

| Ordem | Status | Arquivo | Linhas | Ocorr. | Ops |
|---:|---|---|---:|---:|---|
| 1 | pendente | `pages/equipe/EquipeProjetos.tsx` | 2.296 | 3 | insert `projects`(x2)/`processes` |
| 2 | pendente | `pages/equipe/EquipeProcessos.tsx` | 1.586 | 1 | insert `processes` |
| 3 | pendente | `pages/equipe/dev/ProcessoDifal.tsx` | 1.263 | 1 | delete `difal_decisao` |
| 4 | pendente | `pages/equipe/EquipeKanban.tsx` | 1.259 | 5 | select (load inicial) |
| 5 | pendente | `pages/equipe/dev/ControlePerdcomp.tsx` | 1.172 | 2 | select `cliente`/`per_situacao` (tenancy!) |
| 6 | pendente | `components/equipe/dev/perdcomp/PerDetailModal.tsx` | 1.154 | 2 | insert `per_situacao` + update `per` |
| 7 | pendente | `components/equipe/dev/perdcomp/DcompFormModal.tsx` | 981 | 4 | select + delete + insert `distribuicao_dcomp`/`dcomp` |
| 8 | pendente | `pages/equipe/EquipeDemandas.tsx` | 916 | 3 | insert `routines`/`demand_items` + delete |
| 9 | pendente | `pages/equipe/dashboards/AnaliseInteligente.tsx` | 812 | 6 | select (dashboard) |

> Itens 5/6/7 (perdcomp) compartilham o hook de domínio criado na Fase 1d — coordenar.

---

## Loop por unidade (recap do método)

1. Ler só o arquivo-alvo + este ledger.
2. Extrair query/mutation → `src/hooks/useDomain*.ts` (React Query), preservar filtros/auditoria.
3. `typecheck`/`build` → `/verify` (comportamento idêntico) → tests se houver.
4. `/code-review` (foco: auditoria, tenancy, RLS).
5. Commit → atualizar Status neste ledger.
