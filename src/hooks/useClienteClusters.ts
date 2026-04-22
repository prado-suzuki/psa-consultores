import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';

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
      // 1. Get all id_cliente from representante for this user
      const { data: repRows } = await supabase
        .from('representante' as any)
        .select('id_cliente')
        .eq('user_id', userId!)
        .eq('excluido', false);

      const candidateIds = ((repRows || []) as any[])
        .map((r) => r.id_cliente)
        .filter(Boolean);

      if (candidateIds.length === 0) {
        return { clusters: [] as ClienteCluster[], clienteId: null };
      }

      // 2. Resolve to a single cliente in current ambiente
      const { data: clienteRow } = await supabase
        .from('cliente')
        .select('id')
        .in('id', candidateIds)
        .eq('ambiente', currentAmbiente)
        .eq('excluido', false)
        .limit(1)
        .maybeSingle();

      if (!clienteRow) return { clusters: [] as ClienteCluster[], clienteId: null };

      const clienteId = (clienteRow as any).id as string;

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
