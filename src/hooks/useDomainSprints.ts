import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';
import { fetchAllRows } from '@/lib/supabasePagination';

export interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: string;
  project_id: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  cluster_id: string | null;
}

export interface Cluster {
  id: string;
  name: string;
}

export interface SprintHours {
  userId: string;
  name: string;
  hours: number;
}

export interface SprintImpact {
  sprintId: string;
  totalCostSaved: number;
  totalTimeSaved: number;
  improvementsCount: number;
}

interface DomainSprintsData {
  sprints: Sprint[];
  projects: Project[];
  clusters: Cluster[];
  sprintHoursMap: Record<string, SprintHours[]>;
  sprintImpactMap: Record<string, SprintImpact>;
}

export interface CreateSprintInput {
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  project_id: string | null;
  status: string;
  created_by: string | undefined;
}

export interface UpdateSprintInput {
  id: string;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  project_id: string | null;
  status: string;
}

export interface UpdateSprintStatusInput {
  sprintId: string;
  status: string;
}

const domainSprintsQueryKeys = {
  all: ['domain-sprints'] as const,
  list: (projectFilter: string | null) => ['domain-sprints', projectFilter] as const,
};

const chunkArray = <T,>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const fetchSprintHours = async (
  sprintsList: Sprint[],
): Promise<Record<string, SprintHours[]> | undefined> => {
  try {
    // Fetch all profiles
    const { data: profiles } = await supabase
      .from('profiles_safe')
      .select('id, first_name, last_name');

    const profileMap: Record<string, string> = {};
    profiles?.forEach((profile) => {
      profileMap[profile.id] =
        `${profile.first_name} ${profile.last_name}`.trim() || 'Sem nome';
    });

    // Fetch deliverables for all sprints (chunked to avoid URL limit)
    const sprintIds = sprintsList.map((sprint) => sprint.id);
    const sprintChunks = chunkArray(sprintIds, 50);
    const deliverables: {
      id: string;
      sprint_id: string;
      assigned_to: string | null;
      estimated_hours: number | null;
      parent_id: string | null;
    }[] = [];
    // Cada lote cobre 50 sprints, o que passa fácil do limite de linhas do PostgREST: sem paginar,
    // parte dos entregáveis do lote não vinha e as horas por pessoa saíam menores. Ver
    // supabasePagination.
    for (const chunk of sprintChunks) {
      const { rows } = await fetchAllRows<(typeof deliverables)[number]>((from, to) =>
        supabase
          .from('sprint_deliverables')
          .select('id, sprint_id, assigned_to, estimated_hours, parent_id', { count: 'exact' })
          .in('sprint_id', chunk)
          .order('id', { ascending: true })
          .range(from, to),
      );
      deliverables.push(...rows);
    }

    // Tarefas-pai (têm subtarefas) não entram na soma, pra não duplicar horas.
    const parentIds = new Set(deliverables.map((d) => d.parent_id).filter(Boolean) as string[]);

    const hoursMap: Record<string, Record<string, number>> = {};

    deliverables.forEach((deliverable) => {
      if (
        deliverable.sprint_id &&
        deliverable.assigned_to &&
        deliverable.estimated_hours &&
        !parentIds.has(deliverable.id)
      ) {
        if (!hoursMap[deliverable.sprint_id]) {
          hoursMap[deliverable.sprint_id] = {};
        }
        if (!hoursMap[deliverable.sprint_id][deliverable.assigned_to]) {
          hoursMap[deliverable.sprint_id][deliverable.assigned_to] = 0;
        }
        hoursMap[deliverable.sprint_id][deliverable.assigned_to] += Number(
          deliverable.estimated_hours,
        );
      }
    });

    const result: Record<string, SprintHours[]> = {};

    Object.entries(hoursMap).forEach(([sprintId, userHours]) => {
      result[sprintId] = Object.entries(userHours)
        .map(([userId, hours]) => ({
          userId,
          name: profileMap[userId] || 'Desconhecido',
          hours,
        }))
        .sort((a, b) => b.hours - a.hours);
    });

    return result;
  } catch (error) {
    console.error('Error fetching sprint hours:', error);
    return undefined;
  }
};

