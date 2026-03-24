

## Fase 4 — Extração de 5 Componentes de Aba

Extrair os 5 `TabsContent` do `NewClientModal.tsx` (3.410 linhas) para componentes em `src/components/equipe/client-form/`. O modal final fica com ~350 linhas.

---

### Boundary Map

```text
ClienteTab:        lines 765–919    (~155 lines)
ContribuintesTab:  lines 921–1915   (~995 lines)
ParticipantesTab:  lines 1917–2305  (~389 lines)
ContratosTab:      lines 2307–3186  (~880 lines)
FaturamentoTab:    lines 3188–3282  (~95 lines)
```

---

### 4.1 — `FaturamentoTab.tsx` (~95 lines)

Read-only component. No internal state or handlers.

**Props:**
```typescript
interface FaturamentoTabProps {
  entities: DraftEntity[];
}
```

Extracts lines 3188–3282 verbatim.

---

### 4.2 — `ClienteTab.tsx` (~160 lines)

Form fields for client data. No internal state or handlers.

**Props:**
```typescript
interface ClienteTabProps {
  clientData: ReturnType<typeof defaultClientData>;
  setClientData: React.Dispatch<SetStateAction<typeof clientData>>;
  isReadOnly: boolean;
  setoresCliente: SetorCliente[];
}
```

Extracts lines 765–919.

---

### 4.3 — `ParticipantesTab.tsx` (~390 lines)

**Moves INTO component** from NewClientModal:
- States: `expandedParticipantId`, `editingParticipantId`, `editingParticipantData` (lines 108–110)
- Handlers: `addParticipant`, `startEditParticipant`, `cancelEditParticipant`, `saveEditParticipant` (lines 433–553)

**Props:**
```typescript
interface ParticipantesTabProps {
  participants: DraftParticipant[];
  setParticipants: Dispatch<SetStateAction<DraftParticipant[]>>;
  draftParticipant: Partial<DraftParticipant>;
  setDraftParticipant: Dispatch<SetStateAction<Partial<DraftParticipant>>>;
  isReadOnly: boolean;
}
```

---

### 4.4 — `ContribuintesTab.tsx` (~1000 lines)

The largest tab — entity list + new form + inline edit + inscricoes estaduais.

**Moves INTO component** from NewClientModal:
- States: `expandedEntityId`, `editingEntityId`, `editingEntityData` (lines 104–106)
- Handlers: `addEntity`, `startEditEntity`, `cancelEditEntity`, `saveEditEntity`, `handleCopyFirstAddress` (lines 342–593)
- CNPJ/CEP wrapper calls (lines 339–340, 512–513)

**Props:**
```typescript
interface ContribuintesTabProps {
  entities: DraftEntity[];
  setEntities: Dispatch<SetStateAction<DraftEntity[]>>;
  draftEntity: Partial<DraftEntity>;
  setDraftEntity: Dispatch<SetStateAction<Partial<DraftEntity>>>;
  inscricoesMap: Record<string, InscricaoIE[]>;
  setInscricoesMap: Dispatch<SetStateAction<Record<string, InscricaoIE[]>>>;
  draftInscricoes: InscricaoIE[];
  setDraftInscricoes: Dispatch<SetStateAction<InscricaoIE[]>>;
  cnpjLoading: boolean;
  cepLoading: boolean;
  cnpjLookup: (value: string, setter: any) => Promise<void>;
  cepLookup: (value: string, setter: any) => Promise<void>;
  isReadOnly: boolean;
}
```

---

### 4.5 — `ContratosTab.tsx` (~880 lines)

**Moves INTO component** from NewClientModal:
- States: `expandedContractId`, `editingContractId`, `editingContractData` (lines 112–114)
- States: `osClusterFilter`, `osEditClusterFilter`, `isAddingContract` (lines 77, 236–237)
- Memos: `filteredCatalogProducts`, `filteredEditCatalogProducts` (lines 239–247)
- Handlers: `addContract`, `startEditContract`, `cancelEditContract`, `saveEditContract` (lines 479–571)

