

## Plano: Totalizadores de Coluna nas Abas de Crédito e Débito

### Objetivo
Adicionar uma linha de totais no rodapé de cada tabela (`ApuracaoDataTable`) nas abas de Débitos e Créditos, somando os valores de todas as linhas por período.

### Alteração: `ApuracaoDataTable.tsx`

**1. Nova prop `showTotals?: boolean`** (default `false`)

**2. Linha de totais no `<TableBody>`**, após as rows de dados e antes do bloco "empty":

- Calcular totais por coluna: para cada `headerBottom` col, somar `getColValue(row, col.dataKeys)` de todas as rows
- Renderizar `<TableRow>` com fundo `bg-muted/50 font-bold border-t-2`
- Colunas sticky mostram "Total" na coluna Descrição (ou primeira coluna disponível), demais sticky ficam vazias
- Coluna "Total" (última) soma `row.total` de todas as rows

**3. Uso nas abas** — em `ApuracaoPisCofins.tsx`, passar `showTotals` nos 5 `<ApuracaoDataTable>` das abas Débitos e Créditos:
- Débitos, Isenções e Exclusões, Outras Saídas, Créditos, Isenções de Crédito

### Arquivos modificados

| Arquivo | Alteração |
|---------|-----------|
| `ApuracaoDataTable.tsx` | +prop `showTotals`, +linha de totais no rodapé |
| `ApuracaoPisCofins.tsx` | +`showTotals` nos ApuracaoDataTable de débitos e créditos |

