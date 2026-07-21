// Hooks de leitura de sprints (tabela `sprints`) para o módulo /equipe.
// Fonte única — nenhuma tela deve chamar supabase.from('sprints') direto.

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: string;
  project_id: string | null;
}

const TABLE = 'sprints';
const SELECT = 'id, name, goal, start_date, end_date, status, project_id';

/** Todas as sprints, mais recentes primeiro. */
export function useSprints(): UseQueryResult<Sprint[]> {
  return useQuery<Sprint[]>({
    queryKey: [TABLE],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .select(SELECT)
        .order('start_date', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Sprint[];
    },
  });
}

/** Apenas as sprints ativas (podem coexistir várias, uma por projeto). */
export function useActiveSprints(): UseQueryResult<Sprint[]> {
  return useQuery<Sprint[]>({
    queryKey: [TABLE, 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .select(SELECT)
        .eq('status', 'active')
        .order('start_date', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Sprint[];
    },
  });
}
