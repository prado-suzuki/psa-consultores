

# Plano: Trocar dropdown "Empresa" da OS para usar `empresas_faturamento`

## Situação atual
O campo "Empresa" na aba Contratos (OS) usa `allClusters` (tabela `estrutura_clusters`) como fonte. A filtragem de serviços é feita por `catalogServices.cluster_id === selectedClusterId`.

## O que muda

### 1. `useClientFormOptions.ts` — adicionar query de empresas
Adicionar query para `empresas_faturamento` (ativas, ordenadas por nome) e retornar no hook como `empresas`.

### 2. `NewClientModal.tsx` — ajustar filtragem
- Extrair `empresas` do hook
- Passar `empresas` para `ContratosTab` no lugar de `allClusters`
- Ajustar `filteredCatalogServices` e `filteredEditCatalogServices`: ao selecionar uma empresa, filtrar os serviços cujo `cluster_id` pertence a um cluster com `empresa_id === selectedEmpresaId`. Isso requer cruzar `catalogServices[].cluster_id` com `allClusters` para achar a empresa correspondente.

### 3. `ContratosTab.tsx` — trocar prop e renderização
- Renomear prop `allClusters` → `empresas` (tipo `{id, nome}[]`)
- Nos dois `<Select>` de Empresa (draft e edit), renderizar `empresas` com `e.nome` em vez de `c.name`

### Lógica de filtragem (detalhe técnico)
```
empresa selecionada → clusters com empresa_id === empresa.id → serviços com cluster_id ∈ esses clusters
```
O `allClusters` continua sendo usado internamente no `NewClientModal` para fazer esse mapeamento, mas não é mais passado ao `ContratosTab`.

### Arquivos alterados
- `src/hooks/useClientFormOptions.ts`
- `src/components/equipe/fiscal/NewClientModal.tsx`
- `src/components/equipe/fiscal/client-form/ContratosTab.tsx`

### Sem alterações em banco de dados

