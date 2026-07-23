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

export interface EquipeDashboardClusterData {
  name: string;
  count: number;
}

interface EquipeDashboardData {
  activeSprints: EquipeDashboardSprint[];
  activeSprint: EquipeDashboardSprint | null;
  stats: EquipeDashboardDeliverableStats;
  myDeliverables: EquipeDashboardDeliverable[];
  clusterData: EquipeDashboardClusterData[];
}

const INITIAL_STATS: EquipeDashboardDeliverableStats = {
  total: 0,
  pending: 0,
  in_progress: 0,
  completed: 0,
};

const equipeDashboardQueryKey = (userId: string | undefined) =>
  ['domain-equipe-dashboard', userId ?? null] as const;

export function useDomainEquipeDashboard(
  userId: string | undefined,
  selectedSprintId: string | null = null,
) {
  const queryClient = useQueryClient();
  const queryKey = equipeDashboardQueryKey(userId);
  const latestDataRef = useRef<EquipeDashboardData | undefined>(undefined);

  const dashboardQuery = useQuery<EquipeDashboardData>({
    queryKey,
    queryFn: async () => {
      const previousData =
        latestDataRef.current ?? queryClient.getQueryData<EquipeDashboardData>(queryKey);
      let activeSprints = previousData?.activeSprints ?? [];
      let activeSprint = previousData?.activeSprint ?? null;
      let stats = previousData?.stats ?? INITIAL_STATS;
      let myDeliverables = previousData?.myDeliverables ?? [];
      let clusterData = previousData?.clusterData ?? [];

      try {
        const { data: sprintData } = await supabase
          .from('sprints')
          .select('*')
          .eq('status', 'active')
          .order('start_date', { ascending: false });

        activeSprints = sprintData ?? [];
        activeSprint = activeSprints[0] ?? null;
        stats = INITIAL_STATS;

        if (activeSprint) {
          const { data: deliverables } = await supabase
            .from('sprint_deliverables')
            .select('status')
            .eq('sprint_id', activeSprint.id);

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
          .select('cluster_id');

        const { data: clusterRows } = await supabase
          .from('estrutura_clusters')
          .select('id, name');

        if (processes) {
          const clusterNameById = new Map(
            (clusterRows ?? []).map((cluster) => [cluster.id, cluster.name] as const),
          );
          const clusterCounts: Record<string, number> = {};
          processes.forEach((process) => {
            const name =
              (process.cluster_id && clusterNameById.get(process.cluster_id)) || 'Sem cluster';
            clusterCounts[name] = (clusterCounts[name] || 0) + 1;
          });
          clusterData = Object.entries(clusterCounts).map(([name, count]) => ({ name, count }));
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

      return { activeSprints, activeSprint, stats, myDeliverables, clusterData };
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

  const activeSprints = dashboardQuery.data?.activeSprints ?? [];
  const defaultSprint = dashboardQuery.data?.activeSprint ?? null;
  const activeSprint = activeSprints.find((sprint) => sprint.id === selectedSprintId)
    ?? defaultSprint;
  const needsSelectedStats = !!activeSprint && activeSprint.id !== defaultSprint?.id;
  const selectedStatsQuery = useQuery<EquipeDashboardDeliverableStats>({
    queryKey: ['domain-equipe-dashboard-sprint-stats', activeSprint?.id ?? null],
    queryFn: async () => {
      if (!activeSprint) return INITIAL_STATS;
      const { data: deliverables, error } = await supabase
        .from('sprint_deliverables')
        .select('status')
        .eq('sprint_id', activeSprint.id);
      if (error) throw error;
      const list = deliverables ?? [];
      return {
        total: list.length,
        pending: list.filter((deliverable) => deliverable.status === 'pending').length,
        in_progress: list.filter((deliverable) => deliverable.status === 'in_progress').length,
        completed: list.filter((deliverable) => deliverable.status === 'completed').length,
      };
    },
    enabled: needsSelectedStats,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    activeSprints,
    activeSprint,
    stats: needsSelectedStats
      ? (selectedStatsQuery.data ?? INITIAL_STATS)
      : (dashboardQuery.data?.stats ?? INITIAL_STATS),
    myDeliverables: dashboardQuery.data?.myDeliverables ?? [],
    clusterData: dashboardQuery.data?.clusterData ?? [],
    isLoading: dashboardQuery.isLoading || (needsSelectedStats && selectedStatsQuery.isLoading),
  };
}
