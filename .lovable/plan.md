

## Plano: Criar SmartDatePicker com react-datepicker e aplicar na Consulta XMLs

### 1. Instalar dependências
- `react-datepicker` e `@types/react-datepicker`

### 2. Criar `src/components/ui/smart-date-picker.tsx`

Componente unificado com prop `mode: 'day' | 'month' | 'range'`:

- **Wrapper**: `<div className="custom-datepicker-wrapper flex flex-col w-full">`
- **Props**: `mode`, `selected`, `onChange`, `startDate`, `endDate`, `placeholder`, `className`
- **Modos**:
  - `day`: dateFormat `dd/MM/yyyy`
  - `month`: `showMonthYearPicker`, dateFormat `MM/yyyy`
  - `range`: `selectsRange`, `startDate`/`endDate`
- **Locale**: `registerLocale('pt-BR', ptBR)` via `date-fns/locale/pt-BR`
- **Input**: classe `w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm` (mesma do shadcn Input)
- **Popper**: `popperClassName="z-[100]"` para garantir visibilidade sobre modais
- **Estilos inline via CSS-in-JS** (bloco `<style>` ou arquivo CSS mínimo): cores teal da marca para dia selecionado (`bg-teal-600 text-white`), hover (`bg-teal-100`), header com `text-slate-700`
- NÃO importar `react-datepicker/dist/react-datepicker.css` — usar arquivo CSS custom `src/components/ui/smart-date-picker.css` com `@apply` Tailwind sob `.custom-datepicker-wrapper`

### 3. Criar `src/components/ui/smart-date-picker.css`

Estilos scoped sob `.custom-datepicker-wrapper`:
- `.react-datepicker`: `@apply bg-background border border-input rounded-md shadow-md`
- `.react-datepicker__header`: `@apply bg-background border-b border-input`
- `.react-datepicker__day--selected`: `@apply bg-teal-600 text-white rounded-md`
- `.react-datepicker__day:hover`: `@apply bg-teal-100 rounded-md`
- `.react-datepicker__day-name`, navigation: cores `text-slate-700`
- Input wrapper: `@apply w-full`

### 4. Atualizar `src/pages/equipe/dev/ConsultaXMLs.tsx`

- Remover imports: `Calendar`, `Popover`, `PopoverContent`, `PopoverTrigger`, `CalendarIcon`
- Importar `SmartDatePicker`
- Substituir blocos L716-748 e L750-783 por:
```tsx
<SmartDatePicker
  mode="day"
  selected={dataInicio ? parse(dataInicio, "yyyy-MM-dd", new Date()) : null}
  onChange={(date) => {
    setDataInicio(date ? format(date, "yyyy-MM-dd") : "");
    setSearchTriggered(false);
  }}
  placeholder="Selecione"
/>
```
(análogo para dataFim)

### O que NÃO muda
- Nenhuma outra ferramenta alterada
- Componentes `Calendar`, `MonthYearPicker`, `MonthRangePicker` continuam existindo
- Lógica de busca, filtros e tabela intactos

