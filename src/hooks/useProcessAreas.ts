// Contagem de processos por área (tabela `processes`), para o gráfico do dashboard.
// Hook próprio — NÃO reusa `useProcessos`, que filtra `cluster_id NOT NULL` e
// esconde os processos do Digital Rotina que precisamos contar aqui.

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProcessAreaCount {
  name: string;
  count: number;
}

export function useProcessAreas(): UseQueryResult<ProcessAreaCount[]> {
  return useQuery<ProcessAreaCount[]>({
    queryKey: ['processes', 'areas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('processes' as never).select('area');
      if (error) throw new Error(error.message);
      const counts: Record<string, number> = {};
      for (const row of (data ?? []) as unknown as { area: string | null }[]) {
        const area = row.area || 'Sem área';
        counts[area] = (counts[area] || 0) + 1;
      }
      return Object.entries(counts).map(([name, count]) => ({ name, count }));
    },
  });
}
