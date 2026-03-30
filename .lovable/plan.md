

## Plano: Esconder tabela "Outras Saídas" quando vazia

### Alteração (arquivo único: `ApuracaoPisCofins.tsx`)

Envolver o bloco `<ApuracaoDataTable>` de "Outras Saídas" (~L435) com uma condicional `{tables.outrasSaidasData.length > 0 && (...)}` para que a tabela inteira (incluindo título) não seja renderizada quando não há dados.

### Arquivo modificado

| Arquivo | Alteração |
|---------|-----------|
| `ApuracaoPisCofins.tsx` | Condicional `length > 0` no bloco Outras Saídas |

