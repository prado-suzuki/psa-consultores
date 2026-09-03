-- 1) Remove leftover backup table with sensitive ticket conversation data
DROP TABLE IF EXISTS public.bkp_20260807_ticket_messages_dup;

-- 2) Align contribuinte_bal_config CRUD role requirements (team_member can already update rows)
DROP POLICY IF EXISTS rls_contribuinte_bal_config_delete ON public.contribuinte_bal_config;
CREATE POLICY rls_contribuinte_bal_config_delete
  ON public.contribuinte_bal_config
  FOR DELETE
  TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 3) has_role_or_higher: cover every role in app_role explicitly (still fail-closed)
CREATE OR REPLACE FUNCTION public.has_role_or_higher(_user_id uuid, _minimum_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND CASE _minimum_role
      WHEN 'team_member' THEN role IN ('team_member','sublider','lider','admin')
      WHEN 'sublider'    THEN role IN ('sublider','lider','admin')
      WHEN 'lider'       THEN role IN ('lider','admin')
      WHEN 'admin'       THEN role = 'admin'
      -- Papéis sem hierarquia: exigem correspondência exata (nunca herdados)
      WHEN 'client'      THEN role = 'client'
      WHEN 'timecliente' THEN role = 'timecliente'
      WHEN 'marketing'   THEN role = 'marketing'
      ELSE false
    END
  )
$$;