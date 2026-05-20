# Correção do bug de duplicação de tributos no DCOMP + backfills retroativos

## 1. Causa raiz da duplicação (bug crítico)

O fluxo de salvar rateio em `DcompFormModal.persistirDistribuicoes` faz:

```text
DELETE FROM distribuicao_dcomp WHERE nr_documento = X
INSERT INTO distribuicao_dcomp (...) VALUES (linhas atuais)
```

O problema está na política de RLS criada em `20260511140117_...sql`:

```sql
CREATE POLICY rls_distribuicao_dcomp_delete ON distribuicao_dcomp
  FOR DELETE USING (has_role_or_higher(auth.uid(), 'lider'::app_role));
```

- INSERT é permitido a `team_member+`.
- DELETE só é permitido a `lider+`.

Para usuários `team_member`/`sublider`, o `DELETE` retorna sucesso com 0 linhas afetadas (RLS filtra silenciosamente — não dispara erro). Em seguida o INSERT adiciona uma nova cópia de cada linha. Resultado: **a cada save, o rateio é duplicado** (e o total dos tributos dobra), mesmo o `dcomp.vlr_compensado` permanecendo correto. Por isso a discrepância aparece só no somatório dos tributos exibido no `PerDetailModal`.

## 2. Fase A — Correção do bug

### A.1 Migration — alinhar RLS de DELETE com INSERT/UPDATE

```sql
DROP POLICY IF EXISTS rls_distribuicao_dcomp_delete ON public.distribuicao_dcomp;
CREATE POLICY rls_distribuicao_dcomp_delete ON public.distribuicao_dcomp
  FOR DELETE USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));
```

### A.2 Refatorar `persistirDistribuicoes` para padrão do projeto (sem delete+insert)

Memory rule: "Never use delete+insert for updates; strictly use selective update/upsert to preserve original UUIDs". Reescrever para diff:

- Linhas com `id` existente e ainda presentes em `distribuicoes` → `UPDATE`.
- Linhas existentes que sumiram → `DELETE` apenas dos `id` removidos.
- Linhas novas (sem `id`) → `INSERT`.

Benefícios: preserva `criado_em`/`criado_por`, elimina risco de duplicação mesmo se RLS regredir, e padroniza com o restante do projeto.

### A.3 Limpeza dos duplicados já gerados em produção/dev

Migration de saneamento que mantém apenas a linha mais recente por (`nr_documento`, `tributo`, `competencia`):

```sql
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY nr_documento, tributo, competencia
    ORDER BY atualizado_em DESC, criado_em DESC, id
  ) AS rn
  FROM public.distribuicao_dcomp
)
DELETE FROM public.distribuicao_dcomp
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
```

Antes do DELETE, um `RAISE NOTICE` lista quantas linhas serão removidas por DCOMP, para auditoria.

## 3. Fase B — Backfill retroativo

### B.1 Backfill do rateio (`distribuicao_dcomp`) para DCOMPs antigos

Hoje há 62 DCOMPs ativos e apenas 42 com rateio. Para os 20 sem rateio, criar 1 linha sintética usando `dcomp.imposto` + `dcomp.vlr_compensado` + competência da `dcomp.mes_ano_exercicio`. Isso elimina o "fallback de tela" e torna o filtro por tributo no `PerDetailModal` consistente.

```sql
INSERT INTO public.distribuicao_dcomp (nr_documento, tributo, valor_tributo, competencia, valor_original)
SELECT
  d.nr_documento,
  d.imposto,
  d.vlr_compensado,
  to_date(d.mes_ano_exercicio || '-01', 'YYYY-MM-DD'),
  NULL
FROM public.dcomp d
LEFT JOIN public.distribuicao_dcomp dd ON dd.nr_documento = d.nr_documento
WHERE (d.excluido IS NULL OR d.excluido = '')
  AND d.imposto IS NOT NULL
  AND d.vlr_compensado IS NOT NULL
  AND dd.id IS NULL;
```

Pergunta de validação antes de rodar: confirmar que `dcomp.imposto` para os 20 registros está populado e bate com o tributo real (eles foram preenchidos manualmente no cadastro antigo, então a expectativa é que sim — vamos listar e mostrar antes do INSERT).

### B.2 Backfill de `valor_original`

Hoje 53 linhas, apenas 6 com `valor_original`. Para as outras 47, o valor histórico precisa do fator SELIC vigente entre `per.dt_solicitada` e `dcomp.dt_envio`, que vive na API externa (`/api/v1/selic`) — não dá para resolver só em SQL.

Estratégia: **edge function admin one-off** `backfill-valor-original-dcomp`:

1. Seleciona `distribuicao_dcomp` com `valor_original IS NULL`, join com `dcomp` + `per` para pegar `dt_envio` e `dt_solicitada`.
2. Para cada linha, chama `/api/v1/selic?data_inicio=dt_solicitada&data_fim=dt_envio` (com `DW_SYNC_TOKEN` / auth do usuário admin que disparou).
3. Aplica a mesma fórmula do modal:
   - `fator = vlr_acumulado_dec + 0.01` se fora da carência, senão `0`.
   - `proporcaoOriginal = fator > 0 ? 1 / (1 + fator) : 1`.
   - `valor_original = round2(valor_tributo * proporcaoOriginal)`.
4. `UPDATE distribuicao_dcomp SET valor_original = ... WHERE id = ...`.
5. Logar por DCOMP: nr_documento, tributo, fator, valor_tributo, valor_original.

Acionada via botão "Backfill valor_original" oculto atrás de `has_role('admin')` em `ControlePerdcomp.tsx` (ou rota dev). Idempotente: só toca em linhas com `valor_original IS NULL`.

Alternativa mais leve, se aceitável: rodar o mesmo loop direto no client (admin), reaproveitando `useSelicTaxaAt`, sem criar edge function. Decidir em B.3.

### B.3 Decisão necessária

Qual abordagem para o backfill de `valor_original`?

- **(A) Edge function admin one-off** — auditável, reaproveitável, roda em batch sem depender de janela aberta.
- **(B) Script client-side em página dev/admin** — mais simples, não precisa deploy extra, mas exige usuário ficar com a aba aberta.

Default sugerido: **B** (script client-side em `ControlePerdcomp` atrás de role admin), por ser pontual e usar hooks já existentes.

## 4. Detalhes técnicos

### Arquivos alterados

- `supabase/migrations/<novo>.sql` — A.1 (RLS) + A.3 (dedup) + B.1 (rateio sintético).
- `src/components/equipe/dev/perdcomp/DcompFormModal.tsx` — refator de `persistirDistribuicoes` para upsert/diff (A.2).
- `src/pages/equipe/dev/ControlePerdcomp.tsx` — botão admin "Backfill valor_original" (B.2/B.3 opção B) **ou** nova edge function (opção A).

### Validação pós-deploy

1. Logar como `team_member`, abrir um DCOMP, salvar sem alterar → contar linhas em `distribuicao_dcomp` antes/depois (deve ficar igual).
2. Conferir `PerDetailModal`: soma dos tributos por DCOMP = `vlr_compensado` do DCOMP.
3. Após B.1: todos os DCOMPs ativos com pelo menos 1 linha em `distribuicao_dcomp`.
4. Após B.2: `SELECT count(*) FROM distribuicao_dcomp WHERE valor_original IS NULL` = 0 (para linhas com SELIC disponível).

## 5. Ordem de execução

1. Fase A.1 + A.2 + A.3 numa única leva (corrige o bug e limpa o estrago).
2. Fase B.1 (rateio sintético) — migration imediatamente depois.
3. Fase B.3 — confirmar abordagem A ou B → implementar B.2.
