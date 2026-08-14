-- RPC: lista membros internos vinculados a um cluster (via áreas → equipes → membros + gestores)
CREATE OR REPLACE FUNCTION public.get_cluster_members(_cluster_id uuid)
RETURNS TABLE(id uuid, first_name text, last_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.id, p.first_name, p.last_name
  FROM public.profiles p
  WHERE public.has_role_or_higher(p.id, 'team_member'::app_role)
    AND _cluster_id IS NOT NULL
    AND (
      -- membros das equipes do cluster
      EXISTS (
        SELECT 1
        FROM public.estrutura_equipe_membros m
        JOIN public.estrutura_equipes e ON e.id = m.equipe_id
        JOIN public.estrutura_areas    a ON a.id = e.area_id
        WHERE m.user_id = p.id
          AND a.cluster_id = _cluster_id
      )
      -- gestores das equipes do cluster
      OR EXISTS (
        SELECT 1
        FROM public.estrutura_equipes e
        JOIN public.estrutura_areas   a ON a.id = e.area_id
        WHERE e.gestor_id = p.id
          AND a.cluster_id = _cluster_id
      )
      -- gestor de chamados da área
      OR EXISTS (
        SELECT 1
        FROM public.estrutura_areas a
        WHERE a.gestor_chamados_id = p.id
          AND a.cluster_id = _cluster_id
      )
    )
  ORDER BY p.first_name, p.last_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_cluster_members(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cluster_members(uuid) TO service_role;