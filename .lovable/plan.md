

## Plano: Tooltips na tabela e ações do `ConsultaECD.tsx`

Arquivo único: `src/pages/equipe/dev/ConsultaECD.tsx`. Filtros (já com `FieldTooltip`) **não serão tocados**.

### 1. Novos helpers (logo após `FieldTooltip`, ~linha 47)

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

### 2. Expansão de `TOOLTIPS` (linhas 50–55, preservar chaves atuais)

```tsx
const TOOLTIPS = {
  cliente: "Filtra as ECD por cliente ou grupo.",
  contribuinte: "CNPJ/CPF vinculado ao cliente. Obrigatório para a busca.",
  dataInicio: "Define o período inicial da busca.",
  dataFim: "Define o período final da busca.",
  // novos
  colArquivo: "Nome e ID do arquivo ECD processado.",
  colPeriodo: "Mês inicial e final da escrituração.",
  colTipo: "Status do arquivo (Original ou Retificadora).",
  colFinalidade: "Finalidade da escrituração contábil.",
  colAcoes: "Opções de download, exportação Excel e análise em tela.",
  exportarLote: "Exportar arquivo(s) selecionado(s) para Excel.",
  baixarLote: "Download individual ou em lote (ZIP) dos arquivos selecionados.",
  baixarTxt: "Download do arquivo ECD original (.txt).",
  analisar: "Abre a análise detalhada dos blocos e registros do arquivo em tela.",
} as const;
```

### 3. Cabeçalho da tabela (`<thead>`, linhas 474–483)

Substituir o conteúdo textual de cada `<th>` por `<ColumnTooltip label="…" text={TOOLTIPS.col…} />`. Classes do `<th>` preservadas. Coluna do Checkbox (linha 476) intacta.

| Coluna | Chave |
|---|---|
| Arquivo | `colArquivo` |
| Período | `colPeriodo` |
| Tipo | `colTipo` |
| Finalidade | `colFinalidade` |
| Ações | `colAcoes` |

### 4. Botões globais do header da tabela (linhas 432–452)

- Remover ambos os `<TooltipProvider>` aninhados (provider global já cobre).
- Envolver `<Button>` "Exportar excel" em `<ButtonTooltip text={TOOLTIPS.exportarLote}>…</ButtonTooltip>`.
- Envolver `<Button>` "Baixar txt" em `<ButtonTooltip text={TOOLTIPS.baixarLote}>…</ButtonTooltip>`.
- Badge contadora (linha 431) inalterada.

### 5. Botões de ação na linha (linhas 508–525)

- Remover o `<TooltipProvider>` interno (linhas 509 e 524).
- Manter a `<div className="flex items-center justify-center gap-2">` como wrapper.
- Botão de download TXT: remover o `<Tooltip>/<TooltipTrigger asChild>/<TooltipContent>` (linhas 511–518) e envolver o `<Button>` em `<ButtonTooltip text={TOOLTIPS.baixarTxt}>…</ButtonTooltip>`.
- `<EFDExportDialog>` (linha 519) **inalterado**.
- Botão "Analisar" (linhas 520–522): envolver em `<ButtonTooltip text={TOOLTIPS.analisar}>…</ButtonTooltip>`.

### 6. Inalterado

- `FieldTooltip` e tooltips dos filtros.
- `<TooltipProvider delayDuration={300}>` global na linha 358.
- Lógica de queries, handlers, formatadores, estados, seleção.
- Imports (`Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` já presentes).
- `EFDExportDialog`, `EFDAnalysisModal`, `COD_FIN_MAP`.

### Resultado

Cabeçalhos com sublinhado pontilhado e dica ao hover; botões "Exportar excel", "Baixar txt", download TXT por linha e "Analisar" com tooltip padronizado (220 px, centralizado, normal-case); JSX sem strings hardcoded e sem `TooltipProvider` aninhados.

