

## Plano: Tooltips na tabela e ações do `ConsultaEFD.tsx`

Arquivo único alterado: `src/pages/equipe/dev/ConsultaEFD.tsx`. Filtros de busca (zona já tooltipada com `FieldTooltip`) **não serão tocados**.

### 1. Novos helpers (logo abaixo do `FieldTooltip`, ~linha 47)

Cópia idêntica ao padrão de `ConsultaXMLs.tsx`:

```tsx
const ColumnTooltip = ({ label, text }: { label: string; text: string }) => (
  <Tooltip>
    <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-4 decoration-slate-400">
      {label}
    </TooltipTrigger>
    <TooltipContent side="top" className="font-normal normal-case tracking-normal text-xs text-center max-w-[220px]">
      {text}
    </TooltipContent>
  </Tooltip>
);

const ButtonTooltip = ({ text, children }: { text: string; children: React.ReactNode }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="inline-flex">{children}</span>
    </TooltipTrigger>
    <TooltipContent side="top" className="font-normal normal-case tracking-normal text-xs text-center max-w-[220px]">
      {text}
    </TooltipContent>
  </Tooltip>
);
```

### 2. Expansão da constante `TOOLTIPS` (preservando chaves atuais)

```tsx
const TOOLTIPS = {
  cliente: "Filtra as EFD Contribuições por cliente ou grupo.",
  contribuinte: "CNPJ/CPF vinculado ao cliente. Obrigatório para a busca.",
  dataInicio: "Define o período inicial da busca.",
  dataFim: "Define o período final da busca.",
  // novos
  colArquivo: "Nome e ID do arquivo SPED processado.",
  colPeriodo: "Mês inicial e final da escrituração.",
  colTipo: "Status do arquivo (Original ou Retificadora).",
  colCreditoPis: "Total de créditos de PIS apurados no período.",
  colCreditoCofins: "Total de créditos de COFINS apurados no período.",
  colAcoes: "Opções de download, exportação Excel e análise em tela.",
  baixarTodos: "Download em lote (.zip) de todos os arquivos SPED listados.",
  baixarTxt: "Download do arquivo SPED original (.txt).",
  analisar: "Abre a análise detalhada dos blocos e registros do arquivo em tela.",
} as const;
```

### 3. Cabeçalho da tabela (`<thead>`, linhas 615–636)

Substituir o conteúdo de cada `<th>` por `<ColumnTooltip label="…" text={TOOLTIPS.col…} />`. Classes do `<th>` (padding, alinhamento, largura, `text-right`/`text-center`) preservadas integralmente.

| Coluna | Chave |
|---|---|
| Arquivo | `colArquivo` |
| Período | `colPeriodo` |
| Tipo | `colTipo` |
| Crédito PIS | `colCreditoPis` |
| Crédito COFINS | `colCreditoCofins` |
| Ações | `colAcoes` |

### 4. Botão "Baixar Todos" (linhas 555–578)

- Remover o `<TooltipProvider>` e o `<Tooltip>/<TooltipTrigger>/<TooltipContent>` redundantes (provider global já está ativo).
- Envolver o `<Button>` em `<ButtonTooltip text={TOOLTIPS.baixarTodos}>…</ButtonTooltip>`.

### 5. Botões de ação na linha (linhas 680–719)

- Remover o `<TooltipProvider>` interno (linhas 681 e 718).
- Botão de download TXT: remover o `<Tooltip>/<TooltipTrigger asChild>/<TooltipContent>` atual e envolver o `<Button>` em `<ButtonTooltip text={TOOLTIPS.baixarTxt}>…</ButtonTooltip>`.
- Botão "Analisar": envolver em `<ButtonTooltip text={TOOLTIPS.analisar}>…</ButtonTooltip>`.
- O `<EFDExportDialog>` (linhas 704–707) **não recebe tooltip** (componente próprio, fora do escopo solicitado).
- A `<div className="flex items-center justify-center gap-2">` permanece como wrapper das três ações.

### 6. Inalterado

- `FieldTooltip` e tooltips dos filtros de busca.
- `<TooltipProvider delayDuration={300}>` global na linha 403 (continua envolvendo toda a página).
- Lógica de queries, handlers, formatadores e estados.
- Imports — `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` já estão importados.

### Resultado

Cabeçalhos com sublinhado pontilhado revelando descrição ao passar o cursor; botões "Baixar Todos", download TXT e "Analisar" com dica curta padronizada (220 px, centralizada, normal-case); JSX sem strings hardcoded e sem `TooltipProvider` aninhados.

