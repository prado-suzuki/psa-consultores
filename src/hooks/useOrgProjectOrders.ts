import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrgProjectOrder {
  id: string;
  numero_os: string | null;
  id_cliente: string;
  situacao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
}

export function useOrgProjectOrders(osIds: string[]) {
  const uniqueIds = [...new Set(osIds)].sort();

  return useQuery({
    queryKey: ['org-project-orders', uniqueIds],
    queryFn: async () => {
      if (uniqueIds.length === 0) return [];
      const { data, error } = await supabase
        .from('ordem_servico')
        .select('id, numero_os, id_cliente, situacao, data_inicio, data_fim')
        .in('id', uniqueIds)
        .eq('excluido', false);
      if (error) throw error;
      return data as OrgProjectOrder[];
    },
    enabled: uniqueIds.length > 0,
  });
}
