import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClusters } from '@/hooks/useClusters';

/**
 * Para um conjunto de user_ids, devolve Map<user_id, "Cluster A, Cluster B">
 * (nome dos clusters de cada usuário, via resolve_user_cluster_ids). Vazio = ''.
 * Usado pra rotular o seletor de "pré-visualizar como" com o cluster do usuário.
 */
export function useUsersClusterNames(userIds: string[]) {
  const { data: clusters = [] } = useClusters();
  const nameById = useMemo(() => new Map(clusters.map((c) => [c.id, c.nome])), [clusters]);
  const sorted = [...userIds].sort();

  return useQuery({
    queryKey: ['users-cluster-names', sorted.join(','), clusters.length],
    enabled: sorted.length > 0 && clusters.length > 0,
    queryFn: async (): Promise<Map<string, string>> => {
      const entries = await Promise.all(
        sorted.map(async (uid) => {
          const { data, error } = await (supabase.rpc as any)('resolve_user_cluster_ids', { _uid: uid });
          if (error) throw error;
          const names = ((data || []) as string[]).map((id) => nameById.get(id)).filter(Boolean) as string[];
          return [uid, names.join(', ')] as const;
        }),
      );
      return new Map(entries);
    },
  });
}
