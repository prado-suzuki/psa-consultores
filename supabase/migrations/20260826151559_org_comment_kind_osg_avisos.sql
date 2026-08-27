-- 20260826151559_org_comment_kind_osg_avisos.sql
-- Dois valores novos no enum public.org_comment_kind, para os avisos de sistema
-- do fluxo de solicitação de documentos da OSG.
--
-- IMPORTADA DO LEDGER DO SANDBOX, NÃO ESCRITA AQUI PRIMEIRO. A migration foi
-- aplicada pelo chat do Lovable em 26/08/2026 e registrada em
-- supabase_migrations.schema_migrations sob esta versão e este nome, sem arquivo
-- correspondente no repositório. O conteúdo abaixo é o `statements` da própria
-- linha do ledger, transcrito sem alteração, para que o repositório volte a
-- reproduzir o banco e o `db push` não tente reaplicar nada.
--
-- O drift apareceu de um jeito concreto: ao regenerar `types.ts` pelo CLI, os
-- dois valores entraram no tipo `org_comment_kind`, e o mapa EXAUSTIVO de
-- rótulos de `OrgCommentsPanel.tsx` (Record<Exclude<kind,'comment'>, string>)
-- parou de compilar por faltarem duas chaves. Os rótulos foram acrescentados no
-- mesmo commit, com o texto tirado dos avisos que o banco já gravou:
--
--   documentos_cobrados   "Cobrança de documentos pendentes enviada ao cliente.
--                          N documento(s) pendente(s) e M a reenviar, de T no
--                          checklist."
--   documentos_conferidos "Documentação conferida e solicitação encerrada."
--
-- ALTER TYPE ... ADD VALUE é idempotente aqui pelo IF NOT EXISTS, então o
-- arquivo é seguro de rodar num banco que já tem os valores.

ALTER TYPE public.org_comment_kind ADD VALUE IF NOT EXISTS 'documentos_cobrados';
ALTER TYPE public.org_comment_kind ADD VALUE IF NOT EXISTS 'documentos_conferidos';
