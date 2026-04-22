
## Plano: padronização de tooltips em `ProcessoDifal.tsx`

Aplicar o padrão de tooltips na tabela de resultados e nos botões "Salvar alterações" / "Exportar Excel", sem tocar nos tooltips já existentes nos filtros.

### 1. Helpers de tooltip (logo abaixo de `FieldTooltip`, ~linha 69)

Adicionar dois novos componentes reutilizando `Tooltip` / `TooltipTrigger` / `TooltipContent` já importados:

- **`ColumnTooltip`** — recebe `text` e `children`. Renderiza `TooltipTrigger asChild` com classes `cursor-help underline decoration-dotted underline-offset-4 decoration-slate-400` em torno de um `<span>` que envolve o `children` (o título da coluna). `TooltipContent` com classes `max-w-[220px] font-normal normal-case tracking-normal text-xs text-center`.
- **`ButtonTooltip`** — recebe `text` e `children`. Envolve `children` (o `<Button>`) em `TooltipTrigger asChild`. `TooltipContent` com as mesmas classes acima.

Nenhum `TooltipProvider` adicional — o global da app já cobre.

### 2. Expansão do dicionário `TOOLTIPS` (linhas 72-77)

Preservar as 4 chaves atuais (`cliente`, `contribuinte`, `dataInicio`, `dataFim`) e adicionar:

```ts
colStatus: "Status atual da classificação tributária do item.",
colProduto: "Descrição do produto e código interno na nota fiscal.",
colNcm: "Nomenclatura Comum do Mercosul (NCM) do produto.",
colCfop: "Código Fiscal de Operações e Prestações (CFOP).",
colTributacao: "Situação Tributária (CST), Alíquota e Redução de Base de Cálculo originais.",
colMvaSt: "Regra de DIFAL/ST validada, incluindo alíquota e redução aplicáveis.",
salvarAlteracoes: "Sincroniza as decisões validadas na sessão com o banco de dados principal.",
exportarExcel: "Gera a planilha com todos os NCMs classificados no período.",
```

### 3. Cabeçalho da tabela (linhas 1093-1098)

Substituir o texto puro de cada `TableHead` por `<ColumnTooltip text={TOOLTIPS.colXxx}>Texto</ColumnTooltip>`, mantendo as classes `w-[...]` originais nas tags `<TableHead>`. Mapeamento:

| Coluna | Chave |
|---|---|
| Status | `colStatus` |
| Produto | `colProduto` |
| NCM | `colNcm` |
| CFOP | `colCfop` |
| Tributação | `colTributacao` |
| MVA/ST | `colMvaSt` |

### 4. Botões de ação (linhas 1034-1058)

- Envolver o `<Button>` "Salvar alterações" com `<ButtonTooltip text={TOOLTIPS.salvarAlteracoes}>…</ButtonTooltip>`.
- Envolver o `<Button>` "Exportar Excel" com `<ButtonTooltip text={TOOLTIPS.exportarExcel}>…</ButtonTooltip>` e **remover** a prop `title={…}` nativa (linhas 1052-1054).

### O que NÃO muda

- Tooltips dos filtros do topo (cliente, contribuinte, datas) e qualquer outro `FieldTooltip` existente.
- Lógica funcional de busca, salvamento, exportação, classes de largura das colunas, estados `disabled`.
- Imports — `Tooltip*` já importados na linha 57.
- Nenhum `TooltipProvider` adicional.

### Arquivo alterado (1)

- `src/pages/equipe/dev/ProcessoDifal.tsx`
