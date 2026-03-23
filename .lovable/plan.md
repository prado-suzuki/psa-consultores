

## Plano: Calendário nos campos de Vigência

### Arquivo: `src/components/equipe/dev/pis-cofins/RegraFormSheet.tsx`

Substituir os `Input type="number"` dos campos `data_vigencia_inicio` e `data_vigencia_fim` pelo componente `MonthYearPicker` já existente no projeto, com conversão entre o formato `YYYYMM` (bigint) e `{month, year}`.

**1. Helpers de conversão** (no topo do arquivo):
```ts
// YYYYMM (202501) → { month: 0, year: 2025 }
const yyyymmToMonthYear = (val: number | null) => {
  if (!val) return null;
  const y = Math.floor(val / 100);
  const m = (val % 100) - 1; // 0-indexed
  return { month: m, year: y };
};

// { month: 0, year: 2025 } → 202501
const monthYearToYYYYMM = (val: { month: number; year: number } | null) => {
  if (!val) return null;
  return val.year * 100 + (val.month + 1);
};
```

**2. Formulário (edição/criação)** — linhas 220-238:
- Trocar `<Input type="number">` por `<MonthYearPicker>` com `value={yyyymmToMonthYear(field.value)}` e `onChange={v => field.onChange(monthYearToYYYYMM(v))}`

**3. Modo leitura** — linhas 136-139:
- Formatar o valor numérico YYYYMM como `MM/YYYY` para exibição legível (ex: `202501` → `01/2025`)

1 arquivo alterado, sem mudança de schema.

