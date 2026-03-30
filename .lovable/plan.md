

## Plano: Multi-expansão de anos + diferenciação visual

### Problema
O estado `expandedYear` é `string | null` — só suporta um ano expandido por vez. Ao expandir outro, o anterior fecha.

### Alterações

**1. `ApuracaoPisCofins.tsx` — trocar estado de `string | null` para `Set<string>`**
- `expandedYear: string | null` → `expandedYears: Set<string>`
- `setExpandedYear` → função `toggleYear(year: string)` que adiciona/remove do Set
- Reset continua limpando para `new Set()`
- Atualizar `dataTableProps` e `headerProps` para passar `expandedYears` e `toggleYear`

**2. `useTableHeaders.ts` — aceitar `Set<string>` em vez de `string | null`**
- Param `expandedYear: string | null` → `expandedYears: Set<string>`
- Condição `expandedYear === year` → `expandedYears.has(year)`
- `hasExpandedYear` → `expandedYears.size > 0`

**3. `ApuracaoDataTable.tsx` — atualizar tipos das props**
- `expandedYear: string | null` → `expandedYears: Set<string>`
- `setExpandedYear: (year: string | null) => void` → `toggleYear: (year: string) => void`
- Repassar para `useTableHeaders` e `DynamicTableHeader`

**4. `DynamicTableHeader.tsx` — atualizar props + cores diferenciadas**
- `setExpandedYear` → `toggleYear`
- Botão de colapsar: `onClick={() => toggleYear(top.id)}` (em vez de `setExpandedYear(null)`)
- Botão de expandir: `onClick={() => toggleYear(top.id)}`
- Cor diferenciada suave: anos expandidos com `bg-primary/10` no header, meses (row2) com `bg-primary/5`; anos colapsados mantêm `bg-muted/50`

### Arquivos modificados

| Arquivo | Alteração |
|---------|-----------|
| `ApuracaoPisCofins.tsx` | Estado `Set<string>`, função `toggleYear` |
| `useTableHeaders.ts` | Param `Set<string>`, lógica `.has()` |
| `ApuracaoDataTable.tsx` | Props atualizadas |
| `DynamicTableHeader.tsx` | Props + toggle + cores diferenciadas |

