
-- Drop the existing FK constraint that only checks 'contribuinte'
ALTER TABLE public.tax_projects DROP CONSTRAINT IF EXISTS tax_projects_contribuinte_id_fkey;

-- Create a validation trigger that checks both tables (same pattern as validate_per_contribuinte)
CREATE OR REPLACE FUNCTION public.validate_tax_project_contribuinte()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.contribuinte_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.contribuinte WHERE id = NEW.contribuinte_id
    ) AND NOT EXISTS (
      SELECT 1 FROM public.contribuinte_dev WHERE id = NEW.contribuinte_id
    ) THEN
      RAISE EXCEPTION 'Contribuinte invalido: id % nao encontrado em contribuinte nem contribuinte_dev', NEW.contribuinte_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_tax_project_contribuinte
  BEFORE INSERT OR UPDATE ON public.tax_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_tax_project_contribuinte();
