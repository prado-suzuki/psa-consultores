// Perfis da equipe (view `profiles_safe`) para dropdowns de responsável.
// Fonte única — telas não devem chamar supabase.from('profiles_safe') direto.

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamProfile {
  id: string;
  first_name: string;
  last_name: string;
}

export function useTeamProfiles(): UseQueryResult<TeamProfile[]> {
  return useQuery<TeamProfile[]>({
    queryKey: ['profiles_safe'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles_safe' as never)
        .select('id, first_name, last_name')
        .order('first_name');
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as TeamProfile[];
    },
  });
}
