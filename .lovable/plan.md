

## Plano: Tooltips na tabela e ações do `ConsultaECF.tsx`

Arquivo único: `src/pages/equipe/dev/ConsultaECF.tsx`. Filtros (já com `FieldTooltip`) **não serão tocados**.

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
  cliente: "Filtra as ECF por cliente ou grupo.",
  contribuinte: "CNPJ/CPF vinculado ao cliente. Obrigatório para a busca.",
  dataInicio: "Define o período inicial da busca.",
  dataFim: "Define o período final da busca.",
  // novos
  colArquivo: "Nome e ID do arquivo ECF processado.",
  colPeriodo: "Mês inicial e final da escrituração.",
  colTipo: "Status do arquivo (Original ou Retificadora).",
  colSituacao: "Indicador de situação especial (Fusão, Cisão, etc.).",
  colAcoes: "Opções de download, exportação Excel e análise em tela.",
  exportarLote: "Exportar arquivo(s) selecionado(s) para Excel.",
  baixarLote: "Download individual ou em lote (ZIP) dos arquivos selecionados.",
  baixarTxt: "Download do arquivo ECF original (.txt).",
  analisar: "Abre a análise detalhada dos blocos e registros do arquivo em tela.",
} as const;
```

### 3. Cabeçalho da tabela (`<thead>`, linhas 482–491)

Trocar o conteúdo textual de cada `<th>` por `<ColumnTooltip label="…" text={TOOLTIPS.col…} />`. Classes do `<th>` preservadas. Coluna do Checkbox (linha 484) intacta.

| Coluna | Chave |
|---|---|
| Arquivo | `colArquivo` |
| Período | `colPeriodo` |
| Tipo | `colTipo` |
| Situação Especial | `colSituacao` |
| Ações | `colAcoes` |

### 4. Botões globais do header da tabela (linhas 440–460)

- Remover ambos os `<TooltipProvider>` aninhados (linhas 440–449 e 450–460) — provider global na linha 366 já cobre.
- Envolver `<Button>` "Exportar excel" em `<ButtonTooltip text={TOOLTIPS.exportarLote}>…</ButtonTooltip>`.
- Envolver `<Button>` "Baixar txt" em `<ButtonTooltip text={TOOLTIPS.baixarLote}>…</ButtonTooltip>`.
- Badge contadora (linha 439) inalterada.

### 5. Botões de ação na linha (linhas 516–533)

- Remover o `<TooltipProvider>` interno (linhas 517 e 532).
- Manter a `<div className="flex items-center justify-center gap-2">` como wrapper.
- Botão de download TXT: remover o `<Tooltip>/<TooltipTrigger asChild>/<TooltipContent>` (linhas 519–526) e envolver o `<Button>` em `<ButtonTooltip text={TOOLTIPS.baixarTxt}>…</ButtonTooltip>`.
- `<EFDExportDialog>` (linha 527) **inalterado**.
- Botão "Analisar" (linhas 528–530): envolver em `<ButtonTooltip text={TOOLTIPS.analisar}>…</ButtonTooltip>`.

### 6. Inalterado

- `FieldTooltip` e tooltips dos filtros.
- `<TooltipProvider delayDuration={300}>` global na linha 366.
- Lógica de queries, handlers, formatadores, estados, seleção.
- Imports (`Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` já presentes).
- `EFDExportDialog`, `EFDAnalysisModal`, `SIT_ESP_MAP`.

### Resultado

Cabeçalhos com sublinhado pontilhado e dica ao hover; botões "Exportar excel", "Baixar txt", download TXT por linha e "Analisar" com tooltip padronizado (220 px, centralizado, normal-case); JSX sem strings hardcoded e sem `TooltipProvider` aninhados.

