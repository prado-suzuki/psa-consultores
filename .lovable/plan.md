

## Plano: Multi-select de clusters + Filtro de usuários nas tarefas Tax

### Parte A — Multi-select de clusters no cadastro de cliente

**7 arquivos editados, 0 migrations**

#### 1. `src/components/equipe/client-form/constants.ts`
- Adicionar `cluster_ids: [] as string[]` ao `defaultClientData` (linha 166)

#### 2. `src/components/equipe/client-form/ClienteTab.tsx`
- Adicionar props: `allClusters` (array `{id, name}`) e `clusterIds`/`setClusterIds`
- Inserir campo multi-select entre "Tipo de relacionamento" (linha 103) e "Área do negócio" (linha 105)
- Implementar como Popover + Command (padrão shadcn multi-select): trigger mostra badges dos clusters selecionados, dropdown com checkboxes
- Toggle individual no array `clusterIds`

#### 3. `src/components/equipe/NewClientModal.tsx`
- Adicionar state `clusterIds: string[]` (inicializado `[]`)
- Passar `allClusters`, `clusterIds`, `setClusterIds` para `ClienteTab` (linha 260)
- Incluir `clusterIds` no snapshot de unsaved changes e draft persistence
- Passar `clusterIds` para `useSaveClientTransaction`
- No `resetAndClose`, resetar `clusterIds` para `[]`

#### 4. `src/hooks/useClientEditData.ts`
- Após carregar dados do cliente, buscar `cliente_clusters` filtrado por `cliente_id` do editando
- Extrair array de `cluster_id` e chamar `setClusterIds` (novo setter a adicionar na interface `Setters`)

#### 5. `src/hooks/useSaveClientTransaction.ts`
- Receber `clusterIds: string[]` nos params
- Após persistir o cliente (insert ou update), fazer upsert incremental em `cliente_clusters`:
  - Buscar registros existentes: `SELECT cluster_id FROM cliente_clusters WHERE cliente_id = ?`
  - INSERT para `clusterIds` que não existem no banco
  - DELETE para registros no banco que não estão em `clusterIds`
- Usar `as any` cast para `cliente_clusters` (não está no schema tipado)

#### 6. `src/pages/equipe/fiscal/GestaoClientes.tsx`
- Na query principal de clientes filtrados (linha 157), após obter os resultados, buscar todos os `cliente_clusters` com join em `estrutura_clusters` para os IDs retornados
- Adicionar coluna "Clusters" no `TableHeader` (após "Setor", antes de "Ações")
- Renderizar badges com nomes dos clusters ou "—" se vazio
- Atualizar `totalCols`

#### 7. `src/hooks/useTaxReferenceData.ts` — `useTeamMembersForTasks()`
- Alterar a query (linha 184) para:
  1. Buscar `user_id` de `user_roles` com `role IN ('team_member', 'sublider', 'lider', 'admin')`
  2. Deduplicate com `Set`
  3. Buscar `profiles_safe` filtrado por esses IDs com `.in('id', allowedIds)`
- Manter o `queryKey` atualizado

### Nenhuma alteração em RLS, tabelas, rotas ou schema.

