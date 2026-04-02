

## Plan: Fechamento automático de calendários via componente wrapper centralizado

### Problema
Todos os 13+ locais que usam `Popover > Calendar` mantêm o popover aberto após seleção de data. Apenas `PerFormModal` já implementa `open/setOpen` manualmente — e esse é exatamente o padrão que **não** queremos duplicar.

### Solução: Componente `DatePickerPopover`

Criar `src/components/ui/date-picker-popover.tsx` — um wrapper que encapsula `Popover + PopoverTrigger + PopoverContent + Calendar` com estado controlado interno e fechamento automático no `onSelect`.

#### API do componente

```tsx
interface DatePickerPopoverProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  disabled?: boolean | ((date: Date) => boolean);
  placeholder?: string;
  triggerClassName?: string;
  align?: "start" | "center" | "end";
  formatStr?: string; // default "dd/MM/yyyy"
  children?: React.ReactNode; // custom trigger (opcional)
}
```

#### Lógica interna
- `const [open, setOpen] = useState(false)` — estado controlado do `Popover`
- No `onSelect` do `Calendar`: chama `props.onSelect(date)` e depois `setOpen(false)`
- Trigger padrão: `Button variant="outline"` com `CalendarIcon` + data formatada
- Se `children` for passado, usa como trigger customizado

### Arquivos consumidores a refatorar (13 locais em 10 arquivos)

| Arquivo | Calendários | Padrão atual |
|---|---|---|
| `AuditoriaCruzada.tsx` | 2 | Popover não-controlado |
| `CorrecoesSped.tsx` | 2 | Popover não-controlado |
| `AuditoriaFiscal.tsx` | 2 | Popover não-controlado |
| `ConsultaXMLs.tsx` | 2 | Popover não-controlado |
| `CalculadoraIbsCbs.tsx` | 2 | Popover não-controlado |
| `DcompFormModal.tsx` | 1 | Popover não-controlado |
| `SituacaoFormModal.tsx` | 1 | Popover não-controlado |
| `PerDetailModal.tsx` | 1 | Popover não-controlado |
| `PerFormModal.tsx` | 1 | Já tem open/setOpen (remover e usar wrapper) |
| `WorkPackageForm.tsx` | 2 | Popover não-controlado |
| `TaskModal.tsx` | 2 | Popover não-controlado |
| `EquipeKanban.tsx` | 2 | Popover não-controlado |
| `DashboardFilters.tsx` | 2 | Popover não-controlado |
| `DateFieldWithInput.tsx` | 1 | Popover não-controlado (trigger é ícone, input ao lado) |

**Total**: ~23 calendários em 14 arquivos.

Para `DateFieldWithInput`: como tem um layout especial (input + ícone), usará apenas o `Popover` controlado inline (3 linhas: `open`, `setOpen`, `setOpen(false)` no onSelect) — é o único caso onde o wrapper não se aplica diretamente por causa do trigger custom com input.

### MonthYearPicker e MonthRangePicker

Ambos **já fecham automaticamente** após seleção (`setOpen(false)` no `handleMonthSelect` / após selecionar end). Nenhuma alteração necessária nesses componentes.

### Detalhes técnicos

**Novo arquivo**: `src/components/ui/date-picker-popover.tsx`
- Importa `Calendar`, `Popover*`, `Button`, `CalendarIcon`, `format`, `cn`
- Estado `open/setOpen` interno
- Renderiza trigger padrão ou `children` via `PopoverTrigger asChild`
- `PopoverContent` com `className="w-auto p-0"` e `align` configurável
- Calendar recebe `selected`, `disabled`, e `onSelect` que fecha o popover

**Refatoração dos 14 arquivos**: substituir blocos `<Popover><PopoverTrigger>...<PopoverContent><Calendar .../></PopoverContent></Popover>` por `<DatePickerPopover selected={...} onSelect={...} disabled={...} />`. Remove imports de `Popover*`, `Calendar`, `CalendarIcon` quando não mais utilizados.

### Ordem de execução

1. Criar `date-picker-popover.tsx`
2. Refatorar os 14 arquivos consumidores (em paralelo quando possível)
3. Limpar imports não utilizados

