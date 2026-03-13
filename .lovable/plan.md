

# Plano — Fase 6.7: Extração da Aba "Contratos / OS" (ContratosTab)

## Escopo

Linhas **1044–1923** (~880 linhas). Última aba inline do modal. Contém:
- Lista expansível de OS com visualização read-only e edição inline (datas, valores, serviço, distribuição de receita)
- Formulário "Nova OS" com campos idênticos + auto-geração de número
- Seleção de Serviço Contratado agrupado por cluster/empresa
- Distribuição de Receita (centros de custo com soma = 100%)
- Observações (Textarea)

## Estados (permanecem no pai)

| Estado | Tipo |
|--------|------|
| `contracts` / `setContracts` | `DraftContract[]` |
| `draftContract` / `setDraftContract` | `{ ordem_servico, data_*, valor_*, situacao_projeto, observacoes_projeto, id_servico, id_produto_segmento, distribuicao_receita }` |
| `expandedContractId` / `setExpandedContractId` | `number \| null` |
| `editingContractId` | `number \| null` |
| `editingContractData` / `setEditingContractData` | `Partial<DraftContract> \| null` |
| `isAddingContract` | `boolean` |
| `osClusterFilter` / `setOsClusterFilter` | `string` |
| `osEditClusterFilter` / `setOsEditClusterFilter` | `string` |

## Handlers (permanecem no pai)

| Handler | Descrição |
|---------|-----------|
| `addContract()` | Valida serviço, gera número OS, push na lista |
| `startEditContract()` | Inicia edição inline |
| `cancelEditContract()` | Cancela edição |
| `saveEditContract()` | Salva edição inline |

## Dados de dicionário necessários (passados via props)

- `catalogServices` — lista de serviços (já filtrados por cluster)
- `filteredCatalogServices` — serviços filtrados pelo `osClusterFilter` (draft)
- `filteredEditCatalogServices` — serviços filtrados pelo `osEditClusterFilter` (edição)
- `allClusters` — lista de clusters para o filtro de empresa
- `produtoSegmentoFullOptions` — opções de produto/segmento
- `CENTRO_CUSTO_OPTIONS` — centros de custo para distribuição de receita

## Utilitários reutilizados

- `DateFieldWithInput`, `CurrencyField` de `./client-form/`
- `SITUACAO_PROJETO_OPTIONS`, `isoToMasked` de `./client-form/constants`
- `FieldPair` — definido localmente (duplicado, 3 linhas)
- `formatCurrencyDisplay` — função simples, será passada via props ou definida localmente

## Arquivo a Criar

**`src/components/equipe/fiscal/client-form/ContratosTab.tsx`**

### Props

```typescript
interface ContratosTabProps {
  // Dados
  contracts: DraftOrdemServico[];
  setContracts: React.Dispatch<React.SetStateAction<DraftOrdemServico[]>>;
  draftContract: Omit<DraftOrdemServico, '_id'>;
  setDraftContract: React.Dispatch<React.SetStateAction<Omit<DraftOrdemServico, '_id'>>>;
  // Expand/edit
  expandedContractId: number | null;
  setExpandedContractId: React.Dispatch<React.SetStateAction<number | null>>;
  editingContractId: number | null;
  editingContractData: Partial<DraftOrdemServico> | null;
  setEditingContractData: React.Dispatch<React.SetStateAction<Partial<DraftOrdemServico> | null>>;
  // Cluster filters
  osClusterFilter: string;
  setOsClusterFilter: React.Dispatch<React.SetStateAction<string>>;
  osEditClusterFilter: string;
  setOsEditClusterFilter: React.Dispatch<React.SetStateAction<string>>;
  // Loading
  isAddingContract: boolean;
  // Handlers
  onAdd: () => void;
  onStartEdit: (c: DraftOrdemServico) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  // Dicionários
  catalogServices: any[];
  filteredCatalogServices: any[];
  filteredEditCatalogServices: any[];
  allClusters: any[];
  produtoSegmentoFullOptions: Array<{ id: string; codigo: string; nome: string }>;
  CENTRO_CUSTO_OPTIONS: Array<{ id: string; label: string }>;
  // Config
  isReadOnly: boolean;
}
```

### Conteúdo interno

- `FieldPair` local (3 linhas)
- `formatCurrencyDisplay` local (1 linha)
- Todo o JSX das linhas 1045–1922 (lista de OS existentes + formulário de nova OS)
- Imports: `DateFieldWithInput`, `CurrencyField`, `SITUACAO_PROJETO_OPTIONS`, `isoToMasked`, UI components, ícones, `AlertDialog`, `Textarea`

## Edição em `NewClientModal.tsx`

1. **Import**:
   ```typescript
   import { ContratosTab } from "./client-form/ContratosTab";
   ```

2. **Substituir** linhas 1044–1923 por:
   ```tsx
   <TabsContent value="contratos" className="mt-0 p-3 md:p-4">
     <ContratosTab
       contracts={contracts}
       setContracts={setContracts}
       draftContract={draftContract}
       setDraftContract={setDraftContract}
       expandedContractId={expandedContractId}
       setExpandedContractId={setExpandedContractId}
       editingContractId={editingContractId}
       editingContractData={editingContractData}
       setEditingContractData={setEditingContractData}
       osClusterFilter={osClusterFilter}
       setOsClusterFilter={setOsClusterFilter}
       osEditClusterFilter={osEditClusterFilter}
       setOsEditClusterFilter={setOsEditClusterFilter}
       isAddingContract={isAddingContract}
       onAdd={addContract}
       onStartEdit={startEditContract}
       onCancelEdit={cancelEditContract}
       onSaveEdit={saveEditContract}
       catalogServices={catalogServices}
       filteredCatalogServices={filteredCatalogServices}
       filteredEditCatalogServices={filteredEditCatalogServices}
       allClusters={allClusters}
       produtoSegmentoFullOptions={produtoSegmentoFullOptions}
       CENTRO_CUSTO_OPTIONS={CENTRO_CUSTO_OPTIONS}
       isReadOnly={isReadOnly}
     />
   </TabsContent>
   ```

3. **Limpeza**: Remover `FieldPair`, `formatCurrencyDisplay` e `Textarea` do modal se não forem mais usados. Verificar ícones `Tag`, `CheckCircle2` etc.

## Resultado

- ~880 linhas removidas do modal (de ~2040 para ~1160)
- O modal se torna um orquestrador limpo: estados, handlers e navegação entre abas
- Todas as 5 abas agora são componentes isolados na pasta `client-form/`
- Zero mudança visual ou comportamental

