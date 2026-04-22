

## Plano: Tooltips na tabela e ações do `ConsultaEFDICMS.tsx`

Arquivo único alterado: `src/pages/equipe/dev/ConsultaEFDICMS.tsx`. Filtros de busca (já tooltipados com `FieldTooltip`) **não serão tocados**.

### 1. Novos helpers (logo abaixo do `FieldTooltip`, ~linha 48)

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
  cliente: "Filtra as EFD ICMS por cliente ou grupo.",
  contribuinte: "CNPJ/CPF vinculado ao cliente. Obrigatório para a busca.",
  dataInicio: "Define o período inicial da busca.",
  dataFim: "Define o período final da busca.",
  // novos
  colArquivo: "Nome e ID do arquivo EFD ICMS processado.",
  colPeriodo: "Mês inicial e final da escrituração.",
  colTipo: "Status do arquivo (Original ou Retificadora).",
  colIcms: "Total de ICMS a recolher apurado no período.",
  colIcmsSt: "Total de ICMS ST a recolher apurado no período.",
  colAcoes: "Opções de download, exportação Excel e análise em tela.",
  exportarLote: "Exportar arquivo(s) selecionado(s) para Excel.",
  baixarLote: "Download individual ou em lote (ZIP) dos arquivos selecionados.",
  baixarTxt: "Download do arquivo EFD ICMS original (.txt).",
  analisar: "Abre a análise detalhada dos blocos e registros do arquivo em tela.",
} as const;
```

### 3. Cabeçalho da tabela (`<thead>`, linhas 843–871)

Substituir o conteúdo textual de cada `<th>` por `<ColumnTooltip label="…" text={TOOLTIPS.col…} />`. As classes de cada `<th>` (padding, alinhamento, `text-right`/`text-center`, `w-56`) e a coluna do Checkbox (linha 845–851) permanecem intactas.

| Coluna | Chave |
|---|---|
| Arquivo | `colArquivo` |
| Período | `colPeriodo` |
| Tipo | `colTipo` |
| ICMS | `colIcms` |
| ICMS ST | `colIcmsSt` |
| Ações | `colAcoes` |

### 4. Botões globais do header da tabela (linhas 750–804)

- Remover ambos os blocos `<TooltipProvider>` aninhados (linhas 751–774 e 777–804) — provider global na linha 544 já cobre.
- Envolver o `<Button>` "Exportar excel" em `<ButtonTooltip text={TOOLTIPS.exportarLote}>…</ButtonTooltip>`.
- Envolver o `<Button>` "Baixar txt" em `<ButtonTooltip text={TOOLTIPS.baixarLote}>…</ButtonTooltip>`.
- Comentários `{/* Exportar Excel */}` e `{/* Baixar txt */}` preservados.
- Badge contadora (linhas 744–748) inalterada.

### 5. Botões de ação na linha (linhas 922–963)

- Remover o `<TooltipProvider>` interno (linhas 923 e 962).
- A `<div className="flex items-center justify-center gap-2">` permanece como wrapper.
- Botão de download TXT: remover o `<Tooltip>/<TooltipTrigger asChild>/<TooltipContent>` (linhas 926–945) e envolver o `<Button>` em `<ButtonTooltip text={TOOLTIPS.baixarTxt}>…</ButtonTooltip>`.
- `<EFDExportDialog>` (linhas 947–951) **não recebe tooltip** — componente próprio, fora do escopo.
- Botão "Analisar" (linhas 953–960): envolver em `<ButtonTooltip text={TOOLTIPS.analisar}>…</ButtonTooltip>`.

### 6. Inalterado

- `FieldTooltip` e tooltips dos filtros de busca.
- `<TooltipProvider delayDuration={300}>` global na linha 544 (continua envolvendo toda a página).
- Lógica de queries, handlers, formatadores, estados e seleção múltipla.
- Imports (`Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` já importados).
- `EFDExportDialog`, `EFDAnalysisModal`, Badge contadora.

### Resultado

Cabeçalhos com sublinhado pontilhado revelando descrição ao hover; botões "Exportar excel", "Baixar txt", download TXT por linha e "Analisar" com dica curta padronizada (220 px, centralizada, normal-case); JSX sem strings hardcoded e sem `TooltipProvider` aninhados.

