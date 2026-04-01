

## Plan: Add `horas_contratadas` to `os_produtos_contratados`

### 1. Database Migration
```sql
ALTER TABLE public.os_produtos_contratados ADD COLUMN horas_contratadas numeric;
```

### 2. Type update — `src/types/clientForm.ts`
Add `horas_contratadas?: number` to `DraftProdutoContratado`.

### 3. Frontend field — `ContratosTab.tsx`
Add numeric input "Horas Contratadas" in the repeatable product block, both edit and read-only modes.

### 4. Save logic — `useSaveClientTransaction.ts`
- **Insert** (line ~352): include `horas_contratadas` in the insert payload.
- **Update** (line ~370): update both `produto_segmento_id` and `horas_contratadas`, but only when either value actually changed. If the user edits the OS without touching `horas_contratadas`, the draft will carry the loaded value through, so the update payload will contain the same value (no data loss). The existing select at line 324 will be expanded to also fetch `horas_contratadas` for the diff comparison.

### 5. Load on edit — `useClientEditData.ts`
Add `horas_contratadas` to the select query for `os_produtos_contratados` and map it into `DraftProdutoContratado`.

### 6. Hook — `useOsProdutosContratados.ts`
Add `horas_contratadas` to interface `OsProdutoContratado`, select query, and mapping.

### 7. Projects listing — `FiscalProjetosCadastro.tsx`
Add a "Hrs Contratadas" column showing the sum (or per-product values) from `osProdutos` data already available via the hook.

### Files changed
- Migration SQL (1 statement)
- `src/types/clientForm.ts`
- `src/components/equipe/client-form/ContratosTab.tsx`
- `src/hooks/useSaveClientTransaction.ts`
- `src/hooks/useClientEditData.ts`
- `src/hooks/useOsProdutosContratados.ts`
- `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`

