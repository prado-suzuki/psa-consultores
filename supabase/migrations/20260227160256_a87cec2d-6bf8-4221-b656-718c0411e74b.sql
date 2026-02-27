
-- 1. Remove the existing FK constraint
ALTER TABLE public.per DROP CONSTRAINT per_id_contribuinte_fkey;

-- 2. Create validation function
CREATE OR REPLACE FUNCTION public.validate_per_contribuinte()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.contribuinte WHERE id = NEW.id_contribuinte
  ) AND NOT EXISTS (
    SELECT 1 FROM public.contribuinte_dev WHERE id = NEW.id_contribuinte
  ) THEN
    RAISE EXCEPTION 'Contribuinte invalido: id % nao encontrado em contribuinte nem contribuinte_dev', NEW.id_contribuinte;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 3. Create trigger on per table
CREATE TRIGGER trg_validate_per_contribuinte
  BEFORE INSERT OR UPDATE ON public.per
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_per_contribuinte();
