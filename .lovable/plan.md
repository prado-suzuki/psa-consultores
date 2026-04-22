

## Plano: Atualizar texto do tooltip dos meses

Trocar o tooltip atual dos cabeçalhos de meses (quando o ano está expandido) de:

> "Valor da competência (mês/ano) selecionada."

para:

> "Valor total do mês."

### Alteração

Em `src/pages/equipe/dev/ApuracaoPisCofins.tsx`, no objeto `COLUMN_TOOLTIPS`, alterar a chave `__month__`:

```ts
__month__: "Valor total do mês.",
```

A função `buildColumnTooltips` já propaga esse valor para todas as colunas mensais (`YYYY-MM`) de todas as tabelas (Resumo, Débitos, Isenções, Créditos, Outras Saídas, Operações não geradoras, Apuração, Rateio etc.), então uma única troca cobre todos os meses colapsáveis em todas as tabelas da página.

### O que NÃO muda

- Tooltip dos anos colapsados (`__year__`) — mantido.
- Tooltip da coluna Total (`__total__`) — mantido.
- Demais tooltips (CST, Conta, Descrição, Bloco, Tipo, seções, filtros) — mantidos.
- Lógica de filtros, ordenação e expansão de anos — intacta.

### Arquivos alterados

- `src/pages/equipe/dev/ApuracaoPisCofins.tsx` (única linha no `COLUMN_TOOLTIPS`).

