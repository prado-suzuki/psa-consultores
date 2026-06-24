
-- 1) Tighten profiles SELECT: replace broad team_member policy with admin-only
DROP POLICY IF EXISTS "rls_profiles_select_internal" ON public.profiles;

CREATE POLICY "rls_profiles_select_admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) profiles_safe view: switch to security definer (security_invoker=off) so internal users can still read non-sensitive id/first_name/last_name without exposing email/phone
ALTER VIEW public.profiles_safe SET (security_invoker = off);
GRANT SELECT ON public.profiles_safe TO authenticated;

-- 3) Add DELETE policy for correcoes_icms (lider or higher)
CREATE POLICY "Lider+ pode deletar correcoes ICMS"
  ON public.correcoes_icms
  FOR DELETE
  TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));
