

# Plano: Corrigir Modais Fechando Sozinhos + Salvaguarda de Dados

## Diagnostico

### Problema 1 - Causa Raiz Identificada

O componente `DialogContent` do Radix UI utiliza internamente o `DismissableLayer`, que dispara o evento `onFocusOutside` sempre que o foco sai do dialog -- incluindo quando o usuario troca de aba no navegador. Por padrao, esse evento causa o fechamento do modal.

O arquivo `src/components/ui/dialog.tsx` (usado por **todos** os modais da aplicacao) NAO possui nenhum tratamento para `onFocusOutside`. Isso significa que qualquer troca de aba/janela fecha o modal.

### Problema 2 - Situacao Atual

Ja existe o hook `useDraftPersistence` em `src/hooks/useDraftPersistence.ts` que salva dados no `sessionStorage` com debounce de 500ms. Porem, ele so e utilizado em **1 modal**: o `TaskModal.tsx` (fiscal tasks). Os outros 4 modais com formularios (`WorkPackageForm`, `PerFormModal`, `DcompFormModal`, `SituacaoFormModal`) e os modais com estado manual (`CreateTicketDialog`, `NewClientModal`, `CreateProcessModal`) nao possuem nenhuma salvaguarda.

---

## Solucao Proposta

### Parte 1: Correcao Global dos Modais (1 arquivo)

**Arquivo:** `src/components/ui/dialog.tsx`

Adicionar `onFocusOutside={(e) => e.preventDefault()}` no componente `DialogContent`. Como todos os modais da aplicacao importam deste arquivo, a correcao sera automaticamente aplicada em todos os lugares.

```tsx
<DialogPrimitive.Content
  ref={ref}
  onFocusOutside={(e) => e.preventDefault()}
  className={cn(...)}
  {...props}  // permite override individual se necessario
>
```

Isso impede o fechamento por perda de foco, mantendo o comportamento normal de fechar por: clique no X, clique no overlay, tecla Escape, ou acao programatica.

### Parte 2: Salvaguarda de Dados nos Formularios (5 arquivos)

Integrar o hook `useDraftPersistence` nos modais de formulario que ainda nao o utilizam. Cada modal recebera:

1. **`WorkPackageForm.tsx`** - chave: `'wp-form-draft'`
2. **`PerFormModal.tsx`** - chave: `'per-form-draft'`
3. **`DcompFormModal.tsx`** - chave: `'dcomp-form-draft'`
4. **`SituacaoFormModal.tsx`** - chave: `'situacao-form-draft'`
5. **`CreateTicketDialog.tsx`** - chave: `'ticket-form-draft'`

O padrao de integracao sera identico ao ja existente no `TaskModal.tsx`:

```tsx
const watchedValues = form.watch();
const draftEnabled = open && !isEditing;
const { restore, clear } = useDraftPersistence('chave-draft', watchedValues, draftEnabled);

// Restaurar ao abrir (novo)
useEffect(() => {
  if (open && !isEditing) {
    const saved = restore();
    if (saved) form.reset(saved);
  }
}, [open]);

// Limpar ao submeter com sucesso ou cancelar
onSuccess: () => { clear(); onOpenChange(false); }
onCancel: () => { clear(); onOpenChange(false); }
```

Para o `CreateTicketDialog` que usa `useState` ao inves de `react-hook-form`, sera feita uma adaptacao equivalente construindo o objeto de valores manualmente.

---

## Resumo de Arquivos Alterados

| Arquivo | Alteracao |
|---|---|
| `src/components/ui/dialog.tsx` | Adicionar `onFocusOutside` no `DialogContent` |
| `src/components/projetos/WorkPackageForm.tsx` | Integrar `useDraftPersistence` |
| `src/components/equipe/dev/perdcomp/PerFormModal.tsx` | Integrar `useDraftPersistence` |
| `src/components/equipe/dev/perdcomp/DcompFormModal.tsx` | Integrar `useDraftPersistence` |
| `src/components/equipe/dev/perdcomp/SituacaoFormModal.tsx` | Integrar `useDraftPersistence` |
| `src/components/gestao/CreateTicketDialog.tsx` | Integrar `useDraftPersistence` |

Total: **6 arquivos** modificados, **0 arquivos** novos.

