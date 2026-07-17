## OSG-BE-01 — enum `osg_doc_area` + 2 colunas aditivas

Migration só de schema (DDL aditivo). Sem backfill, sem RLS, sem policies, sem defaults, sem NOT NULL.

### Pré-voo (executado)
- `public.bem` e `public.documento_arquivo` existem ✅
- `bem.vlr_itr_iptu` e `documento_arquivo.area` não existem ✅
- Enum `osg_doc_area` não existe ✅

Pré-voo bate com o esperado — seguro prosseguir.

### Passo 1 — Migration `osg_be_01_bem_itr_documento_area.sql`

```sql
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='osg_doc_area') THEN
    CREATE TYPE public.osg_doc_area AS ENUM ('osg','fiscal');
  END IF;
END $$;

ALTER TABLE public.bem               ADD COLUMN IF NOT EXISTS vlr_itr_iptu numeric;
ALTER TABLE public.documento_arquivo ADD COLUMN IF NOT EXISTS area public.osg_doc_area;
```

`ADD COLUMN` nullable sem default → sem rewrite/lock. Nenhuma tela lê ainda, sem impacto de UI.

### Passo 2 — Regenerar tipos
`src/integrations/supabase/types.ts` é regerado automaticamente após a aprovação da migration. Nenhum código de app é tocado neste PR.

### Passo 3 — Pós-verificação (rodar após aplicar)

```sql
-- 3a: 2 colunas nullable
SELECT table_name, column_name, data_type, udt_name, is_nullable
FROM information_schema.columns
WHERE (table_name='bem' AND column_name='vlr_itr_iptu')
   OR (table_name='documento_arquivo' AND column_name='area');

-- 3b: enum com exatamente osg,fiscal
SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid
WHERE t.typname='osg_doc_area' ORDER BY e.enumsortorder;
```

Esperado: 3a → 2 linhas com `is_nullable=YES`; 3b → `osg`, `fiscal`.

### Fora de escopo
- Sem backfill dos `documento_arquivo.area` existentes (ficam NULL).
- Sem `NOT NULL` / `DEFAULT`.
- Sem alteração de RLS/policies.
- Nenhuma outra tabela.
- Nenhuma alteração de código de app / hooks / telas.
