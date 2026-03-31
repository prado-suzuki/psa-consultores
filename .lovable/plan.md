

## Plan: Excel-style Filter/Sort Dropdowns for CST, Conta, Bloco Columns

### Overview
Add Excel-style filter/sort dropdown menus to the sticky columns (CST, Conta, Bloco) in the `ApuracaoDataTable` component. Each column header gets a clickable filter icon that opens a popover with sort buttons and checkbox-based value filtering.

### New Component
**`src/components/equipe/dev/pis-cofins/ColumnFilterDropdown.tsx`**
- Popover-based dropdown anchored to a filter icon button in the column header
- Two sections inside:
  1. **Sort**: "Crescente" / "Decrescente" buttons (highlight active)
  2. **Filter**: Scrollable checkbox list of unique values, with "Selecionar tudo" and "Limpar" actions, and a "Confirmar" button
- Props: `columnKey`, `uniqueValues: string[]`, `activeSort`, `activeFilter: Set<string> | null`, `onSort`, `onFilter`
- Filter icon uses a distinct color (e.g. `text-primary`) when sort or filter is active on that column

### Changes to `ApuracaoDataTable.tsx`
- Add internal state:
  - `sortConfig: { key: string; direction: 'asc' | 'desc' } | null` — only one column sorted at a time
  - `columnFilters: Record<string, Set<string>>` — multiple columns can have active filters
- Compute filtered + sorted data via `useMemo`:
  1. Apply filters from all columns (intersection/AND logic)
  2. Compute unique values per filterable column from data filtered by *other* columns (cascading filter)
  3. Apply sort
- Render `ColumnFilterDropdown` inside the sticky header cells for CST, Conta, Bloco (only when `showCst`/`showBloco` are true respectively; Conta is always shown)
- The `Descrição` column does NOT get a filter dropdown
- Totals row recalculates based on filtered data

### Technical Details
- Uses existing `Popover`/`PopoverTrigger`/`PopoverContent` from Radix
- Uses existing `Checkbox` component for the value list
- `Filter` icon from `lucide-react` for the header button
- Cascading filters: unique values for column X are derived from data filtered by all columns *except* X
- Sort is exclusive across columns (setting sort on one clears others)
- Filter state is internal to `ApuracaoDataTable` (resets when `data` prop changes)

