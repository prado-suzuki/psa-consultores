import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';

export type EquipeTaskStatus = 'backlog' | 'to_do' | 'in_progress' | 'review' | 'done';
export type EquipeTaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type EquipeTaskCluster = 'database' | 'frontend' | 'management';

export interface EquipeTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  cluster: string;
  assigned_to: string | null;
  sprint_id: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  due_date: string | null;
  created_at: string;
}

export interface EquipeTaskProfile {
  id: string;
  first_name: string;
  last_name: string;
}

export interface EquipeTaskSprint {
  id: string;
  name: string;
}

interface EquipeTarefasFilters {
  statusFilter: string;
  clusterFilter: string;
  priorityFilter: string;
}

interface EquipeTaskUpdatePayload {
  title: string;
  description: string | null;
  status: EquipeTaskStatus;
  priority: EquipeTaskPriority;
  cluster: EquipeTaskCluster;
  assigned_to: string | null;
  sprint_id: string | null;
  estimated_hours: number | null;
  due_date: string | null;
}

interface UpdateEquipeTaskVariables {
  taskId: string;
  payload: EquipeTaskUpdatePayload;
}

const equipeTarefasKeys = {
  all: ['equipe-tarefas'] as const,
  data: ({ statusFilter, clusterFilter, priorityFilter }: EquipeTarefasFilters) =>
    ['equipe-tarefas', 'data', statusFilter, clusterFilter, priorityFilter] as const,
};

export const useDomainEquipeTarefas = (filters: EquipeTarefasFilters) => {
  const queryClient = useQueryClient();

  const dataQuery = useQuery({
    queryKey: equipeTarefasKeys.data(filters),
    queryFn: async () => {
      let tasksQuery = supabase.from('tasks').select('*').order('created_at', { ascending: false });

      if (filters.statusFilter !== 'all') {
        tasksQuery = tasksQuery.eq('status', filters.statusFilter as EquipeTaskStatus);
      }
      if (filters.clusterFilter !== 'all') {
        tasksQuery = tasksQuery.eq('cluster', filters.clusterFilter as EquipeTaskCluster);
      }
      if (filters.priorityFilter !== 'all') {
        tasksQuery = tasksQuery.eq('priority', filters.priorityFilter as EquipeTaskPriority);
      }

      const { data: tasksData } = await tasksQuery;

      const { data: profilesData } = await supabase
        .from('profiles_safe')
        .select('id, first_name, last_name')
        .order('first_name');

      const { data: sprintsData } = await supabase
        .from('sprints')
        .select('id, name')
        .eq('status', 'active')
        .order('start_date', { ascending: false });

      return {
        tasks: (tasksData ?? []) as EquipeTask[],
        profiles: (profilesData ?? []) as EquipeTaskProfile[],
        sprints: (sprintsData ?? []) as EquipeTaskSprint[],
      };
    },
    placeholderData: keepPreviousData,
    retry: false,
  });

  const updateTask = useMutation({
    mutationFn: async ({ taskId, payload }: UpdateEquipeTaskVariables) => {
      await assertCanPerform('tasks', 'update', taskId);
      const { error } = await supabase.from('tasks').update(payload).eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: equipeTarefasKeys.all });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      await assertCanPerform('tasks', 'delete', taskId);
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: equipeTarefasKeys.all });
    },
  });

  return {
    tasks: dataQuery.data?.tasks ?? [],
    profiles: dataQuery.data?.profiles ?? [],
    sprints: dataQuery.data?.sprints ?? [],
    isLoading: dataQuery.isLoading,
    error: dataQuery.error,
    updateTask,
    deleteTask,
  };
};
