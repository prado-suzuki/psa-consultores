-- =============================================================================
-- Migration A: RPCs seguras para Tarefa 1 (RLS delegar revisão / blindagem de PII)
-- Plano de referência: .lovable/plan.md (v5)
-- Escopo: ADITIVA. Não altera policies, tabelas ou views.
-- =============================================================================

-- 1) Endurecer get_internal_users: hoje qualquer 'authenticated' (inclusive
-- client) pode enumerar funcionários; adicionamos guarda do CHAMADOR.
CREATE OR REPLACE FUNCTION public.get_internal_users()
RETURNS TABLE(id uuid, first_name text, last_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR NOT public.has_role_or_higher(auth.uid(), 'team_member'::app_role) THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT p.id, p.first_name, p.last_name
    FROM public.profiles p
    WHERE public.has_role_or_higher(p.id, 'team_member'::app_role)
    ORDER BY p.first_name, p.last_name;
END
$$;

REVOKE ALL ON FUNCTION public.get_internal_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_internal_users() FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_internal_users() TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_internal_users() TO service_role;

-- 2) Nova RPC em lote para o portal do cliente: nome do atendente do próprio
-- chamado. Autorização por linha via can_view_ticket(t.id).
CREATE OR REPLACE FUNCTION public.get_ticket_atendentes(_ticket_ids uuid[])
RETURNS TABLE(ticket_id uuid, first_name text, last_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, p.first_name, p.last_name
  FROM public.tickets t
  JOIN public.profiles p ON p.id = t.assigned_to
  WHERE auth.uid() IS NOT NULL
    AND _ticket_ids IS NOT NULL
    AND t.id = ANY(_ticket_ids)
    AND public.can_view_ticket(t.id);
$$;

REVOKE ALL ON FUNCTION public.get_ticket_atendentes(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_ticket_atendentes(uuid[]) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_ticket_atendentes(uuid[]) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_ticket_atendentes(uuid[]) TO service_role;

-- 3) Nova RPC para o portal do cliente: clusters contratados do cliente
-- logado. Filtra por auth.uid() via representante → cliente → cliente_clusters
-- → estrutura_clusters.
CREATE OR REPLACE FUNCTION public.get_clusters_do_cliente_atual()
RETURNS TABLE(cliente_id uuid, cluster_id uuid, cluster_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id AS cliente_id,
         ec.id AS cluster_id,
         ec.name AS cluster_name
  FROM public.representante r
  JOIN public.cliente c
    ON c.id = r.id_cliente
   AND c.excluido = false
  JOIN public.cliente_clusters cc
    ON cc.cliente_id = c.id
  JOIN public.estrutura_clusters ec
    ON ec.id = cc.cluster_id
   AND ec.is_active = true
  WHERE auth.uid() IS NOT NULL
    AND r.user_id = auth.uid()
    AND r.excluido = false
  ORDER BY ec.id;
$$;

REVOKE ALL ON FUNCTION public.get_clusters_do_cliente_atual() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_clusters_do_cliente_atual() FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_clusters_do_cliente_atual() TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_clusters_do_cliente_atual() TO service_role;