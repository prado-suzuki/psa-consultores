DROP POLICY IF EXISTS rls_distribuicao_dcomp_delete ON public.distribuicao_dcomp;
DROP POLICY IF EXISTS rls_distribuicao_dcomp_insert ON public.distribuicao_dcomp;
DROP POLICY IF EXISTS rls_distribuicao_dcomp_update ON public.distribuicao_dcomp;

CREATE POLICY rls_distribuicao_dcomp_insert ON public.distribuicao_dcomp
  FOR INSERT WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

CREATE POLICY rls_distribuicao_dcomp_update ON public.distribuicao_dcomp
  FOR UPDATE USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

CREATE POLICY rls_distribuicao_dcomp_delete ON public.distribuicao_dcomp
  FOR DELETE USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));