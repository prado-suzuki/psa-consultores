

## Plano: Scroll horizontal + Freeze Panes — Versão Final

### 1. Causa raiz

O `overflow-x-hidden` no content wrapper do `DevLayout.tsx` **clipa** o conteúdo antes que os `overflow-x-auto` dos Cards/tabelas possam ativar scrollbars. Além disso, o componente `Table` do shadcn/ui envolve a `<table>` em um `<div className="relative w-full overflow-auto">`, criando um wrapper de scroll redundante que conflita com o scroll do Card pai.

### 2. Solução: container único de scroll (sem scrollbar dupla)

Para eliminar o wrapper duplo, **não usaremos** o componente `<Table>` do shadcn nas tabelas densas. Em vez disso, usaremos `<table>` nativo com as mesmas classes do shadcn (`w-full caption-bottom text-sm`). Isso remove o `<div overflow-auto>` intermediário e deixa o scroll controlado exclusivamente pelo wrapper externo.

### 3. Arquivos e alterações

#### 3a. `src/components/equipe/dev/DevLayout.tsx` (1 linha)

```tsx
// De:
<div className="p-6 max-w-full overflow-x-hidden">{children}</div>

// Para:
<div className="p-6 w-full min-w-0">{children}</div>
```

#### 3b. `src/components/equipe/dev/pis-cofins/ApuracaoDataTable.tsx`

- Trocar `<Table>` por `<table className="w-full caption-bottom text-sm min-w-max">` (elimina wrapper de scroll interno)
- Manter wrapper externo `overflow-x-auto max-w-full` como único scroll container
- Aplicar **sticky columns** nas células fixas (CST, Conta, Descrição, Bloco) usando `bg-card` (cor semântica):

```tsx
// Constantes de largura para colunas fixas
const STICKY_WIDTHS = { CST: 80, Conta: 100, Descrição: 250, Bloco: 80 };

// Calcular left acumulado para cada coluna fixa
const stickyConfig = firstColumns.map((col, i) => {
  const w = STICKY_WIDTHS[col.label] || 100;
  const left = firstColumns.slice(0, i).reduce((sum, c) => sum + (STICKY_WIDTHS[c.label] || 100), 0);
  const isLast = i === firstColumns.length - 1;
  return { ...col, width: w, left, isLast };
});
```

Cada `<TableCell>` fixa recebe:
```tsx
className="sticky z-10 bg-card"
style={{ left: config.left, minWidth: config.width }}
// última coluna fixa adiciona sombra de separação:
// shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]
```

- Aplicar `sticky top-0 z-30 bg-muted/50` no `<thead>` para header fixo vertical

#### 3c. `src/components/equipe/dev/pis-cofins/DynamicTableHeader.tsx`

- Trocar `<TableHeader>` por `<thead className="bg-muted/50 sticky top-0 z-30 [&_tr]:border-b">`
- Aplicar sticky + left calculado nos `<TableHead>` das `firstColumns`:

```tsx
// Receber stickyConfig como prop (array com { label, width, left, isLast })
{stickyConfig.map((col) => (
  <TableHead
    key={col.label}
    className={cn(
      "font-bold uppercase text-xs text-muted-foreground border-r sticky z-40 bg-muted/50",
      col.isLast && "shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]"
    )}
    style={{ left: col.left, minWidth: col.width }}
    rowSpan={headerRowsCount}
  >
    {col.label}
  </TableHead>
))}
```

A interface `firstColumns` muda de `{ label: string }[]` para incluir `width`, `left`, `isLast`.

#### 3d. `src/pages/equipe/dev/ApuracaoPisCofins.tsx` (~10 tabelas inline)

Todas as tabelas inline seguem o mesmo padrão:
- Trocar `<Table>` por `<table className="w-full caption-bottom text-sm min-w-max">`
- A primeira coluna ("Descrição", "Rateio das receitas", etc.) recebe `sticky left-0 z-10 bg-card` com `minWidth: 250px`
- A sombra de separação é aplicada nessa coluna (já que é a única fixa)
- Usar `bg-card` em linhas normais, `bg-muted/50` em linhas destacadas (mantendo as classes semânticas existentes)

### 4. Resumo de cores semânticas

| Contexto | Classe usada |
|----------|-------------|
| Células fixas (body) | `bg-card` |
| Células fixas (header) | `bg-muted/50` |
| Linhas destacadas | `bg-muted/50` (já existente) |
| Linha total | `bg-primary/5` (já existente) |

Nenhum `bg-white` hardcoded. Tudo via variáveis semânticas do tema.

### 5. Impacto e riscos

- **DevLayout `min-w-0`**: Impacta todas as páginas Dev. É seguro — apenas impede expansão do flex child sem clipar conteúdo. Outras páginas Dev não têm tabelas largas afetadas.
- **`<table>` nativo vs `<Table>`**: Mantemos `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` do shadcn (são wrappers finos de `thead/tbody/tr/th/td`). Só o `Table` raiz é substituído por `<table>` para eliminar o div wrapper.
- **Scroll único garantido**: Card (`overflow-x-auto`) → `<table min-w-max>`. Sem wrappers intermediários.

