

## Plano: Melhorar visualização dos itens CST no dropdown

### Arquivo: `src/components/equipe/dev/pis-cofins/RegraFormSheet.tsx`

**1. Trigger (linha 156-166):** Aumentar altura do botão de `h-10` para `h-auto min-h-10 py-2` e trocar `truncate` por `whitespace-normal text-left line-clamp-2` para mostrar a descrição completa.

**2. Itens da lista (linhas 183-193):** Remover `truncate` da descrição para mostrar texto completo com `whitespace-normal`. Adicionar `items-start py-2` ao `CommandItem` para alinhar bem com texto multi-linha. Adicionar `hover:text-white` ao código (`opt.code`) para ficar branco no hover igual à descrição.

### Alterações específicas

- Linha 160: `"w-full justify-between font-normal h-10 text-sm"` → `"w-full justify-between font-normal h-auto min-h-10 py-2 text-sm"`
- Linha 162: `"truncate"` → `"whitespace-normal text-left line-clamp-2"`
- Linha 187: `"text-xs"` → `"text-xs items-start py-2"`
- Linha 190: `"font-mono mr-2 font-semibold text-foreground"` → `"font-mono mr-2 font-semibold text-foreground group-data-[highlighted]:text-white"`
- Linha 191: `"truncate"` → `"whitespace-normal"`

