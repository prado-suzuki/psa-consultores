CREATE OR REPLACE FUNCTION public.get_profiles_with_min_role(_minimum_role app_role)
RETURNS TABLE (id uuid, first_name text, last_name text, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, p.email
  FROM public.profiles p
  WHERE public.has_role_or_higher(p.id, _minimum_role)
$$;

GRANT EXECUTE ON FUNCTION public.get_profiles_with_min_role(app_role) TO authenticated;