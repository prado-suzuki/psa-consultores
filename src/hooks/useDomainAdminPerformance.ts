import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDomainAdminPerformance() {
  const usersQuery = useQuery({
    queryKey: ['admin-users-count'],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles_safe')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    },
  });

  const projectsQuery = useQuery({
    queryKey: ['admin-projects-count'],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, status');

      if (error) throw error;
      return {
        total: data?.length || 0,
        active: data?.filter(p => p.status === 'active').length || 0,
      };
    },
  });

  const sprintsQuery = useQuery({
    queryKey: ['admin-sprints-count'],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sprints')
        .select('id, status');

      if (error) throw error;
      return {
        total: data?.length || 0,
        active: data?.filter(s => s.status === 'active').length || 0,
      };
    },
  });

  const tasksQuery = useQuery({
    queryKey: ['admin-tasks-count'],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, status');

      if (error) throw error;
      return {
        total: data?.length || 0,
        done: data?.filter(t => t.status === 'done').length || 0,
        inProgress: data?.filter(t => t.status === 'in_progress').length || 0,
        backlog: data?.filter(t => t.status === 'backlog').length || 0,
      };
    },
  });

  const deliverablesQuery = useQuery({
    queryKey: ['admin-deliverables-count'],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sprint_deliverables')
        .select('id, status');

      if (error) throw error;
      return {
        total: data?.length || 0,
        completed: data?.filter(d => d.status === 'completed').length || 0,
        pending: data?.filter(d => d.status === 'pending').length || 0,
      };
    },
  });

  const ticketsQuery = useQuery({
    queryKey: ['admin-tickets-count'],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, status');

      if (error) throw error;
      return {
        total: data?.length || 0,
        open: data?.filter(t => t.status === 'aberto').length || 0,
        closed: data?.filter(t => t.status === 'fechado').length || 0,
      };
    },
  });

  return {
    usersQuery,
    projectsQuery,
    sprintsQuery,
    tasksQuery,
    deliverablesQuery,
    ticketsQuery,
  };
}
