# Correção do bug de duplicação de tributos no DCOMP

## 1. Causa raiz

Em `DcompFormModal.persistirDistribuicoes` o save executa:

```text
DELETE FROM distribuicao_dcomp WHERE nr_documento = X
INSERT INTO distribuicao_dcomp (...) VALUES (linhas atuais)
```

A política de RLS de DELETE (migration `20260511140117_...sql`) exige `lider+`:

```sql
CREATE POLICY rls_distribuicao_dcomp_delete ON distribuicao_dcomp
  FOR DELETE USING (has_role_or_higher(auth.uid(), 'lider'::app_role));
```

- INSERT: liberado para `team_member+`.
- DELETE: somente `lider+`.

Para `team_member`/`sublider`, o DELETE retorna sucesso com 0 linhas afetadas (RLS filtra silenciosamente, sem erro). O INSERT subsequente adiciona uma nova cópia de cada linha → **a cada save o rateio duplica**, mesmo `dcomp.vlr_compensado` ficando correto. Por isso a divergência aparece só no somatório dos tributos do `PerDetailModal`.

## 2. Correção (escopo deste plano)

Atacamos apenas o bug. Backfills, dedup do que já está duplicado e refator para upsert/diff ficam fora deste plano.

### 2.1 Migration — RLS de DELETE/INSERT/UPDATE para `sublider+`

```sql
DROP POLICY IF EXISTS rls_distribuicao_dcomp_delete ON public.distribuicao_dcomp;
DROP POLICY IF EXISTS rls_distribuicao_dcomp_insert ON public.distribuicao_dcomp;
DROP POLICY IF EXISTS rls_distribuicao_dcomp_update ON public.distribuicao_dcomp;

CREATE POLICY rls_distribuicao_dcomp_insert ON public.distribuicao_dcomp
  FOR INSERT WITH CHECK (has_role_or_higher(auth.uid(), 'sublider'::app_role));

CREATE POLICY rls_distribuicao_dcomp_update ON public.distribuicao_dcomp
  FOR UPDATE USING (has_role_or_higher(auth.uid(), 'sublider'::app_role))
  WITH CHECK (has_role_or_higher(auth.uid(), 'sublider'::app_role));

CREATE POLICY rls_distribuicao_dcomp_delete ON public.distribuicao_dcomp
  FOR DELETE USING (has_role_or_higher(auth.uid(), 'sublider'::app_role));
```

Assim `sublider`/`lider`/`admin` conseguem criar e deletar (mantendo o delete+insert atual funcionando sem duplicar). `team_member` perde escrita aqui, e isso é tratado na UI.

### 2.2 Guard no `DcompFormModal`

Para `team_member` (ou qualquer role abaixo de `sublider`), o modal não pode submeter — caso contrário cairíamos no mesmo bug (DELETE silenciosamente bloqueado pela RLS + INSERT duplicando).

Comportamento:

- Ler do `useAuth` o flag `isSublider || isLider || isAdmin`.
- Se o usuário **não** atender (ex.: `team_member`), no `onSubmit` exibir `toast.error('Você não tem permissão para editar/excluir este DCOMP')` e abortar antes das mutations.
- Desabilitar o botão "Salvar" com tooltip equivalente para deixar claro na UI, mas manter a mensagem no submit como salvaguarda.
- Aplicar o mesmo bloqueio no botão de excluir DCOMP (`SoftDeleteModal`) — coerente com o nível mínimo de escrita.

### 2.3 Não faremos agora

- Deduplicar linhas já duplicadas em `distribuicao_dcomp`.
- Backfill de `valor_original` para DCOMPs antigos.
- Backfill de rateio sintético para DCOMPs sem `distribuicao_dcomp`.
- Refator de `persistirDistribuicoes` para upsert/diff (fica como follow-up recomendado, pois o padrão do projeto proíbe delete+insert).

## 3. Arquivos

- `supabase/migrations/<novo>.sql` — ajuste das 3 policies.
- `src/components/equipe/dev/perdcomp/DcompFormModal.tsx` — guard de role no submit + botão desabilitado + toast.
- `src/components/equipe/dev/perdcomp/SoftDeleteModal.tsx` — mesmo guard no confirm.

## 4. Validação

1. `team_member` abrir o modal → "Salvar" desabilitado; tentar submeter (via dev tools) → toast de erro, nada gravado.
2. `sublider` salvar um DCOMP existente sem alterar → contagem de linhas em `distribuicao_dcomp` para aquele `nr_documento` permanece igual antes/depois.
3. `sublider` criar novo DCOMP com 2 tributos → exatamente 2 linhas em `distribuicao_dcomp`.
4. Soma dos `valor_tributo` no `PerDetailModal` = `dcomp.vlr_compensado` após cada save.
