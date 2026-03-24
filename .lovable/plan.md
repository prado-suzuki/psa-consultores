

## Plano: Substituir seletores de data por MonthYearPicker na Auditoria Cruzada

### Tipo do MonthYearPicker
O componente emite `{ month: number; year: number } | null`. Os helpers `monthYearToDateString` já convertem para `YYYY-MM-DD` com primeiro/último dia.

### Alterações

**1. `src/contexts/AuditoriaContext.tsx`**
- Mudar tipo de `dataInicio` e `dataFim` de `Date | undefined` para `{ month: number; year: number } | null`
- Ajustar setters e `handleLimpar` (usar `null` em vez de `undefined`)

**2. `src/pages/equipe/dev/AuditoriaCruzada.tsx`**
- Remover imports: `Popover`, `PopoverContent`, `PopoverTrigger`, `Calendar`, `CalendarIcon`, `format`, `ptBR`
- Importar `MonthYearPicker` e `monthYearToDateString` de `@/components/ui/month-year-picker`
- Substituir os dois blocos de Popover+Calendar por `<MonthYearPicker>` com `className="h-8 text-sm"`
- Converter datas para API usando `monthYearToDateString(dataInicio, 'start')` e `monthYearToDateString(dataFim, 'end')` nos 3 hooks de consulta

### Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `AuditoriaContext.tsx` | Tipagem `Date → MonthYear \| null` |
| `AuditoriaCruzada.tsx` | Substituir Calendar por MonthYearPicker + conversão API |

2 arquivos, ~30 linhas de alteração.

