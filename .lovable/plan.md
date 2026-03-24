

## Fase 3 — Extração de Hooks Especializados

### Resumo

Extrair 4 custom hooks do `NewClientModal.tsx`, movendo queries, mutations, consultas externas e lógica de persistência para `src/hooks/`. Redução estimada de ~700 linhas no componente. Zero alteração visual/funcional.

---

### 3.1 — `src/hooks/useClientFormOptions.ts`

**Extrair do NewClientModal.tsx** (linhas 227–336):

Todas as 6 queries de dropdown + 3 memos derivados:
- `useQuery["user-roles-lider"]` → userRoles
- `useQuery["profiles-all"]` → profiles (de `profiles_safe`)
- `useQuery["servicos_prestados_services"]` → catalogServices
- `useQuery["estrutura_clusters_for_os_filter"]` → allClusters
- `useQuery["produto_segmento"]` → produtoSegmentoOptions
- `useQuery["centros_custo_options"]` → CENTRO_CUSTO_OPTIONS
- `useQuery["produto_segmento_full"]` → produtoSegmentoFullOptions
- `useMemo` → PRODUTO_SEGMENTO_OPTIONS (com fallback "Outro")
- `useMemo` → lideres (join userRoles + profiles)

**Retorna:**
```typescript
{
  catalogServices, allClusters,
  PRODUTO_SEGMENTO_OPTIONS, CENTRO_CUSTO_OPTIONS,
  produtoSegmentoFullOptions, lideres
}
```

**Nota:** `filteredCatalogProducts` e `filteredEditCatalogProducts` dependem de estado local (`osClusterFilter`) e permanecem no componente.

---

### 3.2 — `src/hooks/useClientEditData.ts`

**Extrair do NewClientModal.tsx** (linhas 399–548):

O `useEffect` de carregamento de dados existentes quando `editingClienteId` está definido:
- Carrega cliente, contribuintes, inscrições estaduais, participantes, OS + distribuição de receita
- Mapeia para tipos `DraftEntity[]`, `DraftParticipant[]`, `DraftOrdemServico[]`

**Interface do hook:**
```typescript
function useClientEditData(
  open: boolean,
  editingClienteId: string | null | undefined,
  setters: {
    setClientData, setEntities, setParticipants,
    setContracts, setInscricoesMap
  }
): { loadingEdit: boolean }
```

Os setters são passados como parâmetro para o hook preencher os estados do componente. O hook encapsula todo o fetch e mapeamento.

---

### 3.3 — `src/hooks/useExternalConsults.ts`

**Extrair do NewClientModal.tsx** (linhas 566–848):

4 funções de consulta externa + 2 estados de loading:
- `handleCnpjBlur` (BrasilAPI CNPJ) — recebe setter `setDraftEntity`
- `handleCepBlur` (ViaCEP) — recebe setter `setDraftEntity`
- `handleInlineCnpjBlur` — recebe setter `setEditingEntityData`
- `handleInlineCepBlur` — recebe setter `setEditingEntityData`
- Estados: `cnpjLoading`, `cepLoading`

**Interface do hook:**
```typescript
function useExternalConsults(): {
  handleCnpjBlur: (value: string, setter: React.Dispatch<...>) => Promise<void>;
  handleCepBlur: (value: string, setter: React.Dispatch<...>) => Promise<void>;
  cnpjLoading: boolean;
  cepLoading: boolean;
}
```

As funções inline e draft usam o mesmo setter pattern, diferindo apenas no target setter. Unificar: cada função recebe o setter como parâmetro.

---

### 3.4 — `src/hooks/useSaveClientTransaction.ts`

**Extrair do NewClientModal.tsx** (linhas 933–1295):

Toda a lógica de persistência:
- `handleSave()` (verificação de drafts pendentes)
- `executeSave()` (validação, persistência sequencial, rollback)
- `syncCadastrosToDW` (mover da linha 76–87 do componente para dentro deste hook)
- Audit logs via `useAuditLog` (embutido)
- Invalidação de queries via `queryClient`
- `window.confirm` (linha 986) → substituir por callback `onDuplicateConfirm` que o componente fornece via AlertDialog

**Interface do hook:**
```typescript
function useSaveClientTransaction(params: {
  clientData; entities; participants; contracts; inscricoesMap;
  isEditing: boolean;
  editingClienteId?: string;
  setoresCliente: SetorCliente[];
  getDraftPendingTabs: () => string[];
  onDuplicateFound: (name: string) => Promise<boolean>; // substitui window.confirm
  onSuccess: () => void; // chama resetAndClose
}): {
  handleSave: () => void;
  executeSave: () => Promise<void>;
  saving: boolean;
}
```

**Mudança de `window.confirm`**: O hook recebe `onDuplicateFound` (callback async que retorna boolean). No componente, esse callback abre um AlertDialog controlado por estado e resolve uma Promise quando o usuário confirma/cancela. Assim eliminamos `window.confirm` sem alterar o fluxo.

---

### Alteração no NewClientModal.tsx

- Remover: todas as 6 queries, 3 memos, useEffect de edit, 4 funções de consulta externa, toda a lógica de `executeSave`/`handleSave`, `syncCadastrosToDW`, estados `saving`/`loadingEdit`/`cnpjLoading`/`cepLoading`
- Adicionar imports dos 4 hooks
- Adicionar estado `showDuplicateConfirm` + `duplicateName` + `pendingDuplicateResolve` para o AlertDialog que substitui `window.confirm`
- Adicionar AlertDialog no JSX para confirmação de duplicata

---

### Arquivos resultantes

| Arquivo | Ação | Linhas aprox. |
|---|---|---|
| `src/hooks/useClientFormOptions.ts` | **Criar** | ~80 |
| `src/hooks/useClientEditData.ts` | **Criar** | ~170 |
| `src/hooks/useExternalConsults.ts` | **Criar** | ~80 |
| `src/hooks/useSaveClientTransaction.ts` | **Criar** | ~320 |
| `src/components/equipe/NewClientModal.tsx` | **Alterar** | ~3.350 (−700) |

### Validação

- Build deve compilar sem erros
- Nenhuma alteração visual/funcional
- `window.confirm` substituído por AlertDialog controlado
- `syncCadastrosToDW` movido para `useSaveClientTransaction`
- Todas as mutations com audit log dentro do hook

