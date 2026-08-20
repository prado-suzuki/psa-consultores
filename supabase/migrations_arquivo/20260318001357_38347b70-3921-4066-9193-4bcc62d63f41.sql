CREATE OR REPLACE FUNCTION public.get_ordens_by_client_name(p_client_id uuid)
RETURNS SETOF ordem_servico
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH client_name AS (
    SELECT nome FROM cliente WHERE id = p_client_id
    UNION
    SELECT nome FROM cliente_dev WHERE id = p_client_id
    LIMIT 1
  ),
  all_ids AS (
    SELECT id FROM cliente WHERE nome = (SELECT nome FROM client_name) AND excluido = false
    UNION
    SELECT id FROM cliente_dev WHERE nome = (SELECT nome FROM client_name) AND excluido = false
  )
  SELECT os.* FROM ordem_servico os
  WHERE os.id_cliente IN (SELECT id FROM all_ids)
    AND os.excluido = false
  ORDER BY os.created_at DESC;
$$;