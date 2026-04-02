

## Plan: Remover scroll automático por hover nos Selects

### Problema

O componente `SelectContent` (em `src/components/ui/select.tsx`) usa `SelectScrollUpButton` e `SelectScrollDownButton` do Radix. Esses botões fazem scroll automático ao passar o mouse — comportamento padrão do Radix que a usuária não deseja.

### Solução

Remover os componentes `SelectScrollUpButton` e `SelectScrollDownButton` de dentro do `SelectContent`. O scroll passará a funcionar via mousewheel/trackpad/scrollbar nativo, sem setas que ativam por hover.

**Alteração em `src/components/ui/select.tsx`** (linhas 77 e 87):

Antes:
```tsx
<SelectScrollUpButton />
<SelectPrimitive.Viewport ...>
  {children}
</SelectPrimitive.Viewport>
<SelectScrollDownButton />
```

Depois:
```tsx
<SelectPrimitive.Viewport ...>
  {children}
</SelectPrimitive.Viewport>
```

Também trocar `overflow-hidden` por `overflow-auto` na classe do `SelectPrimitive.Content` para garantir scroll nativo.

**1 arquivo, 3 linhas alteradas.** Afeta todos os Selects do sistema de uma vez.

