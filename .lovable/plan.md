

# Filtro de visibilidade por cluster — Plano de implementação

## Estado atual

| Arquivo | Tem `useAllActiveClusters`? | Tem `clusterMap`? | Tem coluna Cluster? | Tem filtro cluster? |
|---|---|---|---|---|
| GestaoChamados | Sim | Sim | Sim | **Não** |
| EquipeChamados | Sim | Sim | Sim | **Não** |
| AdminChamados | **Não** | **Não** | **Não** | **Não** |

## Alterações

### 1. `GestaoChamados.tsx`
- Adicionar `cluster: 'todos'` ao state `filters` (L105-111)
- Adicionar Select "Cluster" na grid de filtros (depois do filtro de Área, L427-440)
- Adicionar filtro no `filteredAndSortedTickets`: `if (filters.cluster !== 'todos') filtered = filtered.filter(t => t.cluster_id === filters.cluster)` (após L167)
- Incluir `cluster: 'todos'` no reset implícito (se houver)

### 2. `EquipeChamados.tsx`
- Importar `useUserEstrutura` de `@/hooks/useUserEstrutura`
- Obter clusters do usuário logado: `const { clusters: userClusters } = useUserEstrutura()`
- Inicializar `cluster` no state: se `userClusters.length === 1` → default ao ID do cluster; senão `'todos'`
- Adicionar Select "Cluster" nos filtros (após Área, L423-436):
  - Se `canAssignTickets` (líder/admin): mostrar todos os clusters via `clustersData`
  - Se membro normal: mostrar apenas `userClusters` no dropdown
- Adicionar filtro no `filteredAndSortedTickets` (após L236)
- Incluir `cluster` no `resetFilters` (L317-326) — resetar para o cluster do usuário se tiver 1, senão `'todos'`

### 3. `AdminChamados.tsx`
- Importar `useAllActiveClusters` de `@/hooks/useEstruturaAreas`
- Criar `clusterMap` (mesmo padrão dos outros)
- Adicionar `cluster: 'todos'` ao state `filters` (L131-138)
- Adicionar Select "Cluster" na segunda row de filtros (L435-487, entre Departamento e ID)
- Adicionar filtro no `filteredAndSortedTickets` (após L213)
- Adicionar coluna "Cluster" na tabela (após Departamento, L539-547)
- Renderizar valor na TableBody (após L634)
- Incluir `cluster: 'todos'` no `resetFilters` (L337-346)

## Arquivos editados
| Arquivo | Mudança |
|---|---|
| `src/pages/gestao/GestaoChamados.tsx` | +filtro cluster no state, UI e lógica |
| `src/pages/equipe/EquipeChamados.tsx` | +import useUserEstrutura, pré-filtro por cluster do usuário, dropdown condicional |
| `src/pages/admin/AdminChamados.tsx` | +import clusters, clusterMap, filtro, coluna, dropdown |

**0 hooks novos, 0 migrations, 3 arquivos editados.**

