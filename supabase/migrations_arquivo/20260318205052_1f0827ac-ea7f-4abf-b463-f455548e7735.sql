
-- 1. Drop broad team_member and lider SELECT policies on profiles
DROP POLICY IF EXISTS "Team members can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Team members can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Leaders can read all profiles" ON public.profiles;

-- 2. Recreate profiles_safe view without security_invoker
-- (default security_invoker=false → runs as owner, bypasses RLS on base table)
DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe AS
  SELECT id, first_name, last_name
  FROM public.profiles;

GRANT SELECT ON public.profiles_safe TO authenticated;
GRANT SELECT ON public.profiles_safe TO anon;

-- 3. Create SECURITY DEFINER function for management pages needing email
CREATE OR REPLACE FUNCTION public.get_profiles_with_email()
RETURNS TABLE(id uuid, first_name text, last_name text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, p.email
  FROM public.profiles p
  WHERE has_role(auth.uid(), 'admin'::app_role)
     OR has_role(auth.uid(), 'team_member'::app_role)
     OR has_role(auth.uid(), 'lider'::app_role)
     OR has_role(auth.uid(), 'sublider'::app_role);
$$;

GRANT EXECUTE ON FUNCTION public.get_profiles_with_email() TO authenticated;
