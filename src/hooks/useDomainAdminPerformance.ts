import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows, type SupabasePage } from '@/lib/supabasePagination';

interface StatusRow {
  id: string;
  status: string | null;
}

// Estes contadores somam linha por linha (precisam do recorte por status), então dependem de
// receber a tabela inteira. Sem paginar, o PostgREST devolvia no máximo o limite de linhas do
// projeto e os totais do painel ficavam travados nesse teto. Ver supabasePagination.
async function fetchAllStatusRows(
  fetchPage: (from: number, to: number) => PromiseLike<SupabasePage<StatusRow>>,
) {
  const { rows, error } = await fetchAllRows(fetchPage);
  if (error) throw error;
  return rows;
}

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
      const data = await fetchAllStatusRows((from, to) =>
        supabase
          .from('projects')
          .select('id, status', { count: 'exact' })
          .order('id', { ascending: true })
          .range(from, to),
      );
      return {
        total: data.length,
        active: data.filter(p => p.status === 'active').length,
      };
    },
  });

  const sprintsQuery = useQuery({
    queryKey: ['admin-sprints-count'],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const data = await fetchAllStatusRows((from, to) =>
        supabase
          .from('sprints')
          .select('id, status', { count: 'exact' })
          .order('id', { ascending: true })
          .range(from, to),
      );
      return {
        total: data.length,
        active: data.filter(s => s.status === 'active').length,
      };
    },
  });

  const deliverablesQuery = useQuery({
    queryKey: ['admin-deliverables-count'],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const data = await fetchAllStatusRows((from, to) =>
        supabase
          .from('sprint_deliverables')
          .select('id, status', { count: 'exact' })
          .order('id', { ascending: true })
          .range(from, to),
      );
      return {
        total: data.length,
        completed: data.filter(d => d.status === 'completed').length,
        inProgress: data.filter(d => d.status === 'in_progress').length,
        pending: data.filter(d => d.status === 'pending').length,
      };
    },
  });

  const ticketsQuery = useQuery({
    queryKey: ['admin-tickets-count'],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const data = await fetchAllStatusRows((from, to) =>
        supabase
          .from('tickets')
          .select('id, status', { count: 'exact' })
          .order('id', { ascending: true })
          .range(from, to),
      );
      return {
        total: data.length,
        open: data.filter(t => t.status === 'aberto').length,
        closed: data.filter(t => t.status === 'fechado').length,
      };
    },
  });

  return {
    usersQuery,
    projectsQuery,
    sprintsQuery,
    deliverablesQuery,
    ticketsQuery,
  };
}
