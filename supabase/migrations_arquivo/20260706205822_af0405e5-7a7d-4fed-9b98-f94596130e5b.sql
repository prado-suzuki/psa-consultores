ALTER TABLE public.documento_horas_historico ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname='public' AND tablename='documento_horas_historico'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.documento_horas_historico', p.policyname);
  END LOOP;
END $$;

CREATE POLICY dhh_select ON public.documento_horas_historico
  FOR SELECT TO authenticated
  USING (alterado_por = auth.uid()
         OR public.has_role_or_higher(auth.uid(), 'lider'::app_role));

CREATE POLICY dhh_insert ON public.documento_horas_historico
  FOR INSERT TO authenticated
  WITH CHECK (alterado_por = auth.uid()
              AND public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY dhh_update ON public.documento_horas_historico
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY dhh_delete ON public.documento_horas_historico
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));