-- 1) Coluna
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- 2) Backfill
UPDATE public.tickets
SET closed_at = updated_at
WHERE closed_at IS NULL
  AND status IN ('resolvido', 'fechado');

-- 3) Função de trigger
CREATE OR REPLACE FUNCTION public.tg_tickets_set_closed_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('resolvido', 'fechado')
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND OLD.status NOT IN ('resolvido', 'fechado') THEN
    NEW.closed_at := now();
  ELSIF NEW.status NOT IN ('resolvido', 'fechado')
     AND OLD.status IN ('resolvido', 'fechado') THEN
    NEW.closed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- 4) Trigger
DROP TRIGGER IF EXISTS trg_tickets_set_closed_at ON public.tickets;
CREATE TRIGGER trg_tickets_set_closed_at
BEFORE UPDATE OF status ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.tg_tickets_set_closed_at();