import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MembroProjeto } from '@/lib/boardProjetosCarga';

/**
 * Papel de cada pessoa no projeto. Não traz cargo/hora — essa ligação
 * não existe em `profiles`.
 */
export function useDomainProjetoMembros() {
  return useQuery<MembroProjeto[]>({
    queryKey: ['board-projeto-membros'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_project_members')
        .select('project_id, user_id, role');
      if (error) throw error;
      return (data ?? []) as MembroProjeto[];
    },
  });
}