const fetchSprintImpacts = async (
  sprintsList: Sprint[],
): Promise<Record<string, SprintImpact> | undefined> => {
  try {
    // Buscar deliverables de todas as sprints (chunked)
    const sprintIds = sprintsList.map((sprint) => sprint.id);
    const sprintChunks = chunkArray(sprintIds, 50);
    const deliverables: { id: string; sprint_id: string }[] = [];
    for (const chunk of sprintChunks) {
      const { rows } = await fetchAllRows<{ id: string; sprint_id: string }>((from, to) =>
        supabase
          .from('sprint_deliverables')
          .select('id, sprint_id', { count: 'exact' })
          .in('sprint_id', chunk)
          .order('id', { ascending: true })
          .range(from, to),
      );
      deliverables.push(...rows);
    }

    if (deliverables.length === 0) {
      return undefined;
    }

    const deliverableIds = deliverables.map((deliverable) => deliverable.id);
    const deliverableToSprintMap: Record<string, string> = {};
    deliverables.forEach((deliverable) => {
      deliverableToSprintMap[deliverable.id] = deliverable.sprint_id;
    });

    // Buscar melhorias completadas vinculadas a esses deliverables (chunked)
    const idChunks = chunkArray(deliverableIds, 50);
    const improvements: {
      sprint_deliverable_id: string | null;
      cost_saved_monthly: number | null;
      time_saved_hours: number | null;
    }[] = [];
    for (const chunk of idChunks) {
      const { data } = await supabase
        .from('process_improvements')
        .select('sprint_deliverable_id, cost_saved_monthly, time_saved_hours')
        .eq('evaluation_status', 'completed')
        .in('sprint_deliverable_id', chunk);
      if (data) improvements.push(...data);
    }

    if (improvements.length === 0) {
      return undefined;
    }

    // Agregar por sprint
    const impactMap: Record<string, SprintImpact> = {};
    improvements.forEach((improvement) => {
      const sprintId = deliverableToSprintMap[improvement.sprint_deliverable_id || ''];
      if (sprintId) {
        if (!impactMap[sprintId]) {
          impactMap[sprintId] = {
            sprintId,
            totalCostSaved: 0,
            totalTimeSaved: 0,
            improvementsCount: 0,
          };
        }
        impactMap[sprintId].totalCostSaved += improvement.cost_saved_monthly || 0;
        impactMap[sprintId].totalTimeSaved += improvement.time_saved_hours || 0;
        impactMap[sprintId].improvementsCount++;
      }
    });

    return impactMap;
  } catch (error) {
    console.error('Error fetching sprint impacts:', error);
    return undefined;
  }
};

export function useDomainSprints(projectFilter: string | null) {
  const queryClient = useQueryClient();
  const queryKey = domainSprintsQueryKeys.list(projectFilter);

  return useQuery<DomainSprintsData>({
    queryKey,
    queryFn: async () => {
      const previousData = queryClient.getQueryData<DomainSprintsData>(queryKey);

      try {
        const [projectsRes, clustersRes] = await Promise.all([
          supabase.from('projects').select('id, name, cluster_id').order('name'),
          supabase
            .from('estrutura_clusters')
            .select('id, name')
            .eq('is_active', true)
            .order('name'),
        ]);

        let query = supabase.from('sprints').select('*').order('name', { ascending: true });

        if (projectFilter) {
          query = query.eq('project_id', projectFilter);
        }

        const { data: sprintsData } = await query;
        const sprints = (sprintsData || []) as Sprint[];
        let sprintHoursMap = previousData?.sprintHoursMap ?? {};
        let sprintImpactMap = previousData?.sprintImpactMap ?? {};

        if (sprintsData && sprintsData.length > 0) {
          const [hoursResult, impactsResult] = await Promise.all([
            fetchSprintHours(sprints).catch((error) => {
              console.error('Hours error:', error);
              return undefined;
            }),
            fetchSprintImpacts(sprints).catch((error) => {
              console.error('Impacts error:', error);
              return undefined;
            }),
          ]);

          if (hoursResult) sprintHoursMap = hoursResult;
          if (impactsResult) sprintImpactMap = impactsResult;
        }

        return {
          projects: (projectsRes.data || []) as Project[],
          clusters: (clustersRes.data || []) as Cluster[],
          sprints,
          sprintHoursMap,
          sprintImpactMap,
        };
      } catch (error) {
        console.error('Error fetching data:', error);
        return (
          previousData ?? {
            projects: [],
            clusters: [],
            sprints: [],
            sprintHoursMap: {},
            sprintImpactMap: {},
          }
        );
      }
    },
    placeholderData: keepPreviousData,
  });
}

export function useDomainSprintMutations() {
  const queryClient = useQueryClient();
  const invalidateSprints = () => {
    void queryClient.invalidateQueries({ queryKey: domainSprintsQueryKeys.all });
  };

  const createSprint = useMutation({
    mutationKey: ['domain-sprints', 'create'],
    mutationFn: async (payload: CreateSprintInput) => {
      const { error } = await supabase.from('sprints').insert(payload);
      if (error) throw error;
    },
    onSuccess: invalidateSprints,
  });

  const updateSprint = useMutation({
    mutationKey: ['domain-sprints', 'update'],
    mutationFn: async ({ id, ...payload }: UpdateSprintInput) => {
      await assertCanPerform('sprints', 'update', id);
      const { error } = await supabase.from('sprints').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidateSprints,
  });

  const deleteSprint = useMutation({
    mutationKey: ['domain-sprints', 'delete'],
    mutationFn: async (sprintId: string) => {
      await assertCanPerform('sprints', 'delete', sprintId);
      const { error } = await supabase.from('sprints').delete().eq('id', sprintId);
      if (error) throw error;
    },
    onSuccess: invalidateSprints,
  });

  const updateSprintStatus = useMutation({
    mutationKey: ['domain-sprints', 'update-status'],
    mutationFn: async ({ sprintId, status }: UpdateSprintStatusInput) => {
      await assertCanPerform('sprints', 'update', sprintId);
      await supabase.from('sprints').update({ status }).eq('id', sprintId);
    },
    onSuccess: invalidateSprints,
  });

  return { createSprint, updateSprint, deleteSprint, updateSprintStatus };
}
