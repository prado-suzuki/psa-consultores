import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';


export interface ClienteCluster {
  id: string;
  name: string;
}

/**
 * Fetches clusters for the logged-in client user.
 * Backed by RPC `public.get_clusters_do_cliente_atual()` (SECURITY DEFINER,
 * filtra por auth.uid() via representante → cliente → cliente_clusters →
 * estrutura_clusters). O portal não consulta mais `estrutura_clusters`
 * diretamente.
 *
 * Regra de negócio: 1 cliente por usuário. Se a RPC devolver >1 `cliente_id`
 * distinto, isso é dado duplicado (representante/cliente entre ambientes) e
 * o hook lança erro em vez de colapsar silenciosamente para o primeiro.
 */
export function useClienteClusters(userId: string | undefined) {
  return useQuery({
    queryKey: ['cliente-clusters', userId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)(
        'get_clusters_do_cliente_atual',
      );
      if (error) throw error;

      const rows = (data || []) as Array<{
        cliente_id: string;
        cluster_id: string;
        cluster_name: string;
      }>;

      if (rows.length === 0) {
        return { clusters: [] as ClienteCluster[], clienteId: null };
      }

      const distinctClienteIds = [...new Set(rows.map((r) => r.cliente_id))];
      if (distinctClienteIds.length > 1) {
        throw new Error(
          `useClienteClusters: usuário ${userId} vinculado a ${distinctClienteIds.length} id_cliente distintos ` +
            `(possível dado duplicado em representante/cliente entre ambientes).`,
        );
      }

      const clienteId = distinctClienteIds[0];

      // Dedup por cluster_id (a RPC já retorna DISTINCT-friendly, mas defensivo)
      const seen = new Set<string>();
      const clusters: ClienteCluster[] = [];
      for (const r of rows) {
        if (!seen.has(r.cluster_id)) {
          seen.add(r.cluster_id);
          clusters.push({ id: r.cluster_id, name: r.cluster_name });
        }
      }
      clusters.sort((a, b) => a.id.localeCompare(b.id));

      return { clusters, clienteId };
    },
    enabled: !!userId,
  });
}
