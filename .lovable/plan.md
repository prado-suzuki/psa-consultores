

# Plano — Fase 6.5: Extração da Aba "Participantes" (ParticipantesTab)

## Escopo

A aba ocupa as **linhas 1991–2379** (~388 linhas de JSX). Diferente das abas anteriores, esta possui interação significativa: formulário de criação, lista expansível com visualização/edição inline, validações e máscaras.

## Estado Envolvido (permanece no pai)

- `participants` / `setParticipants` — lista principal
- `draftParticipant` / `setDraftParticipant` — rascunho do novo participante
- `expandedParticipantId` / `setExpandedParticipantId` — controle de accordion
- `editingParticipantId` / `setEditingParticipantId` — qual está em edição inline
- `editingParticipantData` / `setEditingParticipantData` — dados temporários da edição

## Handlers (permanece no pai, passados via props)

- `addParticipant()` — validação + push na lista (linhas 536–579)
- `startEditParticipant(p)` — inicia edição inline (692–695)
- `cancelEditParticipant()` — cancela edição (696–699)
- `saveEditParticipant()` — salva edição inline (700–710)

## Arquivo a Criar

**`src/components/equipe/fiscal/client-form/ParticipantesTab.tsx`**

### Props

```typescript
interface ParticipantesTabProps {
  participants: DraftParticipant[];
  setParticipants: React.Dispatch<React.SetStateAction<DraftParticipant[]>>;
  draftParticipant: Omit<DraftParticipant, '_id'>;
  setDraftParticipant: React.Dispatch<React.SetStateAction<Omit<DraftParticipant, '_id'>>>;
  expandedParticipantId: number | null;
  setExpandedParticipantId: React.Dispatch<React.SetStateAction<number | null>>;
  editingParticipantId: number | null;
  editingParticipantData: Partial<DraftParticipant> | null;
  setEditingParticipantData: React.Dispatch<React.SetStateAction<Partial<DraftParticipant> | null>>;
  onAdd: () => void;
  onStartEdit: (p: DraftParticipant) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  isReadOnly: boolean;
}
```

### Imports próprios
- `DraftParticipant` de `@/types/clientForm`
- `TIPO_PARTICIPANTE_OPTIONS`, `formatPhone` de `./constants`
- UI: `Input`, `Label`, `Select*`, `Switch`, `Textarea`, `Button`, `Badge`, `RequiredMark`
- `AlertDialog*` do shadcn
- Ícones: `Pencil`, `Trash2`, `ChevronDown`, `Save`
- `cn` de `@/lib/utils`

### `FieldPair` interno
O helper `FieldPair` (3 linhas) será definido localmente dentro deste componente (também é usado na aba contratos, mas duplicar 3 linhas é preferível a criar um export extra neste momento).

## Edição em `NewClientModal.tsx`

1. **Adicionar import**:
   ```typescript
   import { ParticipantesTab } from "./client-form/ParticipantesTab";
   ```

2. **Substituir** linhas 1991–2379 por:
   ```tsx
   <TabsContent value="participantes" className="mt-0 p-3 md:p-4">
     <ParticipantesTab
       participants={participants}
       setParticipants={setParticipants}
       draftParticipant={draftParticipant}
       setDraftParticipant={setDraftParticipant}
       expandedParticipantId={expandedParticipantId}
       setExpandedParticipantId={setExpandedParticipantId}
       editingParticipantId={editingParticipantId}
       editingParticipantData={editingParticipantData}
       setEditingParticipantData={setEditingParticipantData}
       onAdd={addParticipant}
       onStartEdit={startEditParticipant}
       onCancelEdit={cancelEditParticipant}
       onSaveEdit={saveEditParticipant}
       isReadOnly={isReadOnly}
     />
   </TabsContent>
   ```

3. **Limpeza de imports**: verificar se `Textarea` ainda é usada em outro ponto do modal; caso contrário, remover do import principal.

## Resultado

- ~388 linhas removidas do modal
- 1 novo componente na pasta `client-form/`
- Handlers e validações permanecem no orquestrador
- Zero mudança visual ou comportamental

