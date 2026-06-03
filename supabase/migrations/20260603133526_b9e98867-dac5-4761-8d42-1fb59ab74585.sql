DO $$
DECLARE
  t text;
  tables text[] := ARRAY['bem','matricula','titularidade','pessoa','cartorio','impedimento','parentesco'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'admin can delete ' || t, t);
    EXECUTE format($f$CREATE POLICY "lider+ can delete %1$s" ON public.%1$I FOR DELETE USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role))$f$, t);
  END LOOP;
END $$;