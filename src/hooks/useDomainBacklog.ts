import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';

export interface BacklogItem {
  id: string;
  sprint_id: string | null;
  title: string;
  description: string | null;
  priority: string;
  estimated_hours: number | null;
  suggested_by: string | null;
  status: string;
  moved_to_deliverable_id: string | null;
  project_id: string | null;
  cluster_id: string | null;
  created_at: string;
}

export interface Sprint {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
}

export interface Project {
  id: string;
  name: string;
  cluster_id: string | null;
}

export interface Process {
  id: string;
  name: string;
  project_id: string | null;
}

export interface ProjectProcess {
  process_id: string;
  project_id: string;
}

export interface BacklogCluster {
  id: string;
  name: string;
}

export interface DomainBacklogData {
  backlogItems: BacklogItem[];
  sprints: Sprint[];
  profiles: Profile[];
  projects: Project[];
  processes: Process[];
  projectProcesses: ProjectProcess[];
  clusters: BacklogCluster[];
}

export interface BacklogItemPayload {
  title: string;
  description: string | null;
  priority: string;
  estimated_hours: number | null;
  sprint_id: null;
  project_id: string | null;
  cluster_id: string | null;
}

export interface SprintDeliverablePayload {
  sprint_id: string;
  title: string;
  description: string | null;
  estimated_hours: number | null;
  assigned_to: string | null;
  start_date: string | null;
  due_date: string;
  status: string;
  project_id: string | null;
  process_id: string | null;
  task_code: string | null;
}

export interface MoveBacklogItemPayload {
  status: string;
  moved_to_deliverable_id: string;
  sprint_id: string;
}

interface UpdateBacklogItemInput {
  itemId: string;
  payload: BacklogItemPayload;
}

interface MoveBacklogItemInput {
  itemId: string;
  payload: MoveBacklogItemPayload;
}

export const domainBacklogQueryKeys = {
  data: ['domain-backlog'] as const,
};

const DOMAIN_BACKLOG_MUTATION_KEYS = {
  createItem: ['domain-backlog', 'create-item'] as const,
  updateItem: ['domain-backlog', 'update-item'] as const,
  deleteItem: ['domain-backlog', 'delete-item'] as const,
  createDeliverable: ['domain-backlog', 'create-deliverable'] as const,
  moveItem: ['domain-backlog', 'move-item'] as const,
};

export function useDomainBacklog() {
  return useQuery<DomainBacklogData>({
    queryKey: domainBacklogQueryKeys.data,
    queryFn: async () => {
      // Fetch backlog items (apenas os que não foram movidos e não têm sprint)
      const { data: backlogData, error: backlogError } = await supabase
        .from('sprint_backlog_items')
        .select('*')
        .is('sprint_id', null)
        .neq('status', 'moved_to_sprint')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (backlogError) throw backlogError;

      // Fetch sprints elegíveis para receber itens (ativas ou planejadas).
      // OBS: o status correto é 'planned' (o resto do sistema usa esse); antes
      // estava 'planning' (typo) e as sprints planejadas nunca apareciam aqui.
      const { data: sprintsData } = await supabase
        .from('sprints')
        .select('*')
        .in('status', ['active', 'planned'])
        .order('start_date', { ascending: true });

      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles_safe')
        .select('id, first_name, last_name');

      // Fetch projects, processes e associações (para alinhar com o form de Nova Tarefa)
      const [{ data: projectsData }, { data: processesData }, { data: ppData }, { data: clustersData }] = await Promise.all(
        [
          supabase.from('projects').select('id, name, cluster_id').order('name'),
          supabase.from('processes').select('id, name, project_id').order('name'),
          supabase.from('project_processes').select('process_id, project_id'),
          supabase.from('estrutura_clusters').select('id, name').eq('is_active', true).order('name'),
        ],
      );

      return {
        backlogItems: (backlogData || []) as unknown as BacklogItem[],
        sprints: sprintsData || [],
        profiles: profilesData || [],
        projects: (projectsData || []) as unknown as Project[],
        processes: processesData || [],
        projectProcesses: ppData || [],
        clusters: (clustersData || []) as unknown as BacklogCluster[],
      };
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useCreateDomainBacklogItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: DOMAIN_BACKLOG_MUTATION_KEYS.createItem,
    mutationFn: async (payload: BacklogItemPayload) => {
      // project_id é coluna nova: types.ts (autogerado) ainda não a conhece até Lovable regerar.
      const itemPayload = payload as typeof payload & Record<string, unknown>;
      const { data, error } = await supabase
        .from('sprint_backlog_items')
        .insert(itemPayload)
        .select()
        .single();

      if (error) throw error;
      return data as BacklogItem;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: domainBacklogQueryKeys.data });
    },
  });
}

export function useUpdateDomainBacklogItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: DOMAIN_BACKLOG_MUTATION_KEYS.updateItem,
    mutationFn: async ({ itemId, payload }: UpdateBacklogItemInput) => {
      // project_id é coluna nova: types.ts (autogerado) ainda não a conhece até Lovable regerar.
      const itemPayload = payload as typeof payload & Record<string, unknown>;

      await assertCanPerform('sprint_backlog_items', 'update', itemId);
      const { error } = await supabase
        .from('sprint_backlog_items')
        .update(itemPayload)
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: domainBacklogQueryKeys.data });
    },
  });
}

export function useDeleteDomainBacklogItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: DOMAIN_BACKLOG_MUTATION_KEYS.deleteItem,
    mutationFn: async (itemId: string) => {
      await assertCanPerform('sprint_backlog_items', 'delete', itemId);
      const { error } = await supabase.from('sprint_backlog_items').delete().eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: domainBacklogQueryKeys.data });
    },
  });
}

export function useCreateDomainBacklogDeliverable() {
  return useMutation({
    mutationKey: DOMAIN_BACKLOG_MUTATION_KEYS.createDeliverable,
    mutationFn: async (payload: SprintDeliverablePayload) => {
      const { data, error } = await supabase
        .from('sprint_deliverables')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });
}

export function useMoveDomainBacklogItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: DOMAIN_BACKLOG_MUTATION_KEYS.moveItem,
    mutationFn: async ({ itemId, payload }: MoveBacklogItemInput) => {
      await assertCanPerform('sprint_backlog_items', 'update', itemId);
      const { error } = await supabase
        .from('sprint_backlog_items')
        .update(payload)
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: domainBacklogQueryKeys.data });
    },
  });
}
