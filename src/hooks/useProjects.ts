// Projetos do módulo /equipe (tabela `projects`), SEM o filtro `cluster_id NOT NULL`
// que `useProjetos` (MAPA) aplica — aqui precisamos ver todos, inclusive Digital Rotina.

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Project {
  id: string;
  name: string;
  cluster_id: string | null;
}

export function useProjects(): UseQueryResult<Project[]> {
  return useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects' as never)
        .select('id, name, cluster_id')
        .order('name');
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Project[];
    },
  });
}
