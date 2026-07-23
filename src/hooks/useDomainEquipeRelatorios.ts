import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EquipeRelatoriosProject {
  id: string;
  name: string;
}

export function useDomainEquipeRelatorios() {
  const projectsQuery = useQuery<EquipeRelatoriosProject[]>({
    queryKey: ['domain-equipe-relatorios', 'projects'],
    queryFn: async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('projects')
          .select('id, name')
          .order('name');

        if (fetchError) {
          console.error('Error fetching projects:', fetchError);
        }

        return data ?? [];
      } catch (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    projects: projectsQuery.data ?? [],
    isLoading: projectsQuery.isLoading,
    error: projectsQuery.isError
      ? 'Erro ao carregar dados. Tente recarregar a página.'
      : null,
  };
}
