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
      // RPC retorna SETOF uuid → PostgREST devolve array de uuids (string[])
      // ou array de objetos { dashboard_project_ids_for_cluster: uuid }, dependendo do client.
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: unknown }>)(
        'dashboard_project_ids_for_cluster',
        { _cluster_id: clusterId!, _include_orphans: includeOrphans },
      );
      if (error) throw error as Error;
      const rows = (data ?? []) as Array<string | Record<string, string>>;
      const ids = rows.map(r =>
        typeof r === 'string' ? r : Object.values(r)[0] as string,
      );
      return new Set<string>(ids);
    },
  });

  return {
    ids: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}
