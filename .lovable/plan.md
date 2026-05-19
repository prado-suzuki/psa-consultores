# Plano: Espelhar dados de acesso e capturar atribuição de tickets

Aplicar 2 migrações idempotentes no Supabase para alimentar o dashboard externo de BigQuery. Sem Edge Functions, sem alterar schema `auth`, sem mexer em RLS.

## Migração 1 — `profiles`: primeiro acesso + último login

**Schema (`public.profiles`)**
- `first_access_done BOOLEAN DEFAULT FALSE`
- `first_access_at TIMESTAMPTZ`
- `last_sign_in_at TIMESTAMPTZ`
- Índice `idx_profiles_first_access_done` em `(first_access_done)`

**Função `public.sync_profile_access_state()`** (SECURITY DEFINER, `search_path=public`)
- Quando `must_change_password` muda de `TRUE` → `FALSE`/ausente: marca `first_access_done = TRUE` e seta `first_access_at = COALESCE(first_access_at, NOW())`.
- Quando `NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at`: copia para `profiles.last_sign_in_at`.

**Trigger** `trg_sync_profile_access_state` — `AFTER UPDATE ON auth.users FOR EACH ROW`.

**Backfill** lendo `auth.users.raw_user_meta_data->>'must_change_password'`, `last_sign_in_at`, `created_at` conforme spec.

## Migração 2 — `tickets`: momento de atribuição

**Schema (`public.tickets`)**
- `assigned_at TIMESTAMPTZ`

**Backfill** conservador: `assigned_at = created_at` onde `assigned_to IS NOT NULL AND assigned_at IS NULL`.

**Função `public.capture_ticket_assignment()`** (plpgsql)
- `BEFORE UPDATE OF assigned_to`: se `NEW.assigned_to IS NOT NULL`, mudou em relação a `OLD.assigned_to`, e `NEW.assigned_at IS NULL` → seta `NEW.assigned_at = NOW()`.

**Trigger** `trg_capture_ticket_assignment` — `BEFORE UPDATE OF assigned_to ON public.tickets FOR EACH ROW`.

## Garantias

- Idempotência: `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS` antes de `CREATE TRIGGER`.
- Sem mudanças em RLS de `profiles` ou `tickets`.
- Nenhum arquivo de código (`src/integrations/supabase/*`, `supabase/config.toml`, `components.json`) será tocado — apenas SQL via migrations.
- `src/integrations/supabase/types.ts` será regenerado automaticamente após aprovação das migrações.
