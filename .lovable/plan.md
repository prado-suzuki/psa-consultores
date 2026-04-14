

# Roteamento automático de chamados por cluster

## Pré-requisitos confirmados
- `tickets.cluster_id` (uuid, nullable) — já existe no banco
- `representante.user_id` — já existe e preenchido
- `cliente_clusters` — tabela N:N funcional
- `estrutura_clusters` — tem `id`, `name`

## Arquivos e alterações

### 1. Novo: `src/hooks/useClienteClusters.ts`
Hook que busca clusters do cliente logado:
```
representante (user_id = auth.uid()) → id_cliente
cliente_clusters (cliente_id) → cluster_id
estrutura_clusters (id) → name
```
Retorna `{ clusters: { id, name }[], clienteId: string | null, isLoading }`.

### 2. `src/pages/cliente/NovoChamado.tsx`
- Importar `useClienteClusters`
- Lógica condicional:
  - 0 clusters → campo oculto, `cluster_id` fica `null`
  - 1 cluster → auto-preenchido, exibe texto informativo "Empresa: X", sem select
  - 2+ clusters → select obrigatório "Para qual empresa é o chamado?"
- Adicionar `cluster_id` ao state do form
- Passar `cluster_id` ao `useCreateTicketCliente`

### 3. `src/hooks/useCreateTicket.ts`
- `CreateTicketClienteParams`: adicionar `cluster_id?: string | null`
- `useCreateTicketCliente` mutationFn: incluir `cluster_id` no `insertPayload` se presente
- `CreateTicketGestaoParams`: adicionar `cluster_id?: string | null`
- `useCreateTicketGestao` mutationFn: incluir `cluster_id` no `insertPayload` se presente

### 4. `src/components/gestao/CreateTicketDialog.tsx`
- Derivar `cluster_id` do `estrutura_area_id` selecionado usando `filteredAreas` (que já tem `cluster_id` no tipo `TicketArea`)
- No `handleSubmit`, resolver: `const selectedArea = filteredAreas.find(a => a.id === formData.estrutura_area_id); cluster_id = selectedArea?.cluster_id`
- Passar ao `createTicket.mutateAsync`

### 5. `src/hooks/useTickets.ts`
- `useTicketsList`: adicionar `cluster_id` ao select string
- `TicketListItem`: adicionar `cluster_id?: string | null`
- `TicketDetail`: adicionar `cluster_id?: string | null`

### 6. `src/pages/gestao/GestaoChamados.tsx`
- Buscar clusters com query simples (ou reutilizar dados já disponíveis via `useAllActiveAreas` → mapear `cluster_id` → nome)
- Adicionar coluna "Cluster" na tabela, read-only, com lookup de nome via `estrutura_clusters`
- Novo hook inline ou query: buscar `estrutura_clusters` para montar `clusterMap`

### 7. `src/pages/equipe/EquipeChamados.tsx`
- Mesmo padrão: adicionar coluna "Cluster" read-only na tabela
- Reutilizar o mesmo `clusterMap`

## Hook auxiliar para clusters (listagem)
Para evitar queries inline nos componentes de listagem, criar `useAllActiveClusters` em `useEstruturaAreas.ts` (arquivo já tem `useAllActiveAreas`):
```ts
export const useAllActiveClusters = () => useQuery({
  queryKey: ['estrutura-clusters', '__all__'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('estrutura_clusters')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data || [];
  },
});
```

## Resumo de impacto

| Arquivo | Ação |
|---|---|
| **Novo**: `src/hooks/useClienteClusters.ts` | Hook para clusters do cliente logado |
| `src/hooks/useEstruturaAreas.ts` | Adicionar `useAllActiveClusters` |
| `src/hooks/useCreateTicket.ts` | `cluster_id` nos params e payloads |
| `src/hooks/useTickets.ts` | `cluster_id` no select e tipos |
| `src/pages/cliente/NovoChamado.tsx` | Select condicional de cluster |
| `src/components/gestao/CreateTicketDialog.tsx` | Derivar cluster_id da área |
| `src/pages/gestao/GestaoChamados.tsx` | Coluna Cluster |
| `src/pages/equipe/EquipeChamados.tsx` | Coluna Cluster |

**0 migrations** (coluna já existe), **1 hook novo**, **1 hook adicionado a arquivo existente**, **6 arquivos editados**.

