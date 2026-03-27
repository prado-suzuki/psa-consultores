

## Plano: Remover coluna "Linhas" da tabela de Controle de Balancetes

### Arquivo: `src/pages/equipe/dev/ControleBalancetes.tsx`

1. Atualizar `COL_COUNT` de 7 para 6
2. Remover o `<TableHead>` "Linhas" do header
3. Remover o `<TableCell>` com `b.qtd_linhas ?? b.total_linhas` do body

