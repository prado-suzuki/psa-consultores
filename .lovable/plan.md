

User reports: in TabC170, column filter dropdowns have vertical scroll disabled. Need to investigate the filter dropdown component.
<lov-tool-use id="toolu_vrtx_01AEZKTcAAJCuhuJD82SjZmX" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/equipe/dev/correcoes-sped/TabC170.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Ur6JUwLFUi8GSR4BHqxpNN" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/equipe/dev/correcoes-sped/TabC170.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01MPTaK6FmeLos1LKLBAxmo4" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/equipe/dev/pis-cofins/ColumnFilterDropdown.tsx\"}">
</lov-tool-use>
Found the issue. The `ScrollArea` uses `max-h-48` but Radix `ScrollArea` requires an explicit `height` (not max-height) on the Viewport, otherwise the viewport collapses around its content and the internal scrollbar never activates. With `max-h-48` + `h-full w-full` viewport, the height resolution fails and the list either overflows the popover or doesn't scroll.

<lov-plan>

## Plano: Habilitar scroll vertical no filtro de coluna do C170

### Problema
O `ColumnFilterDropdown` (compartilhado por TabC170 e outras) usa `<ScrollArea className="max-h-48">`. O Radix `ScrollArea` precisa de **altura explícita** no Root (não `max-height`), porque o Viewport interno é `h-full w-full` — com `max-h` o Viewport não calcula altura e a barra de rolagem nunca ativa, fazendo a lista parecer "travada" sem scroll.

### Correção
Em `src/components/equipe/dev/pis-cofins/ColumnFilterDropdown.tsx`, linha 116:

Trocar:
```tsx
<ScrollArea className="max-h-48">
```
por:
```tsx
<ScrollArea className="h-48">
```

Isso fixa a altura do Root em 12rem, o Viewport interno passa a ter altura definida e a `ScrollAreaScrollbar` aparece automaticamente quando a lista de valores únicos exceder essa altura.

### Escopo
- 1 arquivo, 1 linha alterada
- Afeta todos os dropdowns de filtro de coluna que usam esse componente (C170, A170, F100, F120, F130, D100, ApuracaoDataTable, etc.) — todos passam a ter scroll vertical funcional, comportamento desejado.
- Sem mudanças de schema, RLS ou hooks.

