

# Plano revisado: Extração de queries inline (FiscalDashboard + GestaoClientes)

## Hooks existentes a reutilizar (sem duplicar)

| Hook | Arquivo | Reutilizar em |
|------|---------|---------------|
| `useTeamProfilesSafe()` | `useTaxReferenceData.ts` L73-85 | FiscalDashboard (query members) |
| `useContribuintes(clientId)` | `useTaxReferenceData.ts` L144+ | GestaoClientes (contribuintes-expand) |
| `useFiscalClientsList()` | `useFiscalClients.ts` | FiscalDashboard (query clients) |

## Hooks novos a criar (3 arquivos)

### 1. `src/hooks/useFiscalDashboardData.ts`
Apenas 2 hooks (profiles fica fora):
- `useFiscalDashProjects()` — `org_projects` select `id, name, status, estrutura_area_id`
- `useFiscalDashTasks()` — `fiscal_tasks` com `parent_task_id IS NULL`

### 2. `src/hooks/useGestaoClientes.ts`
- `useClientesLista()` — lista simples `id, nome` para dropdown de filtro
- `useContribuintesPorCliente(clienteId)` — contribuintes para filtro (com dedup por nome)
- `useClientesFiltrados(filters)` — query principal com filtros + enriquecimento de clusters (inclui `as any` justificado para `cliente_clusters`)
- `useContribuintesExpand(clienteId)` — contribuintes expandidos na tabela (campos: `cpf_cnpj, nome_razao_social, inscricao_estadual, simples_nacional`)

### 3. `src/hooks/useDeleteCliente.ts`
- `useDeleteCliente()` — mutation de soft-delete + invalidação de cache

**Nota:** `useContribuintes` de `useTaxReferenceData.ts` tem interface diferente (retorna `id, nome_razao_social, cpf_cnpj`, filtrado por `cliente_id` direto). Os hooks de GestaoClientes precisam de campos e lógica distintos (dedup por nome, campos expandidos), então não são duplicatas — são queries com propósitos diferentes.

## Componentes a editar

### FiscalDashboard.tsx
- Remover imports de `supabase`, `useQuery`, `currentAmbiente`
- Substituir query 1 → `useFiscalDashProjects()`
- Substituir query 2 → `useFiscalDashTasks()`
- Substituir query 3 → `useFiscalClientsList()` (já existe)
- Substituir query 4 → `useTeamProfilesSafe()` (já existe em `useTaxReferenceData.ts`)

### GestaoClientes.tsx
- Remover imports de `supabase`, `useQuery`, `useQueryClient`, `currentAmbiente`
- Substituir 5 queries inline + 1 mutação pelos hooks de `useGestaoClientes.ts` e `useDeleteCliente.ts`
- Mover `ContribuinteSubTable` para usar `useContribuintesExpand`

## Resumo
- **3 arquivos novos** (hooks)
- **2 arquivos editados** (componentes)
- **0 hooks duplicados** — reutiliza `useTeamProfilesSafe` e `useFiscalClientsList`
- **0 alterações de banco/RLS/rotas**

