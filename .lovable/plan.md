

## Plano: Corrigir clique no X da tag abrindo o popover

### Problema
O `e.stopPropagation()` não é suficiente porque o `PopoverTrigger` usa `onPointerDown` internamente. O evento de pointer continua propagando e abre o popover.

### Correção (`MultiSelectContas.tsx`)

Adicionar `e.preventDefault()` junto ao `e.stopPropagation()` no handler do `X`, e também adicionar `onPointerDown={(e) => e.stopPropagation()}` no ícone `X` para interceptar o evento antes que o Radix Popover o capture.

```tsx
<X
  className="h-3 w-3 shrink-0 cursor-pointer hover:text-destructive"
  onPointerDown={(e) => e.stopPropagation()}
  onClick={(e) => {
    e.stopPropagation();
    e.preventDefault();
    remove(item.value);
  }}
/>
```

| Arquivo | Alteração |
|---------|-----------|
| `MultiSelectContas.tsx` | Adicionar `onPointerDown` + `preventDefault` no ícone X |

