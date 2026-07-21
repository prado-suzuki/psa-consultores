import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const STALE_TIME = 5 * 60 * 1000;

export interface BoardDashboardImprovement {
  id: string;
  total_savings_monthly: number | null;
  status: string | null;
  created_at: string | null;
}

export interface BoardDashboardTask {
  id: string;
  status: string;
  updated_at: string;
  project_id: string | null;
}

export function useDomainBoardDashboard() {
  const improvementsQuery = useQuery<BoardDashboardImprovement[]>({
    queryKey: ['board-improvements-roi'],
    queryFn: async () => {
      const { data } = await supabase
        .from('process_improvements' as never)
        .select('id, total_savings_monthly, status, created_at');

      return (data ?? []) as unknown as BoardDashboardImprovement[];
    },
    staleTime: STALE_TIME,
  });

  const tasksByAreaQuery = useQuery<BoardDashboardTask[]>({
    queryKey: ['board-tasks-by-area-3m'],
    queryFn: async () => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const { data: tasks } = await supabase
        .from('org_tasks')
        .select('id, status, updated_at, project_id')
        .eq('status', 'done')
        .gte('updated_at', threeMonthsAgo.toISOString());

      return (tasks ?? []) as BoardDashboardTask[];
    },
    staleTime: STALE_TIME,
  });

  return { improvementsQuery, tasksByAreaQuery };
}
