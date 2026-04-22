

## Plano: Tooltips em TODAS as colunas/cabeçalhos das tabelas — Apuração PIS/COFINS

Aplicar o padrão exato do `MapaNCMPisCofins.tsx` (`<ColumnTooltip label="..." text="..." />` com sublinhado pontilhado) em **todos os cabeçalhos** das tabelas da página, **sem quebrar os filtros de coluna nem a expansão de anos**, mantendo todos os tooltips de seção (`SectionTitle` / `titleTooltip`) já implementados.

### Estratégia: estender 2 componentes compartilhados de forma backward-compatible

Para evitar reescrever cada `<TableHead>` (e quebrar `ColumnFilterDropdown` / botões de expandir ano que vivem dentro deles), vamos passar um **mapa opcional** `columnTooltips` para os headers compartilhados, que renderizam o `ColumnTooltip` automaticamente nas labels.

#### 1. `DynamicTableHeader.tsx` — adicionar prop opcional

Nova prop `columnTooltips?: Record<string, string>` (chaves: `<stickyLabel>` para colunas fixas, id do ano/mês para colunas dinâmicas, `"__total__"` para a coluna Total).

- Se a prop estiver presente E houver tooltip para aquela chave, envolver a label com `ColumnTooltip` (mesmo helper do MapaNCM, copiado para dentro do arquivo ou movido para `pis-cofins/columnTooltipUtils.tsx`).
- Se ausente, renderiza o texto simples atual → **zero impacto em outros usos**.
- Filtros (`renderHeaderExtra`) e botões de expandir/colapsar ano permanecem renderizados ao lado, intactos.

#### 2. `ApuracaoDataTable.tsx` — adicionar prop opcional

Nova prop `columnTooltips?: Record<string, string>` repassada ao `DynamicTableHeader`. Para as colunas sticky internas (CST, Conta, Descrição, Bloco), aplicar `ColumnTooltip` na própria renderização.

#### 3. `BalanceteTreeTable.tsx` — mesmo padrão

Adicionar `columnTooltips?: Record<string, string>` opcional e aplicar `ColumnTooltip` nas colunas fixas (Conta, Descrição, Tipo, valores mensais usam o mesmo header).

### Tooltips a aplicar (catálogo completo)

Centralizar em `COLUMN_TOOLTIPS` no `ApuracaoPisCofins.tsx`:

```ts
const COLUMN_TOOLTIPS = {
  // Colunas fixas (sticky) das tabelas grandes (Resumo, Débitos, Créditos, etc.)
  CST: "Código de Situação Tributária do PIS/COFINS aplicado ao item.",
  Conta: "Código contábil da conta (do EFD ou Balancete) que originou o valor.",
  "Descrição": "Descrição contábil da conta ou do item da apuração.",
  Bloco: "Bloco do EFD Contribuições onde o registro foi extraído (A170, C170, F100 etc.).",
  // Coluna Total (final de cada tabela com colunas mensais)
  __total__: "Soma de todos os meses exibidos no período consultado.",
  // Coluna de ano colapsado (chave = id do ano, ex.: "2024")
  __year__: "Total do ano. Clique no '+' para expandir e ver os meses.",
  // Coluna de mês expandido (chave = "YYYY-MM")
  __month__: "Valor da competência (mês/ano) selecionada.",

  // Tabelas inline — colunas sticky de uma única descrição
  "Rateio das receitas": "Categoria de receita usada no cálculo do percentual de rateio.",

  // BalanceteTreeTable — colunas fixas extras
  Tipo: "Tipo da conta no balancete (Devedora 'D' ou Credora 'C').",
} as const;
```

E para os cabeçalhos dinâmicos, gerar o mapa em runtime na própria página:

```ts
const buildColumnTooltips = (columnsData) => {
  const map: Record<string,string> = {
    CST: COLUMN_TOOLTIPS.CST,
    Conta: COLUMN_TOOLTIPS.Conta,
    "Descrição": COLUMN_TOOLTIPS["Descrição"],
    Bloco: COLUMN_TOOLTIPS.Bloco,
    "Rateio das receitas": COLUMN_TOOLTIPS["Rateio das receitas"],
    Tipo: COLUMN_TOOLTIPS.Tipo,
    __total__: COLUMN_TOOLTIPS.__total__,
  };
  // anos
  columnsData.yearsMap.forEach((months, year) => {
    map[year] = COLUMN_TOOLTIPS.__year__;
    months.forEach(m => { map[m] = COLUMN_TOOLTIPS.__month__; });
  });
  return map;
};
```

Passar `columnTooltips={buildColumnTooltips(columnsData)}` em **todos** os `<ApuracaoDataTable />`, `<DynamicTableHeader />` (das tabelas inline) e `<BalanceteTreeTable />`.

### Por que isso NÃO quebra os filtros

- `ColumnTooltip` envolve apenas o **texto da label** (`<span>` com `<TooltipTrigger>`), não substitui o `<TableHead>`.
- `ColumnFilterDropdown` é renderizado lado a lado via `renderHeaderExtra` (já existente) e continua funcionando exatamente como hoje no `ApuracaoDataTable`.
- Botões `+`/`-` de expandir ano permanecem dentro da `<div className="flex items-center justify-end gap-2">` no `DynamicTableHeader`, apenas a label "2024" passa a ter sublinhado pontilhado + tooltip.
- A prop é opcional → outras páginas que consomem esses componentes (ConsultaEFD, IcmsSaidas etc.) continuam funcionando sem mudança.

### O que NÃO muda

- Tooltips de filtros (`FieldTooltip` em Cliente, Contribuinte, Datas, Período Fechado) — já implementados, mantidos.
- Tooltip de "Tipo de análise" (Cliente/Prado) — mantido como está.
- `SectionTitle` e `titleTooltip` em todas as seções — mantidos.
- Visão Geral (Alert teal) — mantida.
- Lógica de cálculo, queries, filtros, ordenação, expansão de anos — intactas.

### Arquivos alterados

1. `src/components/equipe/dev/pis-cofins/DynamicTableHeader.tsx` — adicionar prop opcional `columnTooltips` + helper `ColumnTooltip` interno.
2. `src/components/equipe/dev/pis-cofins/ApuracaoDataTable.tsx` — adicionar prop opcional `columnTooltips` (repassa ao header + aplica nas sticky internas).
3. `src/components/equipe/dev/pis-cofins/BalanceteTreeTable.tsx` — adicionar prop opcional `columnTooltips` e aplicar nas colunas fixas.
4. `src/pages/equipe/dev/ApuracaoPisCofins.tsx` — definir `COLUMN_TOOLTIPS`, função `buildColumnTooltips` e passar a prop em todos os `<ApuracaoDataTable />`, `<BalanceteTreeTable />` e `<DynamicTableHeader />` inline.

Sem mudanças de banco, hooks, rotas ou lógica de filtros/ordenação.

