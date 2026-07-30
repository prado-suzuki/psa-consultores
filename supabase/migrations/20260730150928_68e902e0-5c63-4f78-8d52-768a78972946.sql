REVOKE ALL ON public.cobertura_documentos_cliente FROM anon;
REVOKE ALL ON public.cobertura_documentos_cliente FROM authenticated;
GRANT SELECT ON public.cobertura_documentos_cliente TO authenticated;