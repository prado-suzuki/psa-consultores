import { useQuery } from '@tanstack/react-query';
import { currentAmbiente } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';

export interface EquipeProjeto {
  id: string;
  name: string;
  description: string | null;
  status: string;
  client_name: string | null;
  client_id: string | null;
  external_client_id: string | null;
  leader_id: string | null;
  area: string | null;
  cluster_id: string | null;
  equipe_id: string | null;
  product_service: string | null;
  project_front: string | null;
  justification_type: string | null;
  justification_detail: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface EquipeProjetoBacklogTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  estimated_hours: number | null;
  created_at: string;
}

export interface EquipeProjetoProcesso {
  id: string;
  name: string;
  code?: string | null;
  description: string | null;
  area: string | null;
  equipe_id: string | null;
  stage: string;
  priority: string | null;
  frequency: string | null;
  volume_month: number | null;
  financial_impact: string | null;
  client_id: string | null;
  impact_type?: string | null;
}

export interface EquipeProjetoCatalogClient {
  id: string;
  name: string;
  responsible: string | null;
  color: string;
  is_active: boolean;
}

export interface EquipeProjetoExternalClient {
  id: string;
  nome: string;
}

export interface EquipeProjetoTeamMember {
  id: string;
  first_name: string;
  last_name: string;
}

interface ProjectProcessLink {
  impact_type: string | null;
  process: EquipeProjetoProcesso | null;
}

const formerImperativeQueryOptions = {
  staleTime: 0,
  gcTime: 0,
  retry: false,
  networkMode: 'always',
  refetchOnMount: 'always',
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

export const equipeProjetosQueryKeys = {
  projects: (userId: string | undefined) =>
    ['domain-equipe-projetos', 'projects', userId ?? null] as const,
  catalogClients: (userId: string | undefined) =>
    ['domain-equipe-projetos', 'catalog-clients', userId ?? null] as const,
  externalClients: (userId: string | undefined) =>
    ['domain-equipe-projetos', 'external-clients', userId ?? null, currentAmbiente] as const,
  teamMembers: (userId: string | undefined) =>
    ['domain-equipe-projetos', 'team-members', userId ?? null] as const,
  backlog: (userId: string | undefined, projectId: string | undefined) =>
    ['domain-equipe-projetos', 'backlog', userId ?? null, projectId ?? null] as const,
  processes: (userId: string | undefined, projectId: string | undefined) =>
    ['domain-equipe-projetos', 'processes', userId ?? null, projectId ?? null] as const,
};

export function useEquipeProjetosQuery(userId: string | undefined) {
  return useQuery<EquipeProjeto[]>({
    queryKey: equipeProjetosQueryKeys.projects(userId),
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        return (data || []) as EquipeProjeto[];
      } catch (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
    },
    ...formerImperativeQueryOptions,
  });
}

export function useEquipeProjetosCatalogClientsQuery(userId: string | undefined) {
  return useQuery<EquipeProjetoCatalogClient[]>({
    queryKey: equipeProjetosQueryKeys.catalogClients(userId),
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('catalog_clients')
          .select('id, name, responsible, color, is_active')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        return (data || []) as EquipeProjetoCatalogClient[];
      } catch (error) {
        console.error('Error fetching catalog clients:', error);
        throw error;
      }
    },
    ...formerImperativeQueryOptions,
  });
}

export function useEquipeProjetosExternalClientsQuery(userId: string | undefined) {
  return useQuery<EquipeProjetoExternalClient[]>({
    queryKey: equipeProjetosQueryKeys.externalClients(userId),
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('cliente')
          .select('id, nome')
          .eq('ativo', true)
          .eq('excluido', false)
          .eq('ambiente', currentAmbiente)
          .order('nome');

        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error fetching external clients:', error);
        throw error;
      }
    },
    ...formerImperativeQueryOptions,
  });
}

export function useEquipeProjetosTeamMembersQuery(userId: string | undefined) {
  return useQuery<EquipeProjetoTeamMember[]>({
    queryKey: equipeProjetosQueryKeys.teamMembers(userId),
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from('profiles_safe')
          .select('id, first_name, last_name')
          .order('first_name');

        return (data || []) as EquipeProjetoTeamMember[];
      } catch (error) {
        console.error('Error fetching team members:', error);
        throw error;
      }
    },
    ...formerImperativeQueryOptions,
  });
}

export function useEquipeProjetoBacklogQuery(
  userId: string | undefined,
  projectId: string | undefined,
) {
  return useQuery<EquipeProjetoBacklogTask[]>({
    queryKey: equipeProjetosQueryKeys.backlog(userId, projectId),
    enabled: Boolean(projectId),
    placeholderData: (previousData) => previousData,
    queryFn: async () => {
      if (!projectId) return [];

      try {
        const { data, error } = await supabase
          .from('sprint_backlog_items')
          .select('id, title, description, status, priority, estimated_hours, created_at')
          .filter('project_id', 'eq', projectId)
          .is('sprint_id', null)
          .neq('status', 'moved_to_sprint')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []) as EquipeProjetoBacklogTask[];
      } catch (error) {
        console.error('Error fetching backlog tasks:', error);
        throw error;
      }
    },
    ...formerImperativeQueryOptions,
  });
}

export function useEquipeProjetoProcessesQuery(
  userId: string | undefined,
  projectId: string | undefined,
) {
  return useQuery<EquipeProjetoProcesso[]>({
    queryKey: equipeProjetosQueryKeys.processes(userId, projectId),
    enabled: Boolean(projectId),
    placeholderData: (previousData) => previousData,
    queryFn: async () => {
      if (!projectId) return [];

      try {
        const processFields =
          'id, name, code, description, area, equipe_id, stage, priority, frequency, volume_month, financial_impact, client_id';

        const [linksRes, directRes] = await Promise.all([
          supabase
            .from('project_processes')
            .select(`id, impact_type, process:processes(${processFields})`)
            .eq('project_id', projectId),
          supabase.from('processes').select(processFields).eq('project_id', projectId),
        ]);

        if (linksRes.error) throw linksRes.error;
        if (directRes.error) throw directRes.error;

        const byId = new Map<string, EquipeProjetoProcesso>();
        for (const process of directRes.data || []) {
          if (process) {
            const typedProcess = process as EquipeProjetoProcesso;
            byId.set(typedProcess.id, { ...typedProcess });
          }
        }
        for (const projectProcess of (linksRes.data || []) as ProjectProcessLink[]) {
          const process = projectProcess.process;
          if (process) {
            byId.set(process.id, {
              ...process,
              impact_type: projectProcess.impact_type,
            });
          }
        }

        return Array.from(byId.values());
      } catch (error) {
        console.error('Error fetching processes:', error);
        throw error;
      }
    },
    ...formerImperativeQueryOptions,
  });
}
