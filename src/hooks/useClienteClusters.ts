import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClienteCluster {
  id: string;
  name: string;
}

/**
 * Fetches clusters for the logged-in client user.
 * Chain: representante (user_id) → id_cliente → cliente_clusters → estrutura_clusters
 */
export function useClienteClusters(userId: string | undefined) {
  return useQuery({
    queryKey: ['cliente-clusters', userId],
    queryFn: async () => {
      // 1. Get cliente_id from representante
      const { data: repData } = await supabase
        .from('representante' as any)
        .select('id_cliente')
        .eq('user_id', userId!)
        .eq('excluido', false)
        .maybeSingle();

      if (!repData) return { clusters: [] as ClienteCluster[], clienteId: null };

      const clienteId = (repData as any).id_cliente as string;

      // 2. Get cluster IDs for this client
      const { data: clusterLinks } = await supabase
        .from('cliente_clusters')
        .select('cluster_id')
        .eq('cliente_id', clienteId);

      if (!clusterLinks || clusterLinks.length === 0) {
        return { clusters: [] as ClienteCluster[], clienteId };
      }

      const clusterIds = clusterLinks.map(c => c.cluster_id);

      // 3. Get cluster names
      const { data: clusters } = await supabase
        .from('estrutura_clusters')
        .select('id, name')
        .in('id', clusterIds)
        .eq('is_active', true)
        .order('name');

      return {
        clusters: (clusters || []) as ClienteCluster[],
        clienteId,
      };
    },
    enabled: !!userId,
  });
}
