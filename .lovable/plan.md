

## Correção do fluxo de edição no NcmRegrasModal

### Alteração

**1 arquivo:** `src/components/equipe/dev/pis-cofins/NcmRegrasModal.tsx`

Na função `openEdit` (linha 133), trocar `setFormMode('view')` para `setFormMode('edit')`. O card colapsável já serve como visualização, então o botão "Editar" deve abrir o sheet direto em modo de edição.

