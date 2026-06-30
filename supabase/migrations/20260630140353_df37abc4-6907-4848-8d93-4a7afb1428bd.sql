-- Visualização de projetos por cluster (aditivo, read-only)
CREATE OR REPLACE FUNCTION public.org_project_cluster_ids(_project_id uuid)
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(DISTINCT cid), '{}')
  FROM (
    SELECT a.cluster_id AS cid
    FROM public.org_projects p
    JOIN public.estrutura_areas a ON a.id = p.estrutura_area_id
    WHERE p.id = _project_id AND a.cluster_id IS NOT NULL
    UNION
    SELECT unnest(public.resolve_user_cluster_ids(opm.user_id)) AS cid
    FROM public.org_project_members opm
    WHERE opm.project_id = _project_id
  ) s
  WHERE cid IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.org_project_cluster_ids(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_project_ids_for_cluster(
  _cluster_id uuid, _include_orphans boolean DEFAULT false)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT p.id FROM public.org_projects p
  WHERE _cluster_id = ANY(public.org_project_cluster_ids(p.id))
     OR (_include_orphans AND public.org_project_cluster_ids(p.id) = '{}');
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_project_ids_for_cluster(uuid, boolean) TO authenticated;