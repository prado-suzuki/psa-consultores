

## Plano: Adicionar filtro de contas no modo Prado (BALANCETE)

### Problema
O modo "Cliente" (EFD) na aba Resumo possui o `MultiSelectContas` para filtrar por conta contábil, mas o modo "Prado" (BALANCETE) não tem esse filtro.

### Alteração em `src/pages/equipe/dev/ApuracaoPisCofins.tsx`

1. **Extrair opções de conta da árvore hierárquica** — Criar um `useMemo` que percorre recursivamente `contasTree` coletando pares únicos `cod_cta + descricao_conta` para alimentar o `MultiSelectContas`

2. **Filtrar a árvore por contas selecionadas** — Criar um `useMemo` com função recursiva que poda a árvore mantendo apenas nós cujo `cod_cta` está na seleção (ou que têm descendentes selecionados). Quando nenhuma conta é selecionada, exibir tudo.

3. **Renderizar o filtro antes do `BalanceteTreeTable`** — No bloco `tipoApuracao === "BALANCETE"` (linha ~495), envolver em `<div className="space-y-4">` com `<MultiSelectContas>` acima, passando a árvore filtrada ao componente

### Resultado
O estado `selectedContas` já existe e é compartilhado entre ambos os modos. O filtro aparecerá identicamente nos dois tipos de análise.

| Arquivo | Alteração |
|---------|-----------|
| `ApuracaoPisCofins.tsx` | Adicionar extração de opções da árvore, filtro recursivo, e `MultiSelectContas` no bloco BALANCETE |

