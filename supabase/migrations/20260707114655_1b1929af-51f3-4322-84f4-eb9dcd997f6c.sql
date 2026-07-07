GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_item_padrao  TO authenticated;
GRANT ALL ON public.checklist_item_padrao  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_cliente_item TO authenticated;
GRANT ALL ON public.checklist_cliente_item TO service_role;

CREATE OR REPLACE FUNCTION public.checklist_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;