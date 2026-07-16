import { useEffect, useRef } from 'react';
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type EquipeDashboardSprint = Tables<'sprints'>;
export type EquipeDashboardDeliverable = Tables<'sprint_deliverables'>;

export interface EquipeDashboardDeliverableStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
}

export interface EquipeDashboardAreaData {
  name: string;
  count: number;
}

interface EquipeDashboardData {
  activeSprint: EquipeDashboardSprint | null;
  stats: EquipeDashboardDeliverableStats;
  myDeliverables: EquipeDashboardDeliverable[];
  areaData: EquipeDashboardAreaData[];
}

const INITIAL_STATS: EquipeDashboardDeliverableStats = {
  total: 0,
  pending: 0,
  in_progress: 0,
  completed: 0,
};

const equipeDashboardQueryKey = (userId: string | undefined) =>
  ['domain-equipe-dashboard', userId ?? null] as const;

export function useDomainEquipeDashboard(userId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = equipeDashboardQueryKey(userId);
  const latestDataRef = useRef<EquipeDashboardData | undefined>(undefined);

  const dashboardQuery = useQuery<EquipeDashboardData>({
    queryKey,
    queryFn: async () => {
      const previousData =
        latestDataRef.current ?? queryClient.getQueryData<EquipeDashboardData>(queryKey);
      let activeSprint = previousData?.activeSprint ?? null;
      let stats = previousData?.stats ?? INITIAL_STATS;
      let myDeliverables = previousData?.myDeliverables ?? [];
      let areaData = previousData?.areaData ?? [];

      try {
        const { data: sprintData } = await supabase
          .from('sprints')
          .select('*')
          .eq('status', 'active')
          .order('start_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        activeSprint = sprintData;

        if (sprintData) {
          const { data: deliverables } = await supabase
            .from('sprint_deliverables')
            .select('status')
            .eq('sprint_id', sprintData.id);

          if (deliverables) {
            stats = {
              total: deliverables.length,
              pending: deliverables.filter((deliverable) => deliverable.status === 'pending')
                .length,
              in_progress: deliverables.filter(
                (deliverable) => deliverable.status === 'in_progress',
              ).length,
              completed: deliverables.filter(
                (deliverable) => deliverable.status === 'completed',
              ).length,
            };
          }
        }

        const { data: processes } = await supabase
          .from('processes')
          .select('area');

        if (processes) {
          const areaCounts: Record<string, number> = {};
          processes.forEach((process) => {
            const area = process.area || 'Sem área';
            areaCounts[area] = (areaCounts[area] || 0) + 1;
          });
          areaData = Object.entries(areaCounts).map(([name, count]) => ({ name, count }));
        }

        if (userId) {
          const { data: myDeliverablesData } = await supabase
            .from('sprint_deliverables')
            .select('*')
            .eq('assigned_to', userId)
            .neq('status', 'completed')
            .order('due_date', { ascending: true })
            .limit(5);

          myDeliverables = myDeliverablesData || [];
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }

      return { activeSprint, stats, myDeliverables, areaData };
    },
    placeholderData: keepPreviousData,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (dashboardQuery.data) {
      latestDataRef.current = dashboardQuery.data;
    }
  }, [dashboardQuery.data]);

  return {
    activeSprint: dashboardQuery.data?.activeSprint ?? null,
    stats: dashboardQuery.data?.stats ?? INITIAL_STATS,
    myDeliverables: dashboardQuery.data?.myDeliverables ?? [],
    areaData: dashboardQuery.data?.areaData ?? [],
    isLoading: dashboardQuery.isLoading,
  };
}
