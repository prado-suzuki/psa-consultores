## Objetivo

Executar exatamente `supabase/migrations/20260803120000_osg_doc_grupo.sql` (commit b787db06), sem alterar uma linha, e regenerar `src/integrations/supabase/types.ts`.

## O que o arquivo faz (lido, não alterado)

`BEGIN` → bloco `DO` que cria `public.osg_doc_grupo` como enum com os 4 valores na ordem `pf, pj, bens_imoveis, outros` (guard por `pg_type`, porque `CREATE TYPE` não aceita `IF NOT EXISTS`) → `ALTER TABLE public.checklist_item_padrao ADD COLUMN IF NOT EXISTS grupo public.osg_doc_grupo` (nulável, sem default) → `COMMENT ON COLUMN` → `COMMIT`.

Nenhum `UPDATE`, nenhum índice, nenhum `NOT NULL`, nenhum rename, nenhuma policy, função ou trigger. Front intocado.

## Execução

1. Rodar a migration pela ferramenta de migration, com o SQL do arquivo exatamente como está.
2. Deixar o types.ts ser regenerado após a migration aprovada (é automático no fluxo pós-migration).

## GATE (devolvo os quatro resultados, sem resumir)

1. `select unnest(enum_range(null::public.osg_doc_grupo));` — esperado `pf, pj, bens_imoveis, outros` nessa ordem.
2. `information_schema.columns` para `checklist_item_padrao.grupo` — esperado `udt_name = osg_doc_grupo`, `is_nullable = YES`.
3. `select count(*) as total, count(grupo) as com_grupo from public.checklist_item_padrao;` — esperado `com_grupo = 0`.
4. Confirmação, lendo o arquivo, de que `grupo` aparece no `Row` de `checklist_item_padrao` em `src/integrations/supabase/types.ts`.

## Se algo falhar

Devolvo a mensagem completa e o diagnóstico da causa, sem alterar a migration e sem contornar.
