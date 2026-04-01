

## Plan: Atualização Estrutural — `per`, `dcomp` e view `per_with_contribuinte`

### Bloco 1 — Renomear coluna na tabela `per`
```sql
ALTER TABLE public.per RENAME COLUMN numero_processo_per TO nr_per;
```

### Bloco 2 — Adicionar colunas na tabela `per`
```sql
ALTER TABLE public.per ADD COLUMN excluido CHAR(1);
ALTER TABLE public.per ADD COLUMN nr_cancelamento TEXT;
```

### Bloco 3 — Adicionar colunas na tabela `dcomp`
```sql
ALTER TABLE public.dcomp ADD COLUMN excluido CHAR(1);
ALTER TABLE public.dcomp ADD COLUMN nr_cancelamento TEXT;
```

### Bloco 4 — Recriar view `per_with_contribuinte`

A view existente usa `p.*`, então a renomeação de coluna é transparente. Porém, as novas colunas `excluido` e `nr_cancelamento` já fazem parte de `p.*` após os blocos anteriores — o problema é que a view atual já expõe `contribuinte_nome` e `contribuinte_ambiente` como colunas nomeadas. Adicionar colunas explícitas quebraria a ordem se colocadas no meio.

Solução: **DROP e CREATE** (não `CREATE OR REPLACE`), garantindo que `excluido` e `nr_cancelamento` fiquem no final.

```sql
DROP VIEW IF EXISTS public.per_with_contribuinte;

CREATE VIEW public.per_with_contribuinte
WITH (security_invoker = on) AS
SELECT
  p.nr_per,
  p.exercicio,
  p.tri_exercicio,
  p.dt_solicitada,
  p.tp_credito,
  p.vlr_credito,
  p.nr_proc_ret,
  p.criado_em,
  p.criado_por,
  p.id_contribuinte,
  p.atualizado_em,
  p.atualizado_por,
  p.vlr_ressarcido,
  p.porcentagem_psa,
  c.nome_razao_social AS contribuinte_nome,
  c.ambiente AS contribuinte_ambiente,
  p.excluido,
  p.nr_cancelamento
FROM public.per p
LEFT JOIN public.contribuinte c ON c.id = p.id_contribuinte;
```

As colunas `excluido` e `nr_cancelamento` ficam **após** `contribuinte_ambiente`, no final absoluto do SELECT.

---

### Resumo

| Objeto | Operação |
|---|---|
| `per` | `RENAME COLUMN numero_processo_per → nr_per`, `ADD excluido CHAR(1)`, `ADD nr_cancelamento TEXT` |
| `dcomp` | `ADD excluido CHAR(1)`, `ADD nr_cancelamento TEXT` |
| `per_with_contribuinte` | `DROP` + `CREATE` com colunas soft-delete no final |

### Arquivo
- 1 migration SQL (4 blocos sequenciais)

