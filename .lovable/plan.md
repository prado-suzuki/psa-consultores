

## Plan: Normalizar nr_per para somente dígitos

### Passo 0+1 — Data cleanup (via insert tool)

Executar em sequência:

```sql
-- Passo 0: Deduplicação
DELETE FROM per WHERE nr_per IN (
  '04811.37532.030725.1.1.19-3203',
  '23406.22411.030725.1.1.18-7808',
  '23578.79007.260925.1.1.18-2904',
  '31942.50758.311024.1.1.18-1220',
  '32272.39472.260925.1.1.19-1489'
);

-- Passo 1: Limpeza (filhos antes de pais)
UPDATE per_situacao SET nr_proc_per = regexp_replace(nr_proc_per, '\D', '', 'g') WHERE nr_proc_per ~ '\D';
UPDATE dcomp SET nr_per_orig = regexp_replace(nr_per_orig, '\D', '', 'g') WHERE nr_per_orig ~ '\D';
UPDATE dcomp SET nr_dcomp_ret = regexp_replace(nr_dcomp_ret, '\D', '', 'g') WHERE nr_dcomp_ret IS NOT NULL AND nr_dcomp_ret ~ '\D';
UPDATE dcomp SET nr_documento = regexp_replace(nr_documento, '\D', '', 'g') WHERE nr_documento ~ '\D';
UPDATE per SET nr_proc_ret = regexp_replace(nr_proc_ret, '\D', '', 'g') WHERE nr_proc_ret IS NOT NULL AND nr_proc_ret ~ '\D';
UPDATE per SET nr_per = regexp_replace(nr_per, '\D', '', 'g') WHERE nr_per ~ '\D';
```

### Passo 2 — Salvamento: strip antes de persistir

**`src/lib/perdcompUtils.ts`** — adicionar:
```typescript
export const stripToDigits = (v: string) => v.replace(/\D/g, '');
```

**`PerFormModal.tsx`** (linhas 281-296) — strip nos campos antes do insert:
- `data.nr_per` → `stripToDigits(data.nr_per)`
- `data.nr_proc_ret` → `stripToDigits(...)` 
- `nr_proc_per` nas inserções de per_situacao (linhas 296, 306)

**`DcompFormModal.tsx`** (linhas 220-231, 254-267) — strip nos campos:
- `data.nr_documento` → `stripToDigits(data.nr_documento)`
- `data.nr_per_orig` → `stripToDigits(data.nr_per_orig)`
- `data.nr_dcomp_ret` → `stripToDigits(...)`

**`SituacaoFormModal.tsx`** — strip `nr_proc_per` antes do insert/update.

**`CargaPerdcompCSV.tsx`** — strip `nr_per`, `nr_proc_ret`, `nr_proc_per`, `nr_documento`, `nr_per_orig` durante importação.

### Passo 3 — Busca: normalizar input do usuário

**`ControlePerdcomp.tsx`** (linhas 275-280):
```typescript
const filterDigits = processoFilter.replace(/\D/g, '');
const matchPer = item.nr_per.includes(filterDigits);
const matchDcomp = dcompData.some(
  (d: any) => d.nr_per_orig === item.nr_per && d.nr_documento.includes(filterDigits),
);
```

**`PerFormModal.tsx`** (linha 211) — filtro de PERs existentes no combobox:
```typescript
per.nr_per.includes(perSearchQuery.replace(/\D/g, ''))
```

### Resumo

| Camada | Arquivos |
|---|---|
| Data cleanup | SQL (insert tool) |
| Utilidade | `perdcompUtils.ts` (+1 função) |
| Save | `PerFormModal`, `DcompFormModal`, `SituacaoFormModal`, `CargaPerdcompCSV` |
| Busca | `ControlePerdcomp`, `PerFormModal` |

**6 arquivos + 1 SQL execution.**

