

## Plano: Corrigir corte dos tooltips nos cabeçalhos das tabelas

### Diagnóstico

O componente `ColumnTooltip` usa o `TooltipContent` de `@/components/ui/tooltip`, que **não envolve o conteúdo em `TooltipPrimitive.Portal`**. Sem o Portal, o tooltip é renderizado inline dentro do `<th>`, e fica preso ao stacking/overflow context da tabela (`overflow-x-auto` no container e `sticky` nas colunas vizinhas), sendo cortado pelas próximas colunas.

A imagem confirma: o card do tooltip da coluna "Conta" aparece truncado pela coluna "Descrição" à direita.

### Solução: portalar o `TooltipContent`

Editar `src/components/equipe/dev/pis-cofins/ColumnTooltip.tsx` para envolver o `TooltipContent` em `TooltipPrimitive.Portal`, garantindo que o card do tooltip seja anexado ao `<body>` e flutue acima de qualquer container com `overflow` ou `z-index` concorrente.

```tsx
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const ColumnTooltip = ({ label, text }) => (
  <Tooltip>
    <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-4 decoration-slate-400">
      {label}
    </TooltipTrigger>
    <TooltipPrimitive.Portal>
      <TooltipContent
        side="top"
        sideOffset={6}
        collisionPadding={12}
        className="font-normal normal-case tracking-normal text-xs text-center max-w-[260px] z-[100]"
      >
        {text}
      </TooltipContent>
    </TooltipPrimitive.Portal>
  </Tooltip>
);
```

Ajustes adicionais aplicados:

- **`TooltipPrimitive.Portal`** → renderiza o card no `<body>`, escapando do `overflow-x-auto` da tabela e dos `sticky`/`z-40` das colunas vizinhas.
- **`collisionPadding={12}`** → mantém o card dentro do viewport quando o trigger está perto da borda.
- **`sideOffset={6}`** → pequeno respiro entre o cabeçalho e o card.
- **`z-[100]`** → fica acima do `<thead sticky z-30>` e dos `<th sticky z-40>` da própria tabela.

### Por que isso resolve sem efeitos colaterais

- O Portal é o padrão recomendado pelo Radix justamente para tooltips dentro de containers com overflow/scroll — é exatamente o caso aqui.
- Não muda nenhuma API: `ColumnTooltip` e `renderColumnLabel` continuam com a mesma assinatura, então `DynamicTableHeader`, `ApuracaoDataTable` e `BalanceteTreeTable` não precisam de alteração.
- Funciona em qualquer página que já consome o helper (Apuração PIS/COFINS, e potencialmente outras que venham a usá-lo).

### Arquivos alterados

- `src/components/equipe/dev/pis-cofins/ColumnTooltip.tsx` — único arquivo.

Sem mudanças de banco, hooks, rotas ou de qualquer componente compartilhado.

