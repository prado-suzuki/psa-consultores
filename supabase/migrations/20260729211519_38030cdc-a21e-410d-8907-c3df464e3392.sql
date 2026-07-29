REVOKE ALL ON FUNCTION public.gerar_solicitacao_os(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.gerar_solicitacao_os(uuid, uuid) FROM service_role;
REVOKE ALL ON FUNCTION public.gerar_solicitacao_os(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.gerar_solicitacao_os(uuid, uuid) TO authenticated;