**Props:**
```typescript
interface ContratosTabProps {
  contracts: DraftContract[];
  setContracts: Dispatch<SetStateAction<DraftContract[]>>;
  draftContract: DraftOrdemServico;
  setDraftContract: Dispatch<SetStateAction<DraftOrdemServico>>;
  isReadOnly: boolean;
  produtoSegmentoFullOptions: Array<{id: string; codigo: string; nome: string; is_active: boolean; cluster_id: string | null; estrutura_clusters: {name: string} | null}>;
  allClusters: Array<{id: string; name: string}>;
  CENTRO_CUSTO_OPTIONS: Array<{id: string; codigo: string; nome: string; label: string}>;
  SITUACAO_PROJETO_OPTIONS: Array<{value: string; label: string}>;
}
```

---

### NewClientModal.tsx (~350 lines final)

**Keeps:**
- Imports of hooks + 5 tab components
- State: `activeTab`, `showExitConfirm`, `showDraftWarning`, `showDuplicateConfirm`, data lists (`clientData`, `entities`, `participants`, `contracts`, `inscricoesMap`, drafts)
- Hooks: `useClientFormOptions`, `useClientEditData`, `useExternalConsults`, `useSaveClientTransaction`, `useSetoresCliente`, `useDraftPersistence`
- Draft detection, unsaved changes, beforeunload, tab navigation
- `handleSave`, `resetAndClose`, `handleAttemptClose`
- Dialog shell + Tabs wrapper + ScrollArea + Footer + 3 AlertDialogs

**Removes:**
- All inline expand/edit states (lines 104–114) — moved to tabs
- `isAddingContract`, `osClusterFilter`, `osEditClusterFilter`, `filteredCatalogProducts`, `filteredEditCatalogProducts` — moved to ContratosTab
- All CRUD handlers: `addEntity`, `addParticipant`, `addContract`, `startEdit*`, `cancelEdit*`, `saveEdit*`, `handleCopyFirstAddress`, CNPJ/CEP wrappers (lines 335–593)
- All 5 TabsContent JSX blocks (lines 765–3282)

**Removes unused imports:**
- `Badge`, `Checkbox`, `Textarea`, `RequiredMark`, `Select*`, `Switch`, `Calendar`, `Popover*`, `format`, `parseDate`, `cn` (where only used in tabs)
- Icons: `Building2`, `Pencil`, `Trash2`, `Search`, `ChevronDown`, `Save`, `Copy`, `CalendarIcon`, `Tag`
- `formatCpfCnpj`, `formatCep`, `formatPhone`, `formatCurrencyDisplay`, `isoToMasked`, `SITUACAO_PROJETO_OPTIONS`, `UF_STATES`, `TIPO_PARTICIPANTE_OPTIONS`
- `DateFieldWithInput`, `CurrencyField`, `FieldPair`

**Each TabsContent becomes:**
```tsx
<TabsContent value="cliente" className="mt-0 p-3 md:p-4">
  <ClienteTab clientData={clientData} setClientData={setClientData} isReadOnly={isReadOnly} setoresCliente={setoresCliente} />
</TabsContent>
```

---

### Files Summary

| File | Action | Lines |
|---|---|---|
| `client-form/FaturamentoTab.tsx` | Create | ~95 |
| `client-form/ClienteTab.tsx` | Create | ~160 |
| `client-form/ParticipantesTab.tsx` | Create | ~390 |
| `client-form/ContribuintesTab.tsx` | Create | ~1000 |
| `client-form/ContratosTab.tsx` | Create | ~880 |
| `NewClientModal.tsx` | Rewrite | ~350 |

### Validation

- Zero visual/functional changes
- All CRUD handlers live inside their respective tab component
- Props with typed exported interfaces
- Build compiles without errors

