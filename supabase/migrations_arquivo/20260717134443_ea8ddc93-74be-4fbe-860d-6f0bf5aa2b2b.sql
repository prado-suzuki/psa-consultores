CREATE OR REPLACE FUNCTION public.criar_cliente_com_clusters(
  p_cliente     jsonb,
  p_cluster_ids uuid[]
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.cliente%ROWTYPE;
  v_cid uuid;
BEGIN
  IF NOT public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão para cadastrar cliente' USING ERRCODE = '42501';
  END IF;

  IF p_cluster_ids IS NULL OR array_length(p_cluster_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione ao menos 1 cluster' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.cliente (
    nome, categoria, ativo, fixo, telefone, municipio, uf, observacoes, ambiente
  ) VALUES (
    btrim(p_cliente->>'nome'),
    NULLIF(p_cliente->>'categoria',''),
    COALESCE((p_cliente->>'ativo')::boolean, true),
    NULLIF(p_cliente->>'fixo',''),
    NULLIF(p_cliente->>'telefone',''),
    NULLIF(p_cliente->>'municipio',''),
    NULLIF(p_cliente->>'uf',''),
    NULLIF(p_cliente->>'observacoes',''),
    COALESCE(NULLIF(p_cliente->>'ambiente',''), 'prod')
  )
  RETURNING * INTO v_row;

  FOREACH v_cid IN ARRAY p_cluster_ids LOOP
    INSERT INTO public.cliente_clusters (cliente_id, cluster_id)
    VALUES (v_row.id, v_cid);
  END LOOP;

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.criar_cliente_com_clusters(jsonb, uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.criar_cliente_com_clusters(jsonb, uuid[]) TO authenticated;