

## Plan revisado: Refatorar calendários — Gray-900, sem react-day-picker

### Ajustes incorporados

1. **Prop `disabled` no Calendar** — suportará `boolean | ((date: Date) => boolean)`
2. **Grid fixo de 42 células (6 linhas)** — preenche início com dias do mês anterior e fim com dias do mês seguinte, ambos com estilo desabilitado (`text-gray-300 pointer-events-none`)
3. **Consumidores preservam lógica de desabilitação** — mapeada para a nova prop `disabled`

---

### Arquivo 1: `src/components/ui/calendar.tsx` — Reescrita total

**Sai:**
- `react-day-picker`, `DayPicker`, `ptBR` locale, `buttonVariants`, `CalendarProps` (tipo DayPicker)
- Toda renderização delegada ao DayPicker

**Entra:**
- Componente customizado com `mode: 'days' | 'months' | 'years'`
- Props: `selected?: Date`, `onSelect?: (d: Date) => void`, `month?: Date`, `onMonthChange?: (d: Date) => void`, `disabled?: boolean | ((date: Date) => boolean)`, `className?: string`
- Grid fixo de 42 células: dias do mês anterior (cinza claro, não clicáveis) + dias do mês + dias do mês seguinte
- Dias desabilitados via prop `disabled` recebem `opacity-50 pointer-events-none`
- Header com navegação Dias → Meses → Anos (botões clicáveis no header, sem dropdowns)
- Paleta Gray-900: selecionado = `bg-gray-900 text-white`, hoje = `bg-gray-100 text-gray-900`
- Usa `Button` e `cn` do repositório (não recria)
- Largura fixa `w-[280px]`, `pointer-events-auto` embutido

**Lógica do grid fixo (42 células):**
```text
prevMonthDays = daysFromPreviousMonth to fill row 1
currentMonthDays = 1..daysInMonth
nextMonthDays = fill remaining to reach 42 total
```
Dias fora do mês atual: `text-gray-300 pointer-events-none`

### Arquivo 2: `src/components/ui/month-year-picker.tsx` — Refatoração

**Sai:** header com `<span>` estático, paleta primary/accent, `maxYear = +1`

**Entra:** estado `mode: 'months' | 'years'` + `yearGridStart`, ano clicável → grid de 12 anos, paleta Gray-900, `maxYear = +5`, reset de mode ao abrir. Helpers inalterados.

### Arquivo 3: `src/components/ui/month-range-picker.tsx` — Refatoração

**Sai:** header com `<span>` estático, paleta teal, `maxYear = +1`, import `Calendar` icon do lucide no trigger

**Entra:** estado `mode: 'months' | 'years'` + `yearGridStart`, ano clicável → grid de anos, paleta Gray-900 (`bg-gray-900 text-white` selecionado, `bg-gray-100` range), `maxYear = +5`, hint com `text-gray-500`. Helpers inalterados.

---

### Adaptação dos consumidores (9 arquivos, ~13 pontos)

Padrão de migração:
```tsx
// ANTES
<Calendar mode="single" selected={d} onSelect={fn} disabled={rule} initialFocus className="p-3 pointer-events-auto" />

// DEPOIS
<Calendar selected={d} onSelect={fn} disabled={rule} />
```

- Remover: `mode="single"`, `initialFocus`, `className`, `locale`
- **Preservar**: prop `disabled` com a mesma função — passa direto para a nova API

**Arquivos afetados e suas regras de disabled:**

| Arquivo | disabled |
|---|---|
| `DateFieldWithInput.tsx` | `(date) => date.getFullYear() < 2000 \|\| date.getFullYear() > 2060` |
| `PerFormModal.tsx` | `(date) => date > new Date()` |
| Demais 7 arquivos Dev (AuditoriaFiscal, CalculadoraIbsCbs, ConsultaXMLs, CorrecoesSped, AuditoriaCruzada, DcompFormModal, SituacaoFormModal, PerDetailModal) | sem disabled — apenas remover props obsoletas |
| `DashboardFilters.tsx` | sem disabled — apenas remover props obsoletas |

---

### Dependência removida do `package.json`

| Pacote | Motivo |
|---|---|
| `react-day-picker` | Único consumidor era `calendar.tsx` |

`date-fns` permanece (usado em 7+ arquivos).

---

### Ordem de execução

1. Reescrever `calendar.tsx` (com `disabled` prop e grid fixo 42 células)
2. Reescrever `month-year-picker.tsx`
3. Reescrever `month-range-picker.tsx`
4. Adaptar os 9 arquivos consumidores (preservando `disabled`)
5. Remover `react-day-picker` do `package.json`

