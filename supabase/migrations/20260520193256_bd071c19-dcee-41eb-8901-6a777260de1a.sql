DROP POLICY IF EXISTS rls_distribuicao_dcomp_insert ON public.distribuicao_dcomp;
CREATE POLICY rls_distribuicao_dcomp_insert ON public.distribuicao_dcomp
  FOR INSERT WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));