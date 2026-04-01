

## Plan: Expor `ambiente` do contribuinte na `dw-query`

### Problema
A tabela `per` não tem coluna `ambiente`. Esse dado vem da tabela `contribuinte` (vinculada via `id_contribuinte`). A edge function `dw-query` consulta `per` diretamente, então não retorna essa informação.

### Solução
Duas alterações:

#### 1. Atualizar a view `per_with_contribuinte` (migration SQL)
Adicionar `c.ambiente AS contribuinte_ambiente` ao SELECT da view:

```sql
CREATE OR REPLACE VIEW public.per_with_contribuinte
WITH (security_invoker = on) AS
SELECT
  p.*,
  c.nome_razao_social AS contribuinte_nome,
  c.ambiente AS contribuinte_ambiente
FROM public.per p
LEFT JOIN public.contribuinte c ON c.id = p.id_contribuinte;
```

#### 2. Adicionar `per_with_contribuinte` às tabelas permitidas na edge function

**Arquivo:** `supabase/functions/dw-query/index.ts`

- Adicionar `'per_with_contribuinte'` ao array `ALLOWED_TABLES`
- O consumidor externo passa `?table=per_with_contribuinte` e recebe `contribuinte_ambiente` (`'prod'` ou `'dev'`) em cada registro

Isso permite que o DW consulte tanto a tabela `per` pura quanto a view enriquecida, sem quebrar chamadas existentes.

### Arquivos modificados
- Migration SQL (1 statement — recriar view)
- `supabase/functions/dw-query/index.ts` (1 linha)

