CREATE OR REPLACE FUNCTION public.tmp_aplicar_migration(p_sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  EXECUTE p_sql;
END;
$fn$;
REVOKE ALL ON FUNCTION public.tmp_aplicar_migration(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tmp_aplicar_migration(text) TO sandbox_exec;