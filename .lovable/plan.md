

## Simplificar Botões do Modal de Cliente

### Alterações

**1. `NewClientModal.tsx` — Footer + limpeza**

- **Footer**: Remover Voltar/Avançar. Layout uniforme em todas as abas:
  - ReadOnly: apenas `[Fechar]` à direita
  - Edit/New: `[Cancelar]` à esquerda (outline) + `[Salvar Cliente / Salvar Alterações]` à direita (teal sólido + shadow)
- **Remover**: `handleNext`, `handleBack`, `isFirstTab`, `isLastTab`, `tabOrder`, `currentTabIndex`
- **Remover imports**: `ChevronLeft`, `ChevronRight`
- **Draft warning text**: Atualizar para "Deseja descartar e trocar de aba?" / botões "Descartar" e "Continuar editando"
- **`handleTabClick`** já intercepta troca de aba via `checkDraftAndNavigate` — mantém como está

**2. `ContribuintesTab.tsx` — Linha 391**
- `Salvar` → `Aplicar` no botão trigger
- `Salvar alterações` → `Aplicar alterações` no título do AlertDialog
- `Salvar` → `Aplicar` no botão de confirmação do AlertDialog

**3. `ParticipantesTab.tsx` — Linha 208**
- Mesmas renomeações: `Salvar` → `Aplicar`

**4. `ContratosTab.tsx` — Linha 280**
- Mesmas renomeações: `Salvar` → `Aplicar`

### Código do Footer (resultado final)

```tsx
{/* Footer */}
<div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-between items-center shrink-0">
  {isReadOnly ? (
    <>
      <div />
      <Button variant="outline" onClick={handleAttemptClose} className="border-gray-300 text-gray-600">Fechar</Button>
    </>
  ) : (
    <>
      <Button variant="outline" onClick={handleAttemptClose} className="border-gray-300 text-gray-600">Cancelar</Button>
      <Button
        onClick={handleSave} disabled={saving}
        className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-lg shadow-teal-600/20"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={20} />}
        {isEditing ? "Salvar Alterações" : "Salvar Cliente"}
      </Button>
    </>
  )}
</div>
```

### Draft Warning (texto atualizado)

```tsx
<AlertDialogTitle>Dados não adicionados à lista</AlertDialogTitle>
<AlertDialogDescription>
  Você preencheu dados em <strong>{draftWarningContext?.pendingTabs.join(", ")}</strong> que não foram adicionados à lista.
  {draftWarningContext?.action === "save"
    ? " Deseja salvar mesmo assim?"
    : " Deseja descartar e trocar de aba?"}
</AlertDialogDescription>
<AlertDialogFooter>
  <AlertDialogCancel onClick={handleDraftWarningGoBack}>Continuar editando</AlertDialogCancel>
  <AlertDialogAction onClick={handleDraftWarningContinue}>
    {draftWarningContext?.action === "save" ? "Salvar mesmo assim" : "Descartar"}
  </AlertDialogAction>
</AlertDialogFooter>
```

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `NewClientModal.tsx` | Footer simplificado, remove nav, limpa imports |
| `ContribuintesTab.tsx` | "Salvar" → "Aplicar" (3 ocorrências) |
| `ParticipantesTab.tsx` | "Salvar" → "Aplicar" (3 ocorrências) |
| `ContratosTab.tsx` | "Salvar" → "Aplicar" (3 ocorrências) |

Zero alteração funcional no salvamento. Toda proteção de dados mantida.

