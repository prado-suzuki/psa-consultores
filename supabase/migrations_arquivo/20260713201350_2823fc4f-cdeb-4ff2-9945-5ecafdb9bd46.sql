-- Migration B: redefine profiles_safe
-- - Projeção apenas de id, first_name, last_name
-- - Filtro has_role_or_higher(auth.uid(), 'team_member') embutido
-- - security_invoker = false (view roda com privilégios do owner, que tem BYPASSRLS)
-- - security_barrier = true (impede predicate pushdown de consumidores)
-- - Grants: authenticated (SELECT), service_role (ALL); anon revogado

DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe
WITH (security_invoker = false, security_barrier = true)
AS
SELECT p.id, p.first_name, p.last_name
FROM public.profiles p
WHERE public.has_role_or_higher(auth.uid(), 'team_member'::app_role);

REVOKE ALL ON public.profiles_safe FROM PUBLIC;
REVOKE ALL ON public.profiles_safe FROM anon;
GRANT SELECT ON public.profiles_safe TO authenticated;
GRANT ALL    ON public.profiles_safe TO service_role;