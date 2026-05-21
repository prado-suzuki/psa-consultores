# Migração: vincular `distribuicao_dcomp` ao catálogo RFB e enxugar `dcomp`

Refletir no schema as mudanças já feitas no `DcompFormModal`: rateio passa a apontar para o catálogo (`grupo_tributo` / `codigo_receita`) e `dcomp` perde três colunas derivadas (`imposto`, `tp_credito`, `porcentagem_psa`).

## Escopo

1. Adicionar colunas + FKs + índices em `distribuicao_dcomp`.
2. Backfill best-effort de `grupo_tributo_id` a partir do `tributo` legado.
3. Ajustes de código que referenciam as colunas a serem dropadas em `dcomp`.
4. `DROP COLUMN` das três colunas em `dcomp`.
5. Validações pós-migração.

Manter intactos: `distribuicao_dcomp.tributo` (snapshot legível), policies RLS, `grupo_tributo` e `codigo_receita`.

## Schema — `distribuicao_dcomp`

- `grupo_tributo_id uuid NULL` → FK `grupo_tributo(id)` ON DELETE RESTRICT
- `codigo_receita_id uuid NULL` → FK `codigo_receita(id)` ON DELETE RESTRICT
- Índices: `idx_distribuicao_dcomp_grupo_tributo_id`, `idx_distribuicao_dcomp_codigo_receita_id`

## Schema — `dcomp` (DROP)

- `dcomp.porcentagem_psa` → vive em `per.porcentagem_psa`
- `dcomp.imposto` → derivado do rateio (`distribuicao_dcomp` + catálogo)
- `dcomp.tp_credito` → idêntico a `per.tp_credito`

Conferência de dependências no DB (já feita):
- Nenhuma view em `public` referencia simultaneamente `dcomp` + essas colunas. A view `per_with_contribuinte` usa `per.tp_credito` e `per.porcentagem_psa` — não afetada.
- Único trigger em `dcomp` é `update_dcomp_atualizado_em` (timestamp) — não afetado.
- Policies de `dcomp` não referenciam as colunas pelo nome.

## Backfill

Mapeamento sigla legada → `grupo_tributo.sigla`:

| `distribuicao_dcomp.tributo` | `grupo_tributo.sigla` |
|---|---|
| PIS | PIS/PASEP |
| COFINS | COFINS |
| IPI | IPI |
| INSS | CP SEGURADOS |
| IRRF | IRRF |
| IRPJ | IRPJ |
| CSLL | CSLL |
| CSRF | CSRF |

`UPDATE distribuicao_dcomp SET grupo_tributo_id = (SELECT id FROM grupo_tributo WHERE sigla = <alvo>) WHERE grupo_tributo_id IS NULL AND tributo = <legado>` — idempotente. `codigo_receita_id` permanece NULL (usuário escolhe ao editar).

## Código a ajustar (frontend / edge) antes ou junto do DROP

Estas referências quebrariam o build assim que `types.ts` for regerado pós-migração. Vou atualizá-las **na mesma rodada de implementação**, após aprovação:

- `src/lib/syncPerdcomp.ts` — remover `imposto`, `tp_credito`, `porcentagem_psa` do tipo `DcompRecord`.
- `supabase/functions/sync-perdcomp/index.ts` — mesma limpeza nos tipos `DcompRecord` / `PerRecord` no que tange a `dcomp` (manter `per.tp_credito` e `per.porcentagem_psa`).
- `src/components/equipe/dev/perdcomp/CargaPerdcompCSV.tsx` — remover as três colunas do insert de DCOMP e do help text/exemplo CSV.
- `src/pages/equipe/dev/ControlePerdcomp.tsx` (l.775, l.777) — substituir `item.tp_credito` / `item.porcentagem_psa` pelos campos do PER pai (já carregado no map).
- `src/components/equipe/dev/perdcomp/PerDetailModal.tsx` (l.319) — `tributoExibido: d.imposto` passa a vir do snapshot do rateio (`distribuicao_dcomp.tributo` / futuro `grupo_tributo.sigla`). Curto prazo: cair para string vazia ou usar a sigla do rateio agregado.

Nada em `PerFormModal.tsx` é afetado — todas as refs de `tp_credito` / `porcentagem_psa` ali são da tabela `per`.

## Ordem de execução

1. `ALTER TABLE distribuicao_dcomp` + FKs + índices.
2. Backfill `grupo_tributo_id`.
3. Editar os 5 arquivos do bloco acima.
4. `ALTER TABLE dcomp DROP COLUMN` × 3.
5. Validações.

## Validações pós-migração

```sql
-- 1. Novas colunas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='distribuicao_dcomp'
  AND column_name IN ('grupo_tributo_id','codigo_receita_id');
-- 2 linhas, uuid, YES.

-- 2. FKs
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid='public.distribuicao_dcomp'::regclass AND contype='f'
  AND (conname LIKE '%grupo_tributo%' OR conname LIKE '%codigo_receita%');

-- 3. Colunas removidas
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='dcomp'
  AND column_name IN ('porcentagem_psa','imposto','tp_credito');
-- 0 linhas.

-- 4. Backfill
SELECT count(*) FILTER (WHERE grupo_tributo_id IS NOT NULL) AS com_grupo,
       count(*) FILTER (WHERE grupo_tributo_id IS NULL)     AS sem_grupo,
       count(*) AS total
FROM distribuicao_dcomp;

-- 5. Siglas fora do mapa (esperado: 0)
SELECT tributo, count(*)
FROM distribuicao_dcomp
WHERE grupo_tributo_id IS NULL AND tributo IS NOT NULL AND tributo <> ''
GROUP BY tributo ORDER BY count(*) DESC;
```
