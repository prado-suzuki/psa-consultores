import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';

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

/** Agregados por sprint que a lista mostra no card — vêm somados do banco. */
export interface SprintResumo {
  horasAlocadas: number;
  custoEconomizadoMensal: number;
  horasLiberadas: number;
  melhorias: number;
}

interface SprintResumoRow {
  sprint_id: string;
  horas_alocadas: number | string | null;
  custo_economizado_mensal: number | string | null;
  horas_liberadas: number | string | null;
  melhorias: number | string | null;
}

interface DomainSprintsData {
  sprints: Sprint[];
  projects: Project[];
  clusters: Cluster[];
  resumoPorSprint: Record<string, SprintResumo>;
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

/** `numeric` do Postgres chega como string no PostgREST. */
const toNumber = (value: number | string | null) => Number(value ?? 0) || 0;

const indexResumo = (rows: SprintResumoRow[]) =>
  rows.reduce<Record<string, SprintResumo>>((map, row) => {
    map[row.sprint_id] = {
      horasAlocadas: toNumber(row.horas_alocadas),
      custoEconomizadoMensal: toNumber(row.custo_economizado_mensal),
      horasLiberadas: toNumber(row.horas_liberadas),
      melhorias: toNumber(row.melhorias),
    };
    return map;
  }, {});

/**
 * Dados da lista `/equipe/sprints`.
 *
 * A tela lista sprints, não tarefas: aqui não se lê `sprint_deliverables`. As
 * horas alocadas e o impacto vêm somados da view `sprint_resumo` (uma linha por
 * sprint). Antes eram calculados no cliente, baixando todos os entregáveis de
 * todas as sprints duas vezes e consultando `process_improvements` em lotes de
 * 50 ids em série — dezenas de idas ao banco para exibir dois números por card.
 *
 * As quatro leituras são independentes e vão juntas: a tela abre em um
 * round-trip, não em uma fila.
 */
export function useDomainSprints(projectFilter: string | null) {
  const queryClient = useQueryClient();
  const queryKey = domainSprintsQueryKeys.list(projectFilter);

  return useQuery<DomainSprintsData>({
    queryKey,
    queryFn: async () => {
      const previousData = queryClient.getQueryData<DomainSprintsData>(queryKey);

      try {
        const sprintsQuery = supabase.from('sprints').select('*').order('name', { ascending: true });

        const [projectsRes, clustersRes, sprintsRes, resumoRes] = await Promise.all([
          supabase.from('projects').select('id, name, cluster_id').order('name'),
          supabase
            .from('estrutura_clusters')
            .select('id, name')
            .eq('is_active', true)
            .order('name'),
          projectFilter ? sprintsQuery.eq('project_id', projectFilter) : sprintsQuery,
          supabase
            .from('sprint_resumo')
            .select('sprint_id, horas_alocadas, custo_economizado_mensal, horas_liberadas, melhorias'),
        ]);

        // A view é opcional para a tela abrir: sem ela os cards perdem os números
        // agregados, mas a lista de sprints continua de pé (útil enquanto a
        // migration não estiver aplicada no ambiente).
        if (resumoRes.error) {
          console.error('Error fetching sprint resumo:', resumoRes.error);
        }

        return {
          projects: (projectsRes.data || []) as Project[],
          clusters: (clustersRes.data || []) as Cluster[],
          sprints: (sprintsRes.data || []) as Sprint[],
          resumoPorSprint: indexResumo(
            (resumoRes.data || []) as unknown as SprintResumoRow[],
          ),
        };
      } catch (error) {
        console.error('Error fetching data:', error);
        return (
          previousData ?? {
            projects: [],
            clusters: [],
            sprints: [],
            resumoPorSprint: {},
          }
        );
      }
    },
    placeholderData: keepPreviousData,
    // Voltar do detalhe para a lista não precisa refazer as leituras: as
    // mutações do domínio já invalidam a chave.
    staleTime: 60_000,
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
