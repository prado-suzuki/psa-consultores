import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  SprintProgressTask,
  SprintProgressTaskStatus,
} from '@/lib/dailySprintProgress';

function normalizeStatus(status: string | null): SprintProgressTaskStatus {
  if (status === 'completed' || status === 'in_progress') return status;
  return 'pending';
}

export function useDomainDailySprintProgress(sprintId: string) {
  return useQuery<SprintProgressTask[]>({
    queryKey: ['daily-sprint-progress', sprintId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sprint_deliverables')
        .select('id, title, task_code, status, parent_id, assigned_to')
        .eq('sprint_id', sprintId)
        .order('task_code', { ascending: true });

      if (error) throw error;
      return (data ?? []).map((task) => ({
        ...task,
        status: normalizeStatus(task.status),
      }));
    },
    enabled: Boolean(sprintId),
    staleTime: 30_000,
  });
}
