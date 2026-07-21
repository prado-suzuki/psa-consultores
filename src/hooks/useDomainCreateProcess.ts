import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const createProcessQueryKeys = {
  jobRoles: ['domain-create-process', 'job-roles'] as const,
  catalogClients: ['domain-create-process', 'catalog-clients'] as const,
  projects: ['domain-create-process', 'projects'] as const,
};

export function useDomainCreateProcess(open: boolean) {
  const jobRolesQuery = useQuery({
    queryKey: createProcessQueryKeys.jobRoles,
    queryFn: async () => {
      const { data } = await supabase
        .from('job_roles')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('hourly_rate');

      return data ?? [];
    },
    enabled: open,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const catalogClientsQuery = useQuery({
    queryKey: createProcessQueryKeys.catalogClients,
    queryFn: async () => {
      const { data } = await supabase
        .from('catalog_clients')
        .select('id, name, color')
        .eq('is_active', true)
        .order('name');

      return data ?? [];
    },
    enabled: open,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const projectsQuery = useQuery({
    queryKey: createProcessQueryKeys.projects,
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, name, cluster_id')
        .order('name');

      return data ?? [];
    },
    enabled: open,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    jobRoles: jobRolesQuery.data ?? [],
    catalogClients: catalogClientsQuery.data ?? [],
    projects: projectsQuery.data ?? [],
  };
}
