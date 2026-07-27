import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/supabasePagination';
import type {
  AnaliseInteligenteDaily,
  AnaliseInteligenteData,
  AnaliseInteligenteDeliverable,
  AnaliseInteligenteImprovement,
  AnaliseInteligenteProcess,
  AnaliseInteligenteProject,
  AnaliseInteligenteSprint,
} from '@/lib/analiseInteligente';

const queryKey = ['domain-analise-inteligente', 'aggregate-data'] as const;

async function fetchAnaliseInteligenteData(): Promise<AnaliseInteligenteData> {
  const [sprintsRes, projectsRes, processesRes, deliverablesPage, dailysRes, improvRes] =
    await Promise.all([
      supabase
        .from('sprints')
        .select('id, name, project_id, start_date, end_date, status')
        .order('start_date', { ascending: false }),
      supabase.from('projects').select('id, name, cluster_id').order('name'),
      supabase.from('processes').select('id, name, area, project_id').order('name'),
      // Tabela inteira: precisa paginar, senão as métricas eram calculadas sobre uma fatia
      // arbitrária no limite de linhas do PostgREST. Ver supabasePagination.
      fetchAllRows<AnaliseInteligenteDeliverable>((from, to) =>
        supabase
          .from('sprint_deliverables')
          .select(
            'id, sprint_id, project_id, process_id, status, due_date, estimated_hours, parent_id, completed_at, created_at, assigned_to',
            { count: 'exact' },
          )
          .order('id', { ascending: true })
          .range(from, to),
      ),
      supabase
        .from('daily_standups')
        .select('id, date, sprint_id, project_id, process_id, blockers, user_id')
        .order('date', { ascending: false })
        .limit(800),
      supabase
        .from('process_improvements')
        .select('sprint_deliverable_id, cost_saved_monthly, time_saved_hours, evaluation_status')
        .eq('evaluation_status', 'completed'),
    ]);

  return {
    sprints: (sprintsRes.data ?? []) as AnaliseInteligenteSprint[],
    projects: (projectsRes.data ?? []) as AnaliseInteligenteProject[],
    processes: (processesRes.data ?? []) as AnaliseInteligenteProcess[],
    deliverables: deliverablesPage.rows,
    dailys: (dailysRes.data ?? []) as AnaliseInteligenteDaily[],
    improvements: (improvRes.data ?? []) as AnaliseInteligenteImprovement[],
  };
}

const emptyData: AnaliseInteligenteData = {
  sprints: [],
  projects: [],
  processes: [],
  deliverables: [],
  dailys: [],
  improvements: [],
};

export function useDomainAnaliseInteligenteData() {
  const query = useQuery({
    queryKey,
    queryFn: fetchAnaliseInteligenteData,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    networkMode: 'always',
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const { refetch } = query;

  useEffect(() => {
    const channel = supabase
      .channel('analise-inteligente-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_standups' }, () => {
        void refetch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sprints' }, () => {
        void refetch();
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sprint_deliverables' },
        () => {
          void refetch();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refetch]);

  return {
    data: query.data ?? emptyData,
    isFetching: query.isFetching,
    error: query.error,
  };
}
