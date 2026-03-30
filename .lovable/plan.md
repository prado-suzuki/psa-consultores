
## Plano: Fazer o X remover a tag sem abrir o filtro

### Causa do problema
O `X` está dentro de um `Button` do shadcn (`PopoverTrigger asChild`), e esse `Button` aplica a classe global:

```tsx
[&_svg]:pointer-events-none
```

Com isso, o SVG do ícone não recebe o clique de verdade. O evento cai no botão pai e o popover abre, em vez de remover a tag.

### Correção
Ajustar apenas `src/components/equipe/dev/pis-cofins/MultiSelectContas.tsx`:

1. Substituir o `X` clicável direto por um wrapper clicável (ex.: `span`), para que o evento fique no wrapper e não no SVG.
2. Mover os handlers `onPointerDown` e `onClick` para esse wrapper.
3. Manter `stopPropagation()` + `preventDefault()` para bloquear a abertura do popover.
4. Deixar o `X` apenas visual dentro do wrapper.
5. Adicionar acessibilidade básica no wrapper (`role="button"`, `tabIndex={0}`, `aria-label`) e suporte a teclado (`Enter`/`Space`) para remover a tag também por teclado.

### Estrutura esperada
```tsx
<span
  role="button"
  tabIndex={0}
  aria-label={`Remover ${item.label}`}
  className="inline-flex cursor-pointer items-center justify-center"
  onPointerDown={(e) => {
    e.preventDefault();
    e.stopPropagation();
  }}
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    remove(item.value);
  }}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      remove(item.value);
    }
  }}
>
  <X className="h-3 w-3 shrink-0 hover:text-destructive" />
</span>
```

### Arquivo
| Arquivo | Alteração |
|---------|-----------|
| `src/components/equipe/dev/pis-cofins/MultiSelectContas.tsx` | Trocar clique direto no SVG por wrapper clicável que intercepta o evento corretamente |

### Resultado esperado
- Clicar no `X` remove a tag imediatamente
- O popover não abre ao remover
- O botão “Limpar” continua funcionando
- O restante do multi-select permanece igual
