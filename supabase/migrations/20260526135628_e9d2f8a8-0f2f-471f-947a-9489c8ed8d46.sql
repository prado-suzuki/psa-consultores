CREATE OR REPLACE FUNCTION public.set_updated_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_updated_by BEFORE UPDATE ON public.bem
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();
CREATE TRIGGER trg_set_updated_by BEFORE UPDATE ON public.matricula
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();
CREATE TRIGGER trg_set_updated_by BEFORE UPDATE ON public.titularidade
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();
CREATE TRIGGER trg_set_updated_by BEFORE UPDATE ON public.impedimento
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();
CREATE TRIGGER trg_set_updated_by BEFORE UPDATE ON public.cartorio
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();