-- =========================================================
-- MIGRAÇÃO 1: profiles - first access + last sign in
-- =========================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_access_done BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS first_access_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_sign_in_at   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_first_access_done
  ON public.profiles (first_access_done);

CREATE OR REPLACE FUNCTION public.sync_profile_access_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_mcp BOOLEAN := COALESCE((OLD.raw_user_meta_data->>'must_change_password')::boolean, FALSE);
  v_new_mcp BOOLEAN := COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, FALSE);
BEGIN
  -- Primeiro acesso concluído: must_change_password TRUE -> FALSE/ausente
  IF v_old_mcp = TRUE AND v_new_mcp = FALSE THEN
    UPDATE public.profiles
       SET first_access_done = TRUE,
           first_access_at   = COALESCE(first_access_at, NOW())
     WHERE id = NEW.id;
  END IF;

  -- Espelhar último login
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.profiles
       SET last_sign_in_at = NEW.last_sign_in_at
     WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_access_state ON auth.users;
CREATE TRIGGER trg_sync_profile_access_state
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_access_state();

-- Backfill inicial
UPDATE public.profiles p
   SET first_access_done = (COALESCE((u.raw_user_meta_data->>'must_change_password')::boolean, FALSE) = FALSE),
       first_access_at   = CASE
         WHEN COALESCE((u.raw_user_meta_data->>'must_change_password')::boolean, FALSE) = FALSE
         THEN COALESCE(u.last_sign_in_at, u.created_at)
         ELSE NULL
       END,
       last_sign_in_at   = u.last_sign_in_at
  FROM auth.users u
 WHERE u.id = p.id;

-- =========================================================
-- MIGRAÇÃO 2: tickets - assigned_at
-- =========================================================

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- Backfill conservador
UPDATE public.tickets
   SET assigned_at = created_at
 WHERE assigned_to IS NOT NULL
   AND assigned_at IS NULL;

CREATE OR REPLACE FUNCTION public.capture_ticket_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL
     AND (OLD.assigned_to IS NULL OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)
     AND NEW.assigned_at IS NULL THEN
    NEW.assigned_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_capture_ticket_assignment ON public.tickets;
CREATE TRIGGER trg_capture_ticket_assignment
  BEFORE UPDATE OF assigned_to ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_ticket_assignment();
