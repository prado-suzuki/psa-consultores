import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardMetricDeliverable {
  id: string;
  title: string;
  assigned_to: string | null;
  due_date: string;
  estimated_hours: number | null;
  status: string;
  parent_id: string | null;
  sprint_id: string;
}

export interface DashboardMetricProfile {
  id: string;
  first_name: string;
  last_name: string;
}

export interface DashboardMetricSprint {
  id: string;
  name: string;
}

interface DashboardMetricsData {
  deliverables: DashboardMetricDeliverable[];
  profiles: DashboardMetricProfile[];
  sprints: DashboardMetricSprint[];
}

const dashboardMetricsQueryKey = ['domain-dashboard-metrics'] as const;

export function useDomainDashboardMetrics() {
  return useQuery<DashboardMetricsData>({
    queryKey: dashboardMetricsQueryKey,
    queryFn: async () => {
      let deliverables: DashboardMetricDeliverable[] = [];
      let profiles: DashboardMetricProfile[] = [];
      let sprints: DashboardMetricSprint[] = [];

      try {
        // Apenas sprints ativas
        const { data: sprintsData } = await supabase
          .from('sprints')
          .select('id, name')
          .eq('status', 'active')
          .order('name', { ascending: true });

        sprints = sprintsData || [];

        if (sprints.length > 0) {
          const sprintIds = sprints.map((sprint) => sprint.id);
          const { data: deliverablesData } = await supabase
            .from('sprint_deliverables')
            .select('*')
            .in('sprint_id', sprintIds)
            .order('due_date', { ascending: true });

          deliverables = deliverablesData || [];
        }

        const { data: profilesData } = await supabase
          .from('profiles_safe')
          .select('id, first_name, last_name');

        profiles = profilesData || [];
      } catch (error) {
        console.error('Error fetching metrics data:', error);
      }

      return { deliverables, profiles, sprints };
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
