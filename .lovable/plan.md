

## Plano: Botão "+" para adicionar contas extras ao cálculo (modo Prado)

### Contexto
No modo BALANCETE, apenas contas com `lancamentos` (vindos da EFD) entram no cálculo. Contas que existem no balancete mas não na EFD ficam de fora. O usuário quer poder incluí-las manualmente como Débito ou Crédito.

### Alterações

**1. `BalanceteTreeTable.tsx` — UI do botão "+" e badge D/C**
- Novas props: `extraContas: Map<string, "D" | "C">`, `onToggleExtra: (codCta: string, desc: string, tipo: "D" | "C") => void`, `onRemoveExtra: (codCta: string) => void`
- Na célula de descrição dos nós folha (`!isParent`):
  - Se a conta NÃO está em `extraContas`: no hover do `<TableRow>`, exibir botão "+" inline (usando `group` / `group-hover` do Tailwind). Ao clicar, abrir um `Popover` com dois botões: "Débito" e "Crédito"
  - Se a conta JÁ está em `extraContas`: exibir um badge fixo "D" ou "C" (verde para débito, azul para crédito) clicável para remover

**2. `ApuracaoPisCofins.tsx` — Estado das contas extras**
- Novo estado: `const [extraContas, setExtraContas] = useState<Map<string, { tipo: "D" | "C"; desc: string }>>(new Map())`
- Handlers `handleToggleExtra` e `handleRemoveExtra`
- Passar props para `BalanceteTreeTable`

**3. `usePisCofinsCalculator.ts` — Injeção no cálculo**
- Nova prop opcional: `extraContas: Map<string, { tipo: "D" | "C"; desc: string }>`
- No passo de normalização (BALANCETE), após o flatten, injetar itens sintéticos para cada conta extra encontrada na árvore:
  - Tipo "D" → CST `01`, aliq_pis `0` (entra como receita/débito)
  - Tipo "C" → CST `50`, aliq_pis `1.65` (entra como crédito)
  - Valor = `saldo_periodo` ou `saldo_atual` do nó folha correspondente

**4. `pisCofinsFilters.ts` — Função auxiliar**
- Nova função `extractLeafNodesByAccount(contas, codCtaSet)` que percorre a árvore e retorna nós folha que correspondem às contas extras, para gerar os itens sintéticos

### Resultado visual

```text
Antes (hover):
│ 1.01.02 │ Receitas de Serviço          [+] │ R$ 1.000 │

Após clicar "+" e escolher "Débito":
│ 1.01.02 │ Receitas de Serviço          [D] │ R$ 1.000 │
```

O badge [D] ou [C] é clicável para remover a conta extra.

### Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `BalanceteTreeTable.tsx` | Botão "+", Popover D/C, badge |
| `ApuracaoPisCofins.tsx` | Estado `extraContas`, handlers, props |
| `usePisCofinsCalculator.ts` | Injeção de itens sintéticos |
| `pisCofinsFilters.ts` | Helper para extrair nós folha por conta |

