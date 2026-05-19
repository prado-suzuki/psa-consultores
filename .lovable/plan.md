## Objetivo

1. Adicionar colunas `valor_original` em `distribuicao_dcomp` e `vlr_ressarcido_original` em `per` (NULL, sem backfill).
2. Em `DcompFormModal.tsx`, congelar `valor_original` por linha em modo edição, recalculando somente quando `dt_envio` ou `valor_tributo` da linha mudarem.

## Parte 1 — Migration

```sql
ALTER TABLE public.distribuicao_dcomp
  ADD COLUMN IF NOT EXISTS valor_original NUMERIC(18,2) NULL;

ALTER TABLE public.per
  ADD COLUMN IF NOT EXISTS vlr_ressarcido_original NUMERIC(18,2) NULL;
```

- Nullable, sem CHECK / trigger / view / RLS / backfill.
- `src/integrations/supabase/types.ts` é regenerado automaticamente após aplicar.

## Parte 2 — `src/components/equipe/dev/perdcomp/DcompFormModal.tsx`

### Tipo (linha 87)
- `DistribuicaoLinha`: adicionar `valor_original?: number | null`.

### Query `dcomp-distribuicoes` (linha 194)
- Incluir `valor_original` no `SELECT`.
- No mapping: `valor_original: r.valor_original != null ? Number(r.valor_original) : null`.

### Snapshot do `dt_envio` original
- Novo `useMemo` `dtEnvioOriginal = editData?.dt_envio ?? null` (somente em modo edição).
- Comparar com `form.watch('dt_envio')` para detectar mudança de data.

### `persistirDistribuicoes` (linha 375)
- Manter o padrão atual de delete+insert (escopo pedido pelo usuário: "Linhas inalteradas mantêm o valor_original do banco intacto no reinsert").
- Para cada linha, calcular `valor_original_final`:
  ```
  const dtEnvioMudou = isEditing && dtEnvioOriginal && form.getValues('dt_envio') !== dtEnvioOriginal;
  const linhaOriginal = isEditing
    ? distribuicoesExistentes.find(o => o.id === l.id)
    : undefined;
  const valorTributoMudou = linhaOriginal
    ? toCents(linhaOriginal.valor_tributo) !== toCents(l.valor_tributo)
    : true; // linha nova → recalcular
  const preservar =
    isEditing &&
    !dtEnvioMudou &&
    !valorTributoMudou &&
    l.valor_original != null;
  const valor_original_final = preservar
    ? l.valor_original
    : round2(l.valor_tributo * proporcaoOriginal);
  ```
- Modo criação (`!isEditing`): sempre recalcula (comportamento atual).

### Coluna "Valor Original" (linha 660 / render linha 674)
- Calcular por linha:
  ```
  const preservadoUI = isEditing &&
    linha.valor_original != null &&
    !dtEnvioMudou &&
    (linhaOriginalUI ? toCents(linhaOriginalUI.valor_tributo) === toCents(linha.valor_tributo) : false);
  const valorExibir = preservadoUI ? linha.valor_original : round2((linha.valor_tributo || 0) * proporcaoOriginal);
  ```
- Legadas (`valor_original == null`) sem alteração: exibir "—".

### Seed do estado (linha 298)
- `setDistribuicoes(distribuicoesExistentes)` já vai carregar `valor_original` (após inclusão no mapping). Sem outras mudanças.

## Arquivos tocados
- Migration SQL (nova).
- `src/components/equipe/dev/perdcomp/DcompFormModal.tsx`.
- `src/integrations/supabase/types.ts` (regenerado pelo Cloud).

## Não tocar
- `PerDetailModal.tsx`, `selicCalculator.ts`, `useSelicTaxaAt.ts`.
