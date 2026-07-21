// Processos do módulo /equipe (tabela `processes`), SEM o filtro `cluster_id NOT NULL`
// que `useProcessos` (MAPA) aplica. Traz os campos usados por Kanban/Análise.

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Process {
  id: string;
  name: string;
  area: string | null;
  project_id: string | null;
}

export function useProcesses(): UseQueryResult<Process[]> {
  return useQuery<Process[]>({
    queryKey: ['processes', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processes' as never)
        .select('id, name, area, project_id')
        .order('name');
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Process[];
    },
  });
}
