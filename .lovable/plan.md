

## Etapa 2 — Frontend: participante → representante

O SQL já foi executado. Atualizar 9 arquivos do frontend.

---

### 1. `src/types/clientForm.ts`
- Renomear `DraftParticipant` → `DraftRepresentante`, campo `tipo_participante` → `tipo_representante`
- Adicionar alias: `/** @deprecated */ export type DraftParticipant = DraftRepresentante;`

### 2. `src/components/equipe/client-form/constants.ts`
- `TIPO_PARTICIPANTE_OPTIONS` → `TIPO_REPRESENTANTE_OPTIONS` (manter alias deprecated)
- `createDefaultDraftParticipant` → `createDefaultDraftRepresentante`, campo `tipo_participante` → `tipo_representante` (manter alias deprecated)

### 3. Renomear `ParticipantesTab.tsx` → `RepresentantesTab.tsx`
- Import: `TIPO_PARTICIPANTE_OPTIONS` → `TIPO_REPRESENTANTE_OPTIONS`
- Import: `DraftParticipant` → `DraftRepresentante`
- Interface: `ParticipantesTabProps` → `RepresentantesTabProps`
- Refs `tipo_participante` → `tipo_representante`
- Labels: "Participante" → "Representante", "Participantes" → "Representantes", "participante" → "representante"
- Export: `ParticipantesTab` → `RepresentantesTab`

### 4. `src/components/equipe/NewClientModal.tsx`
- Import: `ParticipantesTab` → `RepresentantesTab` from `./client-form/RepresentantesTab`
- Import: `createDefaultDraftParticipant` → `createDefaultDraftRepresentante`
- Tab union: `"participantes"` → `"representantes"`
- All label strings: "Participantes" → "Representantes", "participantes" → "representantes"
- State refs: `draftParticipant` / `setDraftParticipant` / `hasDraftParticipantData` — rename to `draftRepresentante` / `setDraftRepresentante` / `hasDraftRepresentanteData`
- DialogDescription text updated

### 5. `src/components/equipe/client-form/HistoricoTab.tsx`
- Line 44: `participante: 'Participante'` → `representante: 'Representante'`

### 6. `src/hooks/useDevClients.ts`
- Line 12: `participanteTable` → `representanteTable = 'representante'`
- Line 117: union `'participante'` → `'representante'`
- Bottom export: `participanteTable` → `representanteTable`

### 7. `src/hooks/useClientEditData.ts`
- Line 8: `participanteTable` → `representanteTable = 'representante'`
- Line 120: `.from(participanteTable)` → `.from(representanteTable)`
- Line 128: `p.id_participante` → `p.id_representante`
- Line 130: `tipo_participante` → `tipo_representante`

### 8. `src/hooks/useSaveClientTransaction.ts`
- Line 11: `participanteTable` → `representanteTable = 'representante'`
- All `.from(participanteTable)` → `.from(representanteTable)`
- `id_participante` → `id_representante` (lines 169, 172, 174, 274, 276)
- `tipo_participante` → `tipo_representante` (line 268)
- Audit `entity_type: 'participante'` → `'representante'` (line 445)
- Log text "participantes" → "representantes" (line 471)
- Comment text updated

### 9. `src/hooks/useAuditLog.ts`
- Line 11: `'participante'` → `'representante'` in union type

### NÃO alterar
- `src/constants/efdConfig.ts` — "Participante" refere-se ao SPED fiscal
- `src/integrations/supabase/types.ts` — regenera automaticamente

**Total: 8 arquivos alterados, 1 arquivo renomeado.**

