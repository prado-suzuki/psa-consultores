REVOKE ALL ON FUNCTION public.precheck_allowed_ops(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.precheck_allowed_ops(text) TO authenticated, service_role;