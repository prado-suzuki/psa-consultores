import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';


export interface ClienteCluster {
  id: string;
  name: string;
}

/**
 * Fetches clusters for the logged-in client user.
 * Chain: representante (user_id) → id_cliente → cliente_clusters → estrutura_clusters
 *
 * Regra de negócio: 1 cliente por usuário (por ambiente). Se o usuário estiver
 * vinculado a mais de 1 id_cliente distinto, isso é dado duplicado
 * (representante/cliente entre ambientes) — lançamos erro em vez de colapsar
 * silenciosamente para o primeiro, para que a inconsistência fique visível.
 */
export function useClienteClusters(userId: string | undefined) {
  return useQuery({
    queryKey: ['cliente-clusters', userId],
    queryFn: async () => {
      // 1. Get all id_cliente from representante for this user
      const { data: repRows, error: repErr } = await supabase
        .from('representante')
        .select('id_cliente')
        .eq('user_id', userId!)
        .eq('excluido', false);
      if (repErr) throw repErr;

      const candidateIds = ((repRows || []) as { id_cliente: string }[])
        .map((r) => r.id_cliente)
        .filter(Boolean);

      if (candidateIds.length === 0) {
        return { clusters: [] as ClienteCluster[], clienteId: null };
      }

      // 2. Resolve para um único cliente. Sem filtrar por `ambiente`: `representante`
      // não tem coluna ambiente (só `cliente` tem) e filtrar `cliente.ambiente` por
      // hostname quebrava a resolução em previews/domínios alternativos — pendência
      // investigar antes de re-aplicar. Determinístico + fail-loud: >1 id distinto
      // = dado duplicado (ver doc do hook).
      const { data: clienteRows, error: cErr } = await supabase
        .from('cliente')
        .select('id')
        .in('id', candidateIds)
        .eq('excluido', false);
      if (cErr) throw cErr;

      const clientes = ((clienteRows || []) as { id: string }[]).map((c) => c.id);
      const distinctIds = [...new Set(clientes)];

      if (distinctIds.length === 0) {
        return { clusters: [] as ClienteCluster[], clienteId: null };
      }
      if (distinctIds.length > 1) {
        throw new Error(
          `useClienteClusters: usuário ${userId} vinculado a ${distinctIds.length} id_cliente distintos ` +
            `(possível dado duplicado em representante/cliente entre ambientes).`,
        );
      }

      const clienteId = distinctIds[0];

      // 3. Get cluster IDs for this client
      const { data: clusterLinks, error: clErr } = await supabase
        .from('cliente_clusters')
        .select('cluster_id')
        .eq('cliente_id', clienteId);
      if (clErr) throw clErr;

      if (!clusterLinks || clusterLinks.length === 0) {
        return { clusters: [] as ClienteCluster[], clienteId };
      }

      const clusterIds = clusterLinks.map((c) => c.cluster_id);

      // 4. Get cluster names (determinístico por id)
      const { data: clusters, error: clustersErr } = await supabase
        .from('estrutura_clusters')
        .select('id, name')
        .in('id', clusterIds)
        .eq('is_active', true);
      if (clustersErr) throw clustersErr;

      const resolvedClusters = ((clusters || []) as ClienteCluster[])
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id));

      return {
        clusters: resolvedClusters,
        clienteId,
      };
    },
    enabled: !!userId,
  });
}