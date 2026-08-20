CREATE OR REPLACE FUNCTION public.exec_sql_admin(p_sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE p_sql;
END;
$$;

REVOKE ALL ON FUNCTION public.exec_sql_admin(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_sql_admin(text) FROM anon;
REVOKE ALL ON FUNCTION public.exec_sql_admin(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql_admin(text) TO service_role;