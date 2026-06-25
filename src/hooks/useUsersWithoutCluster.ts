import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Dado um conjunto de user_ids, retorna o Set dos que NÃO têm cluster derivável
 * (sócios / contas sem vínculo) — usando a RPC resolve_user_cluster_ids por usuário.
 * Usado no modal do dashboard pra mostrar o override só p/ quem precisa.
 */
export function useUsersWithoutCluster(userIds: string[]) {
  const sorted = [...userIds].sort();
  return useQuery({
    queryKey: ['users-without-cluster', sorted.join(',')],
    enabled: sorted.length > 0,
    queryFn: async (): Promise<Set<string>> => {
      const entries = await Promise.all(
        sorted.map(async (uid) => {
          const { data, error } = await (supabase.rpc as any)('resolve_user_cluster_ids', { _uid: uid });
          if (error) throw error;
          const arr = (data || []) as string[];
          return [uid, arr.length === 0] as const;
        }),
      );
      return new Set(entries.filter(([, empty]) => empty).map(([uid]) => uid));
    },
  });
}
