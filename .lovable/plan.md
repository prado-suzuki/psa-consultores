## Objetivo
Eliminar completamente a lógica de soft delete (`excluido` / `nr_cancelamento`) do módulo PERDCOMP, fazer hard delete dos registros que hoje estão marcados como excluídos/cancelados e substituir o modal de soft delete por confirmação de exclusão definitiva.

## Diagnóstico atual
- `per` tem **1 registro** com `excluido='E'`: `nr_per = 111111111111111111111111`
- `dcomp` tem **1 registro** com `excluido='E'`: `nr_documento = 565432531312312312321312`
- Componentes/queries que ainda dependem da coluna no PERDCOMP:
  - `SoftDeleteModal.tsx` (será deletado)
  - `PerDetailModal.tsx`, `ControlePerdcomp.tsx`, `PerFormModal.tsx`, `DcompFormModal.tsx`, `SituacaoFormModal.tsx`, `CargaPerdcompCSV.tsx`
- `useDevClients.ts` usa `excluido` na tabela `cliente` (não relacionado, **não será tocado**).

## Etapas

### 1. Migração de banco
Em uma única migração transacional:
1. Hard delete cascata do PER `111111111111111111111111` (e seu `per_situacao` / `dcomp` / `distribuicao_dcomp`, se houver).
2. Hard delete do DCOMP `565432531312312312321312` (e sua `distribuicao_dcomp`).
3. `ALTER TABLE public.per DROP COLUMN excluido, DROP COLUMN nr_cancelamento;`
4. `ALTER TABLE public.dcomp DROP COLUMN excluido, DROP COLUMN nr_cancelamento;`

### 2. Frontend — remoção das referências
- **Deletar** `src/components/equipe/dev/perdcomp/SoftDeleteModal.tsx`.
- **`PerDetailModal.tsx`**: remover import e uso do `SoftDeleteModal`; trocar o botão "Excluir/Cancelar" por um novo `ConfirmDeleteModal` (AlertDialog simples) que faz `DELETE FROM per WHERE nr_per=...` + cascata DCOMP/per_situacao/distribuicao_dcomp. Remover campos `excluido` e `nr_cancelamento` da interface local. Remover `.or('excluido.is.null,excluido.eq.')` das queries.
- **`ControlePerdcomp.tsx`**: remover import/uso do `SoftDeleteModal`, substituir por confirmação de hard delete. Remover todos os `.or('excluido.is.null,excluido.eq.')` (linhas 182, 201, 241, 251, 277, 287). Manter os filtros `excluido=false` sobre `cliente` (tabela diferente).
- **`PerFormModal.tsx`**: remover `.or('excluido.is.null,excluido.eq.')` (linha 202). Remover lógica de "reativar registro soft-deleted" no upsert.
- **`DcompFormModal.tsx`**: remover `.or` (linhas 253, 274). Remover bloco `isSoftDeleted`/reativação (linhas ~535-555) — se DCOMP já existe, apenas erro de duplicidade.
- **`SituacaoFormModal.tsx`**: remover `.or` (linha 101).
- **`CargaPerdcompCSV.tsx`**: remover campos `excluido` e `nr_cancelamento` dos types e do mapeamento CSV.

### 3. Sincronização DW
- `src/lib/syncPerdcomp.ts` e `supabase/functions/sync-perdcomp/index.ts`: remover `excluido` e `nr_cancelamento` dos types `PerSync` / `DcompSync`. A função permanece, apenas sem esses campos.

### 4. Validação
- Confirmar via `select column_name from information_schema.columns where table_name in ('per','dcomp')` que as colunas foram removidas.
- Verificar build limpo (sem referências quebradas a `excluido`/`nr_cancelamento` no PERDCOMP).
- Testar no preview: tentar cadastrar o PER `20563.10632.230524.1.1.19-6008` em dev (deve funcionar) e fluxo de delete (deve abrir confirmação simples).

## Riscos / observações
- Hard delete é **irreversível**. Os 2 registros soft-deleted (1 PER + 1 DCOMP) serão perdidos definitivamente, junto com situações/distribuições associadas.
- O DW receberá no próximo sync apenas registros ativos; registros previamente sincronizados com `excluido='E'` no DW podem ficar órfãos lá — fora do escopo deste plano.
- Nenhuma alteração em `cliente`, `contribuinte`, `representante` ou outras tabelas com `excluido`.
