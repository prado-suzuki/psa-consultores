DROP POLICY IF EXISTS rls_contribuinte_insert ON public.contribuinte;
CREATE POLICY rls_contribuinte_insert ON public.contribuinte
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));

DROP POLICY IF EXISTS rls_representante_insert ON public.representante;
CREATE POLICY rls_representante_insert ON public.representante
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));

DROP POLICY IF EXISTS rls_ordem_servico_insert ON public.ordem_servico;
CREATE POLICY rls_ordem_servico_insert ON public.ordem_servico
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));