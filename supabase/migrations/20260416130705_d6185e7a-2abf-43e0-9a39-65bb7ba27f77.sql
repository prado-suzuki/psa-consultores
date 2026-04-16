CREATE OR REPLACE FUNCTION public.has_role_or_higher(_user_id uuid, _minimum_role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND CASE _minimum_role
      WHEN 'team_member' THEN role IN ('team_member','sublider','lider','admin')
      WHEN 'sublider'    THEN role IN ('sublider','lider','admin')
      WHEN 'lider'       THEN role IN ('lider','admin')
      WHEN 'admin'       THEN role = 'admin'
      ELSE false
    END
  )
$$;