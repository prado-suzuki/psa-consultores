import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ReviewTaskNotification {
  id: string;
  title: string;
  /** Nome do responsável que enviou a tarefa para revisão. */
  assignedToName: string;
  projectName: string | null;
  updated_at: string;
}

/**
 * Notificações de "tarefa enviada para revisão" para o revisor.
 *
 * Segue o padrão DERIVADO do projeto (como useTicketNotifications): não há
 * tabela de notificações — o item é a própria tarefa em que o usuário é o
 * revisor (`reviewer_id`) e que está aguardando revisão (`status = 'review'`).
 * A notificação some sozinha quando o revisor aprova/devolve (a tarefa sai de
 * 'review'). O RLS `rls_org_tasks_select` já libera o revisor a ver essas
 * linhas (reviewer_id = auth.uid() AND status = 'review').
 */
export function useReviewTaskNotifications() {
  const { user, sessaoExpirada } = useAuth();
  const userId = user?.id;

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['review-task-notifications', userId],
    queryFn: async (): Promise<ReviewTaskNotification[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('org_tasks')
        .select(`
          id,
          title,
          updated_at,
          assigned_to_name,
          project:org_projects(name)
        `)
        .eq('reviewer_id', userId)
        .eq('status', 'review')
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching review notifications:', error);
        return [];
      }

      return (data || []).map((task) => {
        // O embed do Supabase pode vir como objeto (to-one) ou array — normaliza.
        const project = Array.isArray(task.project) ? task.project[0] : task.project;
        return {
          id: task.id,
          title: task.title,
          assignedToName: task.assigned_to_name || 'Responsável',
          projectName: project?.name ?? null,
          updated_at: task.updated_at,
        };
      });
    },
    enabled: !!userId && !sessaoExpirada,
    staleTime: 30000,
    refetchInterval: sessaoExpirada ? false : 30000,
  });

  return {
    notifications,
    count: notifications.length,
    isLoading,
    refetch,
  };
}
