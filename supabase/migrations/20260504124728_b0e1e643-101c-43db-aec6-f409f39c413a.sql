
-- 1. Drop unused gestao_area_password table (storing password hashes in DB is risky and unused)
DROP TABLE IF EXISTS public.gestao_area_password CASCADE;

-- 2. Tighten relatorios_gerados policies
DROP POLICY IF EXISTS "Admin e lider acessam relatorios" ON public.relatorios_gerados;
DROP POLICY IF EXISTS "rls_relatorios_gerados_select" ON public.relatorios_gerados;

CREATE POLICY "relatorios_gerados_select"
ON public.relatorios_gerados FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'lider'::app_role)
  OR public.has_role(auth.uid(), 'sublider'::app_role)
);

CREATE POLICY "relatorios_gerados_insert"
ON public.relatorios_gerados FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'lider'::app_role)
  OR public.has_role(auth.uid(), 'sublider'::app_role)
);

CREATE POLICY "relatorios_gerados_update"
ON public.relatorios_gerados FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'lider'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'lider'::app_role)
);

CREATE POLICY "relatorios_gerados_delete"
ON public.relatorios_gerados FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Revoke anon access on profiles_safe and switch to SECURITY INVOKER
REVOKE SELECT ON public.profiles_safe FROM anon;
ALTER VIEW public.profiles_safe SET (security_invoker = on);
