import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * IDs de projetos VISÍVEIS ao usuário (RLS de org_projects aplicada via SECURITY INVOKER)
 * que pertencem ao cluster informado.
 *
 * - clusterId nulo/undefined → query desabilitada; retorna { ids: null }.
 *   Consumidores devem tratar `ids === null` como "ainda carregando, não filtrar/exibir".
 * - includeOrphans: inclui projetos sem associação de cluster (legado).
 *   Use true só na área Tax (cluster default), false no OSG.
 */
export function useDashboardProjectIds(
  clusterId: string | null | undefined,
  includeOrphans: boolean,
) {
  const query = useQuery({
    queryKey: ['dashboard-project-ids-for-cluster', clusterId, includeOrphans],
    enabled: !!clusterId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('dashboard_project_ids_for_cluster', {
        _cluster_id: clusterId!,
        _include_orphans: includeOrphans,
      });
      if (error) throw error;
      return new Set<string>((data || []).map((r: { id?: string } | string) =>
        typeof r === 'string' ? r : r.id!,
      ));
    },
  });

  return {
    ids: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}
