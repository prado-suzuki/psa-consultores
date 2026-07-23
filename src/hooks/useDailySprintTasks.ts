// Tarefas (entregáveis) de uma pessoa numa sprint — usadas na Daily para:
//  (1) "chips" que a pessoa toca pra inserir a tarefa no texto de ontem/hoje (sem redigitar);
//  (2) o dropdown "tarefa travada" do bloqueio estruturado.
// Fica num hook próprio (regra do projeto: nada de supabase.from direto no componente).

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DailySprintTask {
  id: string;
  title: string;
  task_code: string | null;
  status: string;
  parent_id: string | null;
}

export function useDailySprintTasks(sprintId: string, personId: string) {
  return useQuery<DailySprintTask[]>({
    queryKey: ['daily-sprint-tasks', sprintId, personId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sprint_deliverables')
        .select('id, title, task_code, status, parent_id')
        .eq('sprint_id', sprintId)
        .eq('assigned_to', personId)
        .order('task_code', { ascending: true });
      if (error) throw error;
      return (data ?? []) as DailySprintTask[];
    },
    enabled: Boolean(sprintId && personId),
    staleTime: 0,
    gcTime: 0,
  });
}
