

# Plano — Fase 6.6: Extração da Aba "Contribuintes" (ContribuintesTab)

## Escopo

Linhas **996–1990** (~994 linhas). É a maior aba do modal. Contém:
- Lista expansível de entidades com visualização read-only e edição inline
- Formulário de novo contribuinte com consultas CNPJ/CEP
- Gestão de Inscrições Estaduais (tanto no draft quanto na edição inline)
- Botão "Copiar endereço do primeiro contribuinte"

## Estados e Handlers Envolvidos

### Estados (permanecem no pai, passados via props)

| Estado | Tipo |
|--------|------|
| `entities` / `setEntities` | `DraftEntity[]` |
| `draftEntity` / `setDraftEntity` | `Partial<DraftEntity>` |
| `inscricoesMap` / `setInscricoesMap` | `Record<string, InscricaoIE[]>` |
| `draftInscricoes` / `setDraftInscricoes` | `InscricaoIE[]` |
| `expandedEntityId` / `setExpandedEntityId` | `number \| null` |
| `editingEntityId` | `number \| null` |
| `editingEntityData` / `setEditingEntityData` | `Partial<DraftEntity> \| null` |
| `cnpjLoading` | `boolean` |
| `cepLoading` | `boolean` |

### Handlers (permanecem no pai)

| Handler | Linhas |
|---------|--------|
| `addEntity()` | 446–534 |
| `handleCnpjBlur()` | 396–422 |
| `handleCepBlur()` | 425–444 |
| `handleInlineCnpjBlur()` | 616–646 |
| `handleInlineCepBlur()` | 648–671 |
| `startEditEntity()` | 673–676 |
| `cancelEditEntity()` | 677–680 |
| `saveEditEntity()` | 681–691 |
| `handleCopyFirstAddress()` | 740–758 |

### Utilitário local

`FieldPair` (linhas 732–737) — usado também na aba Contratos. Será definido localmente no novo componente (3 linhas, duplicação aceitável).

## Arquivo a Criar

**`src/components/equipe/fiscal/client-form/ContribuintesTab.tsx`**

### Props

```typescript
interface ContribuintesTabProps {
  // Dados
  entities: DraftEntity[];
  setEntities: React.Dispatch<React.SetStateAction<DraftEntity[]>>;
  draftEntity: Partial<DraftEntity>;
  setDraftEntity: React.Dispatch<React.SetStateAction<Partial<DraftEntity>>>;
  inscricoesMap: Record<string, InscricaoIE[]>;
  setInscricoesMap: React.Dispatch<React.SetStateAction<Record<string, InscricaoIE[]>>>;
  draftInscricoes: InscricaoIE[];
  setDraftInscricoes: React.Dispatch<React.SetStateAction<InscricaoIE[]>>;
  // Expand/edit
  expandedEntityId: number | null;
  setExpandedEntityId: React.Dispatch<React.SetStateAction<number | null>>;
  editingEntityId: number | null;
  editingEntityData: Partial<DraftEntity> | null;
  setEditingEntityData: React.Dispatch<React.SetStateAction<Partial<DraftEntity> | null>>;
  // Loading
  cnpjLoading: boolean;
  cepLoading: boolean;
  // Handlers
  onAdd: () => void;
  onCnpjBlur: (value: string) => void;
  onCepBlur: (value: string) => void;
  onInlineCnpjBlur: (value: string) => void;
  onInlineCepBlur: (value: string) => void;
  onStartEdit: (ent: DraftEntity) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onCopyFirstAddress: () => void;
  // Config
  isReadOnly: boolean;
}
```

### Imports próprios
- Tipos: `DraftEntity`, `InscricaoIE` de `@/types/clientForm`
- Constantes: `UF_STATES`, `formatCpfCnpj`, `formatCep`, `formatPhone` de `./constants`
- UI: `Input`, `Label`, `Select*`, `Switch`, `Button`, `Badge`
- AlertDialog completo do shadcn
- Ícones: `Plus`, `Pencil`, `Trash2`, `ChevronDown`, `Save`, `Copy`, `Loader2`, `Search`
- `cn` de `@/lib/utils`

## Edição em `NewClientModal.tsx`

1. **Adicionar import**:
   ```typescript
   import { ContribuintesTab } from "./client-form/ContribuintesTab";
   ```

2. **Substituir** linhas 996–1990 por:
   ```tsx
   <TabsContent value="contribuintes" className="mt-0 p-3 md:p-4">
     <ContribuintesTab
       entities={entities}
       setEntities={setEntities}
       draftEntity={draftEntity}
       setDraftEntity={setDraftEntity}
       inscricoesMap={inscricoesMap}
       setInscricoesMap={setInscricoesMap}
       draftInscricoes={draftInscricoes}
       setDraftInscricoes={setDraftInscricoes}
       expandedEntityId={expandedEntityId}
       setExpandedEntityId={setExpandedEntityId}
       editingEntityId={editingEntityId}
       editingEntityData={editingEntityData}
       setEditingEntityData={setEditingEntityData}
       cnpjLoading={cnpjLoading}
       cepLoading={cepLoading}
       onAdd={addEntity}
       onCnpjBlur={handleCnpjBlur}
       onCepBlur={handleCepBlur}
       onInlineCnpjBlur={handleInlineCnpjBlur}
       onInlineCepBlur={handleInlineCepBlur}
       onStartEdit={startEditEntity}
       onCancelEdit={cancelEditEntity}
       onSaveEdit={saveEditEntity}
       onCopyFirstAddress={handleCopyFirstAddress}
       isReadOnly={isReadOnly}
     />
   </TabsContent>
   ```

3. **Limpar imports**: verificar se `Copy`, `Search`, `Loader2`, `Checkbox` ainda são usados em outro ponto; se não, remover.

4. **FieldPair**: permanece definido no modal (usado pela aba Contratos que ainda está inline). Será duplicado no ContribuintesTab.

## Resultado

- ~990 linhas removidas do modal
- 1 novo componente na pasta `client-form/`
- Handlers e validações permanecem no orquestrador
- Fluxo de Inscrições Estaduais (draft + edição inline) preservado via `inscricoesMap` + `draftInscricoes`
- Zero mudança visual ou comportamental

