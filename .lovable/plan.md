

## Plano: Visão Geral + Tooltips em Apuração PIS/COFINS

Aplicar em `src/pages/equipe/dev/ApuracaoPisCofins.tsx` o mesmo padrão de `ControlePerdcomp.tsx`, **sem alterar componentes compartilhados** (`ApuracaoDataTable`, `DynamicTableHeader`, `BalanceteTreeTable`) — assim os filtros de coluna no cabeçalho permanecem intactos.

### 1. Visão Geral (`DevPageHeader` adaptado)

`DevPageHeader` hoje força a frase "Para acessar o manual… clique aqui". Como esta ferramenta ainda não tem manual, **não usar** o componente. No lugar, replicar inline o mesmo `Alert` verde-água usado por ele, **sem** o trecho do link:

```tsx
<Alert className="mb-6 bg-[#E6F2F1]/80 border-[#E6F2F1] dark:bg-teal-950/30 dark:border-teal-800">
  <Info className="h-5 w-5 text-teal-700 dark:text-teal-400" />
  <AlertTitle className="text-sm font-semibold ...">Visão Geral</AlertTitle>
  <AlertDescription className="text-sm leading-relaxed ... mt-1">
    A <strong>Apuração PIS/COFINS</strong> consolida débitos, créditos, isenções e
    rateios do contribuinte a partir do <strong>EFD Contribuições</strong> (modo Cliente)
    ou do <strong>Balancete</strong> importado (modo Prado), permitindo conferir a
    base de cálculo, o resultado do período e o saldo apurado mês a mês.
  </AlertDescription>
</Alert>
```

Logo abaixo do `<DevLayout>`, antes do bloco de filtros. Imports: `Alert, AlertDescription, AlertTitle` de `@/components/ui/alert`.

### 2. Helper `FieldTooltip` (mesmo padrão do PERDCOMP)

Adicionar no topo do arquivo:

```tsx
const FieldTooltip = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help flex-shrink-0" />
    </TooltipTrigger>
    <TooltipContent side="top" className="font-normal normal-case tracking-normal text-xs text-center max-w-[220px]">
      {text}
    </TooltipContent>
  </Tooltip>
);
```

Envolver todo o retorno do componente em `<TooltipProvider delayDuration={200}>` (ainda não está envolvido — hoje os `Tooltip` inline funcionam por sorte porque o `DevLayout` provavelmente provê um Provider; padronizar explicitamente).

### 3. Tooltips dos filtros principais

Objeto centralizado:

```ts
const TOOLTIPS = {
  cliente: "Cliente/grupo cujo contribuinte será apurado.",
  contribuinte: "CNPJ vinculado ao cliente. Define os dados consultados no EFD ou Balancete.",
  // tipoAnalise: JÁ EXISTE inline — manter como está, NÃO sobrescrever
  dataInicio: "Mês/ano inicial do período de apuração.",
  dataFim: "Mês/ano final do período (≥ Data Início).",
  periodoFechado: "Quando ativo, considera apenas competências já encerradas no balancete (modo Prado).",
  filtroConta: "Restringe a visualização a uma ou mais contas contábeis específicas.",
} as const;
```

Aplicar `<FieldTooltip text={TOOLTIPS.x} />` ao lado dos labels de:
- **Cliente** → `cliente`
- **Contribuinte** → `contribuinte`
- **Tipo de análise** → **MANTER o tooltip atual** (já é detalhado, com Cliente/Prado), não substituir
- **Data Início** → `dataInicio`
- **Data Fim** → `dataFim`
- **Período Fechado** (label do switch) → `periodoFechado`

### 4. Tooltips nos cabeçalhos das tabelas principais

`ApuracaoDataTable` já aceita `titleTooltip` — usar essa prop existente (renderiza ícone `Info` ao lado do título da seção, sem mexer no `<thead>` da tabela, **preservando os filtros de coluna**).

Tooltips já existentes — **manter sem alteração**:
- "Débitos" → CST 01 a 10 ✓
- "Isenções e Exclusões" → CST 04 a 09 ✓
- "Créditos" → CST 50 a 66 ✓
- "Operações não geradoras de Crédito" → CST 70 a 99 ✓

Adicionar `titleTooltip` nas seções que ainda não têm:
- **Base da Apuração - EFD Contribuições / Balancete** → "Itens-base utilizados como ponto de partida da apuração: receitas (CST 01–09) e/ou contas do balancete vinculadas, antes de aplicar débitos e créditos."
- **Outras Saídas** → "Operações de saída que não geram débito direto, mas compõem a análise (ex.: transferências, devoluções)."

Para as **tabelas inline** (`InlineTableWrapper` + `DynamicTableHeader` direto), o título é renderizado como `<h2>` próprio na página. Adicionar o ícone `Info` ao lado do `<h2>` usando o mesmo padrão visual do `ApuracaoDataTable`:

```tsx
<h2 className="text-lg font-bold uppercase mb-4 text-primary flex items-center gap-1.5">
  Base de Cálculo Após Isenções/Exclusões
  <Tooltip><TooltipTrigger asChild>
    <Info className="h-4 w-4 text-muted-foreground cursor-help shrink-0" />
  </TooltipTrigger><TooltipContent side="right" className="max-w-xs text-sm font-normal normal-case">
    {SECTION_TOOLTIPS.baseAposIsencoes}
  </TooltipContent></Tooltip>
</h2>
```

Textos para as seções inline (objeto `SECTION_TOOLTIPS`):
- **Base de Cálculo Após Isenções/Exclusões** → "Receita bruta líquida das isenções e exclusões — base efetiva sobre a qual incidem PIS e COFINS."
- **Débitos do Mês** → "Valor do débito de PIS/COFINS calculado sobre a base, separado por alíquota cheia e alíquota reduzida."
- **Base de Cálculo do Crédito** → "Soma das aquisições e custos que dão direito a crédito de PIS/COFINS no período."
- **Crédito do Mês** → "Crédito apropriado mês a mês para PIS e COFINS, com destaque para alíquota reduzida quando aplicável."
- **Apuração** (resultado / saldo) → "Resultado líquido (Débito - Crédito) e evolução do saldo de PIS e COFINS no período."
- **Rateio das Receitas** → "Distribuição percentual das receitas tributadas, não tributadas e exportação para fins de proporcionalidade do crédito."
- **Rateio do Crédito** → "Aplicação do percentual de rateio sobre o crédito apurado, ajustando o valor efetivamente apropriável."

(Os títulos exatos serão mapeados 1:1 ao percorrer os blocos das tabs Débitos, Créditos, Apuração e Rateio.)

### 5. O que NÃO alterar

- `ApuracaoDataTable.tsx`, `DynamicTableHeader.tsx`, `BalanceteTreeTable.tsx`, `MultiSelectContas.tsx` — ficam intocados.
- Filtros de coluna (sort/filter dropdowns) no `<thead>` — preservados, pois trabalhamos só no `<h2>` da seção (fora da tabela).
- Tooltip atual de "Tipo de análise" e os 4 `titleTooltip` já existentes (Débitos, Isenções, Créditos, Operações não geradoras).
- Sem link "clique aqui" na Visão Geral (ferramenta ainda sem manual).

### Arquivos alterados

- `src/pages/equipe/dev/ApuracaoPisCofins.tsx` (único arquivo)

Sem mudanças de banco, hooks, rotas ou componentes compartilhados.

