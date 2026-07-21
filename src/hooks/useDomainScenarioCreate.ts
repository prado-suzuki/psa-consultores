import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DomainScenarioJobRole {
  id: string;
  name: string;
  hourly_rate: number;
}

const scenarioCreateJobRolesQueryKey = ['domain-scenario-create', 'job-roles'] as const;

export function useDomainScenarioCreate(open: boolean) {
  const jobRolesQuery = useQuery<DomainScenarioJobRole[]>({
    queryKey: scenarioCreateJobRolesQueryKey,
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_roles')
        .select('id, name, hourly_rate')
        .eq('is_active', true)
        .order('hourly_rate');

      if (error) throw error;
      return data;
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    jobRoles: jobRolesQuery.data ?? [],
  };
}
