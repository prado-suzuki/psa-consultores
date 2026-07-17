import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  mapProcessesWithProjects,
  type EquipeProcesso,
  type EquipeProcessoCatalogClient,
  type EquipeProcessoProject,
  type EquipeProcessoProjectLink,
  type EquipeProcessoStage,
} from '@/lib/equipeProcessos';

const formerImperativeQueryOptions = {
  staleTime: 0,
  gcTime: 0,
  retry: false,
  networkMode: 'always',
  refetchOnMount: 'always',
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

export const equipeProcessosQueryKeys = {
  processes: (userId: string | undefined) =>
    ['domain-equipe-processos', 'processes', userId ?? null] as const,
  catalogClients: (userId: string | undefined) =>
    ['domain-equipe-processos', 'catalog-clients', userId ?? null] as const,
  projects: (userId: string | undefined) =>
    ['domain-equipe-processos', 'projects', userId ?? null] as const,
  equipes: (userId: string | undefined) =>
    ['domain-equipe-processos', 'equipes', userId ?? null] as const,
  details: (userId: string | undefined, processId: string) =>
    ['domain-equipe-processos', 'details', userId ?? null, processId] as const,
  processSnapshot: (userId: string | undefined, processId: string) =>
    ['domain-equipe-processos', 'process-snapshot', userId ?? null, processId] as const,
};

async function queryProcesses(): Promise<EquipeProcesso[]> {
  try {
    const { data, error } = await supabase
      .from('processes')
      .select(
        `
        *,
        catalog_client:catalog_clients!client_id(id, name, responsible, color, is_active),
        equipe:estrutura_equipes!processes_equipe_id_fkey(id, name, area:estrutura_areas!estrutura_equipes_area_id_fkey(id, name)),
        project_processes(
          id,
          impact_type,
          project:projects(id, name)
        )
      `,
      )
      .order('name');

    if (error) throw error;
    return mapProcessesWithProjects(
      (data || []) as unknown as Parameters<typeof mapProcessesWithProjects>[0],
    );
  } catch (error) {
    console.error('Error fetching processes:', error);
    throw error;
  }
}

export function useEquipeProcessosQuery(userId: string | undefined) {
  return useQuery({
    queryKey: equipeProcessosQueryKeys.processes(userId),
    queryFn: queryProcesses,
    ...formerImperativeQueryOptions,
  });
}

export function useEquipeProcessosCatalogClientsQuery(userId: string | undefined) {
  return useQuery<EquipeProcessoCatalogClient[]>({
    queryKey: equipeProcessosQueryKeys.catalogClients(userId),
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('catalog_clients')
          .select('id, name, responsible, color, is_active')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error fetching catalog clients:', error);
        throw error;
      }
    },
    ...formerImperativeQueryOptions,
  });
}

export function useEquipeProcessosProjectsQuery(userId: string | undefined) {
  return useQuery<EquipeProcessoProject[]>({
    queryKey: equipeProcessosQueryKeys.projects(userId),
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name')
          .eq('status', 'active')
          .order('name');
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
    },
    ...formerImperativeQueryOptions,
  });
}

export interface EquipeProcessoDetails {
  stages: EquipeProcessoStage[];
  projectProcesses: EquipeProcessoProjectLink[];
  taskCount: number;
}

export function useEquipeProcessosImperativeQueries(userId: string | undefined) {
  const queryClient = useQueryClient();

  const fetchEquipes = () =>
    queryClient.fetchQuery({
      queryKey: equipeProcessosQueryKeys.equipes(userId),
      queryFn: async () => {
        const { data } = await supabase
          .from('estrutura_equipes')
          .select('id, name')
          .eq('is_active', true)
          .order('name');
        return data;
      },
      ...formerImperativeQueryOptions,
    });

  const patchProcessInCache = (processId: string, updates: Partial<EquipeProcesso>) => {
    queryClient.setQueryData<EquipeProcesso[]>(
      equipeProcessosQueryKeys.processes(userId),
      (previous) =>
        previous?.map((process) =>
          process.id === processId ? { ...process, ...updates } : process,
        ),
    );
  };

  const removeProcessFromCache = (processId: string) => {
    queryClient.setQueryData<EquipeProcesso[]>(
      equipeProcessosQueryKeys.processes(userId),
      (previous) => previous?.filter((process) => process.id !== processId),
    );
  };

  const fetchProcessDetails = (processId: string) =>
    queryClient.fetchQuery({
      queryKey: equipeProcessosQueryKeys.details(userId, processId),
      queryFn: async (): Promise<EquipeProcessoDetails> => {
        const [stagesRes, projectsRes, taskCountRes] = await Promise.all([
          supabase
            .from('process_stages')
            .select('*')
            .eq('process_id', processId)
            .order('stage_order'),
          supabase
            .from('project_processes')
            .select('*, projects:project_id (id, name)')
            .eq('process_id', processId),
          supabase
            .from('sprint_deliverables')
            .select('id', { count: 'exact', head: true })
            .eq('process_id', processId),
        ]);

        if (stagesRes.error) throw stagesRes.error;
        if (projectsRes.error) throw projectsRes.error;
        return {
          stages: (stagesRes.data || []) as EquipeProcessoStage[],
          projectProcesses: (projectsRes.data || []) as unknown as EquipeProcessoProjectLink[],
          taskCount: taskCountRes.count || 0,
        };
      },
      ...formerImperativeQueryOptions,
    });

  const fetchProcessSnapshot = (processId: string) =>
    queryClient.fetchQuery({
      queryKey: equipeProcessosQueryKeys.processSnapshot(userId, processId),
      queryFn: async () => {
        const { data } = await supabase.from('processes').select('*').eq('id', processId).single();
        return data as EquipeProcesso | null;
      },
      ...formerImperativeQueryOptions,
    });

  return {
    fetchEquipes,
    fetchProcessDetails,
    fetchProcessSnapshot,
    patchProcessInCache,
    removeProcessFromCache,
  };
}
