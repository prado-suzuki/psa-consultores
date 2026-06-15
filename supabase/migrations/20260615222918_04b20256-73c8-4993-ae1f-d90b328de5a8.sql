CREATE OR REPLACE FUNCTION public.exec_sql_admin(p_sql text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN EXECUTE p_sql; END; $$;
REVOKE ALL ON FUNCTION public.exec_sql_admin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exec_sql_admin(text) TO service_role;