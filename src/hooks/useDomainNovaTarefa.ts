import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type SprintsTable = Database['public']['Tables']['sprints'];
type TasksTable = Database['public']['Tables']['tasks'];
type TaskInsert = TasksTable['Insert'];

export type NovaTarefaSprint = Pick<SprintsTable['Row'], 'id' | 'name'>;
export type NovaTarefaRecente = Pick<
  TasksTable['Row'],
  'id' | 'title' | 'cluster' | 'priority' | 'status' | 'created_at' | 'due_date'
>;
export type NovaTarefaCluster = TaskInsert['cluster'];
export type NovaTarefaPriority = TaskInsert['priority'];
export type NovaTarefaStatus = TaskInsert['status'];
export type CriarNovaTarefaInput = Pick<
  TaskInsert,
  | 'title'
  | 'description'
  | 'sprint_id'
  | 'cluster'
  | 'priority'
  | 'estimated_hours'
  | 'due_date'
  | 'created_by'
  | 'assigned_to'
  | 'status'
>;

export const novaTarefaQueryKeys = {
  sprints: ['equipe', 'nova-tarefa', 'sprints'] as const,
  recentTasks: ['equipe', 'nova-tarefa', 'recent-tasks'] as const,
};

const NOVA_TAREFA_MUTATION_KEY = ['equipe', 'nova-tarefa', 'create-task'] as const;

export function useNovaTarefaSprints() {
  return useQuery<NovaTarefaSprint[]>({
    queryKey: novaTarefaQueryKeys.sprints,
    queryFn: async () => {
      const { data } = await supabase
        .from('sprints')
        .select('id, name')
        .order('start_date', { ascending: false });

      return data ?? [];
    },
  });
}

export function useNovaTarefasRecentes() {
  return useQuery<NovaTarefaRecente[]>({
    queryKey: novaTarefaQueryKeys.recentTasks,
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('id, title, cluster, priority, status, created_at, due_date')
        .order('created_at', { ascending: false })
        .limit(10);

      return data ?? [];
    },
  });
}

export function useCriarNovaTarefa() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, CriarNovaTarefaInput>({
    mutationKey: NOVA_TAREFA_MUTATION_KEY,
    mutationFn: async (payload) => {
      const { error } = await supabase.from('tasks').insert(payload);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: novaTarefaQueryKeys.recentTasks });
    },
  });
}
