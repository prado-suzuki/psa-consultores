-- 20260819215346_osg_doc_categoria_proposta_comercial.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Mesmo NOME, timestamp diferente, já existia no repositório em:
--   supabase/migrations/20260819170000_osg_doc_categoria_proposta_comercial.sql
-- O arquivo antigo fica como histórico; o que vale para o ledger é este.
--
-- Não editar para corrigir nada: correção vem em migration nova.

-- EDU-13 (so a parte da categoria): a proposta comercial ganha categoria propria
-- em documento_arquivo. Espelha supabase/migrations/20260819170000_osg_doc_categoria_proposta_comercial.sql
ALTER TYPE public.osg_doc_categoria ADD VALUE IF NOT EXISTS 'proposta_comercial';
