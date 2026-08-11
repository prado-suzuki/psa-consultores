// Tarefas (entregáveis) de uma pessoa numa sprint — usadas na Daily para:
//  (1) "chips" que a pessoa toca pra inserir a tarefa no texto de ontem/hoje (sem redigitar);
//  (2) o dropdown "tarefa travada" do bloqueio estruturado.
// Fica num hook próprio (regra do projeto: nada de supabase.from direto no componente).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from '@/hooks/useAuditLog';
import { computeFieldDiff } from '@/lib/diffUtils';

export type DailyTaskStatus = 'pending' | 'in_progress' | 'completed';

export interface DailySprintTask {
  id: string;
  title: string;
  task_code: string | null;
  status: DailyTaskStatus;
  parent_id: string | null;
  assigned_to: string;
  estimated_hours: number | null;
  actual_hours: number | null;
  completed_at: string | null;
}

export function useDailySprintTasks(sprintId: string, personId: string, enabled = true) {
  return useQuery<DailySprintTask[]>({
    queryKey: ['daily-sprint-tasks', sprintId, personId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sprint_deliverables')
        .select('id, title, task_code, status, parent_id, assigned_to, estimated_hours, actual_hours, completed_at')
        .eq('sprint_id', sprintId)
        .eq('assigned_to', personId)
        .order('task_code', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((task) => ({
        ...task,
        status: normalizeDailyTaskStatus(task.status),
        assigned_to: task.assigned_to as string,
      }));
    },
    enabled: Boolean(enabled && sprintId && personId),
    staleTime: 0,
    gcTime: 0,
  });
}

interface UpdateDailyTaskStatusInput {
  task: DailySprintTask;
  status: DailyTaskStatus;
  actualHours?: number;
}

export function useUpdateDailyTaskStatus(authenticatedUserId?: string) {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ task, status, actualHours }: UpdateDailyTaskStatusInput) => {
      if (!authenticatedUserId || task.assigned_to !== authenticatedUserId) {
        throw new Error('Você só pode atualizar tarefas atribuídas a você.');
      }
      if (status === 'completed' && (actualHours === undefined || !Number.isFinite(actualHours) || actualHours < 0)) {
        throw new Error('Preencha as horas realizadas para concluir a tarefa.');
      }

      const completedAt = status === 'completed'
        ? task.completed_at ?? new Date().toISOString()
        : null;
      const payload = {
        status,
        completed_at: completedAt,
        ...(status === 'completed' ? { actual_hours: actualHours } : {}),
      };
      const { data, error } = await supabase
        .from('sprint_deliverables')
        .update(payload)
        .eq('id', task.id)
        .eq('assigned_to', authenticatedUserId)
        .select('id, title, task_code, status, parent_id, assigned_to, estimated_hours, actual_hours, completed_at')
        .single();

      if (error) throw error;

      const updatedTask: DailySprintTask = {
        ...data,
        status: normalizeDailyTaskStatus(data.status),
        assigned_to: data.assigned_to as string,
      };
      await logAction({
        area: 'dev',
        entity_type: task.parent_id ? 'subtask' : 'task',
        entity_id: task.id,
        entity_name: task.title,
        action: 'updated',
        changed_fields: computeFieldDiff({ ...task }, { ...updatedTask }, ['status', 'completed_at', 'actual_hours']),
        details: 'Status atualizado pela atualização rápida da Daily.',
      });
      return updatedTask;
    },
    onSuccess: (updatedTask) => {
      queryClient.setQueriesData<DailySprintTask[]>({ queryKey: ['daily-sprint-tasks'] }, (tasks) =>
        tasks?.map((task) => task.id === updatedTask.id ? updatedTask : task),
      );
      void queryClient.invalidateQueries({ queryKey: ['daily-sprint-tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['daily-sprint-progress'] });
      void queryClient.invalidateQueries({ queryKey: ['sprint_deliverables'] });
      void queryClient.invalidateQueries({ queryKey: ['domain-equipe-sprint-detalhes'] });
      void queryClient.invalidateQueries({ queryKey: ['domain-equipe-kanban'] });
      void queryClient.invalidateQueries({ queryKey: ['domain-horas-acumuladas'] });
      void queryClient.invalidateQueries({ queryKey: ['domain-sprints'] });
    },
  });
}

function normalizeDailyTaskStatus(status: string | null): DailyTaskStatus {
  return status === 'in_progress' || status === 'completed' ? status : 'pending';
}
