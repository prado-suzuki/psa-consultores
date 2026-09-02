-- 20260821182440_org_projects_external_client_id_fkey.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, com UMA
-- alteração, descrita ao pé desta nota, para o repositório voltar a descrever o
-- banco e o `db push` deixar de abortar em "Remote migration versions not found".
--
-- Mesmo NOME, timestamp diferente, já existia no repositório em:
--   supabase/migrations/20260821151417_org_projects_external_client_id_fkey.sql
-- O arquivo antigo fica como histórico; o que vale para o ledger é este.
--
-- Não editar para corrigir SCHEMA: correção de schema vem em migration nova.
--
-- ── A ÚNICA alteração no corpo, 02/09/2026 ──────────────────────────────────
-- O `ADD CONSTRAINT` passou a ser guardado por um `DO $$ ... IF NOT EXISTS
-- (pg_constraint) ... $$`. Nada mais mudou: mesma tabela, mesmo nome, mesma
-- definição de chave.
--
-- Motivo: esta MESMA FK é criada por três arquivos (20260821151417, este, e
-- 20260821183931_53dab312), e o corpo original não era idempotente. Num banco
-- limpo o segundo `ADD CONSTRAINT` erra com duplicate_object, então o replay das
-- migrations, e com ele o `supabase db reset`, falhava exatamente aqui.
--
-- Isto não é correção de schema: o resultado é idêntico ao do corpo original. No
-- fim, a FK existe, com o mesmo nome e a mesma definição. O que mudou é que rodar
-- duas vezes agora dá no mesmo, que é a regra da seção "Toda migration é
-- idempotente" do AGENTS.md, cobrada pela CI desde este commit.
--
-- A guarda foi preferida ao par `DROP` + `ADD` porque `ADD CONSTRAINT` de chave
-- estrangeira revalida a tabela inteira e pega lock nas duas pontas; a guarda não
-- faz nada quando a FK já está lá. `ADD CONSTRAINT IF NOT EXISTS` não existe no
-- Postgres, senão seria essa a forma.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.org_projects'::regclass
                    AND conname = 'org_projects_external_client_id_fkey') THEN
    ALTER TABLE public.org_projects
      ADD CONSTRAINT org_projects_external_client_id_fkey
      FOREIGN KEY (external_client_id) REFERENCES public.cliente(id);
  END IF;
END $$;
