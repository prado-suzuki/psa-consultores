

# Plano de Ação — Fase 3: Extrair lógica de carregamento de edição para hook dedicado

## Problema

O `useEffect` das linhas 672–820 do `NewClientModal.tsx` faz 6 chamadas diretas ao Supabase (`cliente`, `contribuinte`, `inscricao_contribuinte`, `participante`, `ordem_servico`, `distribuicao_receita`), violando a regra de encapsulamento em hooks.

## Solução

### 1. Criar `src/hooks/useClientEditData.ts`

Hook que recebe `(clienteId: string | null, enabled: boolean)` e retorna os dados brutos já transformados nos formatos dos drafts do modal.

**Queries internas (todas com `enabled` controlado):**

| Query | Tabela | Retorno tipado |
|---|---|---|
| `client-edit-data` | `clienteTable` | Objeto com campos do cliente |
| `client-edit-contribuintes` | `contribuinteTable` | `DraftEntity[]` |
| `client-edit-inscricoes` | `inscricao_contribuinte` | `Record<string, InscricaoIE[]>` |
| `client-edit-participantes` | `participanteTable` | `DraftParticipant[]` |
| `client-edit-os` | `ordem_servico` + `distribuicao_receita` | `DraftOrdemServico[]` |

**Retorno do hook:**
```typescript
{
  clientData: {...} | null,
  entities: DraftEntity[],
  inscricoesMap: Record<string, InscricaoIE[]>,
  participants: DraftParticipant[],
  contracts: DraftOrdemServico[],
  isLoading: boolean,
  error: Error | null,
}
```

**Detalhes técnicos:**
- As interfaces `DraftEntity`, `DraftParticipant`, `DraftOrdemServico`, `InscricaoIE` serão **exportadas** do `NewClientModal.tsx` (ou movidas para `src/types/`) para serem reutilizadas pelo hook
- Toda a lógica de mapeamento/transformação (ex: `simples_nacional === true ? "optante" : ...`) será replicada no hook, mantendo a mesma saída
- O hook usará `useQuery` do TanStack ao invés de `useEffect` + chamadas imperativas, ganhando cache e controle de estado automático
- Roteamento de tabela por ambiente (`clienteTable`, `contribuinteTable`, `participanteTable`) mantido via `isProductionEnvironment`

### 2. Extrair tipos para `src/types/clientForm.ts`

Mover as interfaces do modal para um arquivo de tipos dedicado:
- `DraftEntity`
- `DraftParticipant`
- `DraftOrdemServico` (+ alias `DraftContract`)
- `InscricaoIE`

Isso permite que tanto o hook quanto o modal importem os mesmos tipos sem dependência circular.

### 3. Editar `NewClientModal.tsx`

- **Remover** o `useEffect` de `loadData` (linhas 672–820)
- **Remover** `setLoadingEdit` (substituído por `isLoading` do hook)
- **Adicionar** consumo do hook:
```typescript
const editData = useClientEditData(editingClienteId ?? null, open && !!editingClienteId);
```
- **Adicionar** novo `useEffect` curto que popula os estados locais quando `editData` muda:
```typescript
useEffect(() => {
  if (!editData.clientData) return;
  setClientData(editData.clientData);
  setEntities(editData.entities);
  setInscricoesMap(editData.inscricoesMap);
  setParticipants(editData.participants);
  setContracts(editData.contracts);
}, [editData]);
```
- **Substituir** referências a `loadingEdit` por `editData.isLoading`
- **Importar** tipos de `@/types/clientForm` ao invés de defini-los localmente

## Resumo de Alterações

| Ação | Arquivo |
|---|---|
| **Criar** | `src/types/clientForm.ts` |
| **Criar** | `src/hooks/useClientEditData.ts` |
| **Editar** | `src/components/equipe/fiscal/NewClientModal.tsx` (remover ~150 linhas de useEffect + tipos, adicionar ~10 linhas de consumo do hook) |

## Escopo Protegido (NÃO será tocado)

- `executeSave` e toda lógica de mutação
- Fetches de CEP/CNPJ (APIs externas)
- `useClientFormOptions` (Fase 2)
- `useDraftPersistence`
- Estados de draft, abas, unsaved changes detection
- Sub-componentes (`DateFieldWithInput`, `CurrencyField`)

