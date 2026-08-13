import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';
import { useAuditLog } from '@/hooks/useAuditLog';
import { computeFieldDiff } from '@/lib/diffUtils';
import { clampDatesToSprint, collectDeliverableSubtree } from '@/lib/equipeSprintDetalhes';
import { findProfileByName, type TaskGroup } from '@/lib/excelImporter';

export interface SprintDetalhesSprint {
  id: string;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: string;
  project_id: string | null;
}

export interface SprintDetalhesDeliverable {
  id: string;
  title: string;
  /**
   * Não vem na leitura da lista (é rich text e ninguém a exibe ali). Chega
   * preenchida quando alguém pede: ao abrir a tarefa, ao entrar em Métricas ou
   * ao exportar.
   */
  description?: string | null;
  assigned_to: string | null;
  start_date: string | null;
  due_date: string;
  status: string;
  estimated_hours: number | null;
  // opcional: coluna nova; enquanto o types.ts gerado não a reflete, o dado
  // ainda vem do select('*') em runtime.
  actual_hours?: number | null;
  /** Coluna gerada: existe retrospectiva anexada? O markdown em si não vem. */
  tem_retrospectiva?: boolean;
  parent_id: string | null;
  task_code: string | null;
  project_id: string | null;
  process_id: string | null;
  profile?: { first_name: string; last_name: string };
}

export interface SprintDetalhesEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  event_type: string;
  participants: string[];
}

export interface SprintDetalhesMetric {
  id: string;
  name: string;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  category: string | null;
}

export interface SprintDetalhesProfile {
  id: string;
  first_name: string;
  last_name: string;
}

export interface SprintDetalhesProject {
  id: string;
  name: string;
}

export interface SprintDetalhesProcess {
  id: string;
  name: string;
  project_id: string | null;
}

export interface SprintDetalhesProjectProcess {
  process_id: string;
  project_id: string;
}

interface SprintDetalhesData {
  sprint: SprintDetalhesSprint;
  deliverables: SprintDetalhesDeliverable[];
  events: SprintDetalhesEvent[];
  metrics: SprintDetalhesMetric[];
}

/** Catálogos globais: não dependem da sprint aberta e quase nunca mudam. */
interface SprintDetalhesCatalogos {
  profiles: SprintDetalhesProfile[];
  projects: SprintDetalhesProject[];
  processes: SprintDetalhesProcess[];
  projectProcesses: SprintDetalhesProjectProcess[];
}

/**
 * Colunas que a lista da sprint realmente usa.
 *
 * `select('*')` arrastava `description` (rich text) e `retrospective_report`
 * (markdown da retrospectiva) de toda tarefa. Nenhuma das duas aparece na
 * lista: a descrição só é lida no modal de edição, na exportação e no
 * cruzamento da aba Métricas, e o texto da retrospectiva nunca é exibido — dele
 * a tela só precisa saber se existe.
 */
const DELIVERABLE_COLUNAS_DA_LISTA =
  'id, title, assigned_to, start_date, due_date, status, estimated_hours, actual_hours, parent_id, task_code, project_id, process_id';

/** Se o payload de realtime trouxe o markdown, o booleano é recalculado dele. */
const temRetrospectiva = (valor: unknown) =>
  typeof valor === 'string' ? valor.trim() !== '' : false;

interface DeliverableStatusInput {
  deliverableId: string;
  newStatus: string;
}

interface ReorderDeliverablesInput {
  shifts: Array<{
    deliverableId: string;
    taskCode: string;
  }>;
}

interface DeliverableUpdatePayload {
  title: string;
  description: string | null;
  assigned_to: string | null;
  start_date: string | null;
  due_date: string;
  estimated_hours: number | null;
  actual_hours?: number | null;
  status: string;
  completed_at: string | null;
  project_id: string | null;
  process_id: string | null;
  parent_id: string | null;
  task_code: string | null;
}

interface UpdateDeliverableInput {
  deliverableId: string;
  updates: DeliverableUpdatePayload;
}

interface UpdateRetrospectiveReportInput {
  deliverableId: string;
  deliverableTitle: string;
  entityType: 'task' | 'subtask';
  report: string | null;
}

type SprintDeliverablesRetrospectiveClient = {
  from: (table: 'sprint_deliverables') => {
    update: (values: { retrospective_report: string | null }) => {
      eq: (column: 'id', value: string) => Promise<{ error: Error | null }>;
    };
  };
};

export interface MoveDeliverableToSprintInput {
  deliverableId: string;
  /** Sprint de destino. A janela de datas vem daqui, para a tarefa não nascer vencida. */
  targetSprint: Pick<SprintDetalhesSprint, 'id' | 'name' | 'start_date' | 'end_date'>;
}

interface UpdateMetricInput {
  metricId: string;
  newValue: number;
}

interface CreateDeliverableInput {
  sprint_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  start_date: string;
  due_date: string;
  estimated_hours: number | null;
  status: string;
  parent_id: string | null;
  project_id: string | null;
  process_id: string | null;
  task_code: string | null;
}

interface ImportDeliverablesInput {
  sprint: SprintDetalhesSprint;
  taskGroups: TaskGroup[];
  responsibleMapping: Record<string, string>;
  profiles: SprintDetalhesProfile[];
}

interface DeliverableRealtimeChange {
  eventType: 'DELETE' | 'INSERT' | 'UPDATE';
  oldRecord: Record<string, unknown>;
  newRecord: Record<string, unknown>;
}

const DIGITAL_CLUSTER_ID = '952435d2-ef26-4829-80a2-e186dc61158c';

interface EquipeDigitalRow {
  gestor_id: string | null;
  estrutura_equipe_membros: Array<{ user_id: string | null }> | null;
}

/**
 * Pessoas do cluster Digital: os gestores das equipes e os membros delas.
 *
 * Resolvido em duas consultas (equipes+membros, depois perfis) usando embed do
 * PostgREST: a área entra como `!inner` só para filtrar o cluster. Antes eram
 * quatro consultas em fila — áreas, equipes, membros e perfis — cada uma
 * esperando os ids da anterior.
 */
const fetchPerfisDigital = async (): Promise<SprintDetalhesProfile[]> => {
  const { data: equipes } = await supabase
    .from('estrutura_equipes')
    .select('gestor_id, estrutura_areas!inner(cluster_id), estrutura_equipe_membros(user_id)')
    .eq('estrutura_areas.cluster_id', DIGITAL_CLUSTER_ID);

  const userIds = Array.from(
    new Set(
      ((equipes ?? []) as unknown as EquipeDigitalRow[])
        .flatMap((equipe) => [
          equipe.gestor_id,
          ...(equipe.estrutura_equipe_membros ?? []).map((membro) => membro.user_id),
        ])
        .filter((userId): userId is string => Boolean(userId)),
    ),
  );

  if (userIds.length === 0) return [];

  const { data } = await supabase
    .from('profiles_safe')
    .select('id, first_name, last_name')
    .in('id', userIds);

  return (data ?? []) as SprintDetalhesProfile[];
};

const sprintDetalhesKeys = {
  detail: (sprintId: string | undefined) =>
    ['domain-equipe-sprint-detalhes', sprintId] as const,
  /** Sem sprintId de propósito: é o mesmo catálogo para todas as sprints. */
  catalogos: () => ['domain-equipe-sprint-detalhes', 'catalogos'] as const,
  descricoes: (sprintId: string | undefined) =>
    ['domain-equipe-sprint-detalhes', sprintId, 'descricoes'] as const,
  descricaoDaTarefa: (deliverableId: string | undefined) =>
    ['domain-equipe-sprint-detalhes', 'descricao-tarefa', deliverableId] as const,
};

const applyDeliverableRealtimeChanges = (
  deliverables: SprintDetalhesDeliverable[],
  changes: DeliverableRealtimeChange[],
) =>
  changes.reduce<SprintDetalhesDeliverable[]>((current, change) => {
    const oldId =
      typeof change.oldRecord.id === 'string' ? change.oldRecord.id : null;
    const newId =
      typeof change.newRecord.id === 'string' ? change.newRecord.id : null;

    if (change.eventType === 'DELETE' && oldId) {
      return current.filter((deliverable) => deliverable.id !== oldId);
    }

    // O payload de realtime traz a linha inteira, inclusive o markdown da
    // retrospectiva. Aproveita para manter o booleano em dia, já que ele não é
    // coluna: sem isto, o ícone da tarefa ficaria preso no estado da carga.
    if (change.eventType === 'INSERT' && newId) {
      if (current.some((deliverable) => deliverable.id === newId)) return current;
      return [
        ...current,
        {
          ...(change.newRecord as unknown as SprintDetalhesDeliverable),
          tem_retrospectiva: temRetrospectiva(change.newRecord.retrospective_report),
        },
      ];
    }

    if (change.eventType === 'UPDATE' && newId) {
      return current.map((deliverable) =>
        deliverable.id === newId
          ? ({
              ...deliverable,
              ...change.newRecord,
              tem_retrospectiva:
                'retrospective_report' in change.newRecord
                  ? temRetrospectiva(change.newRecord.retrospective_report)
                  : deliverable.tem_retrospectiva,
            } as SprintDetalhesDeliverable)
          : deliverable,
      );
    }

    return current;
  }, deliverables);

/**
 * @param sprintId sprint aberta.
 * @param options.tarefaEmEdicao tarefa cuja descrição precisa estar carregada
 *   (o modal de edição grava o formulário inteiro, então não pode salvar com a
 *   descrição em branco só porque ela ainda não chegou).
 * @param options.comDescricoes carrega a descrição de todas as tarefas da
 *   sprint. Serve à aba Métricas, que cruza palavras da métrica com o texto.
 */
export function useDomainEquipeSprintDetalhes(
  sprintId: string | undefined,
  options: { tarefaEmEdicao?: string; comDescricoes?: boolean } = {},
) {
  const { tarefaEmEdicao, comDescricoes = false } = options;
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();
  const queryKey = sprintDetalhesKeys.detail(sprintId);
  const fetchInProgressRef = useRef(false);
  const pendingRealtimeChangesRef = useRef<DeliverableRealtimeChange[]>([]);

  const dataQuery = useQuery<SprintDetalhesData | null>({
    queryKey,
    enabled: Boolean(sprintId),
    retry: false,
    staleTime: 0,
    // Com gcTime 0 o cache era descartado ao sair da tela, então voltar para a
    // mesma sprint caía no spinner de tela cheia de novo. Guardando por alguns
    // minutos, a volta pinta na hora e o `refetchOnMount` revalida por trás.
    gcTime: 5 * 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      fetchInProgressRef.current = true;
      pendingRealtimeChangesRef.current = [];

      try {
        if (!sprintId) return null;

        const { data: sprintData, error: sprintError } = await supabase
          .from('sprints')
          .select('*')
          .eq('id', sprintId)
          .maybeSingle();

        if (sprintError) throw sprintError;
        if (!sprintData) return null;

        // Confirmada a existência da sprint, o resto não depende de mais nada e
        // vai junto: eram nove idas ao banco enfileiradas sem necessidade, cada
        // uma pagando a latência da anterior.
        const [
          { data: deliverablesData, error: deliverablesError },
          { data: eventsData, error: eventsError },
          { data: metricsData, error: metricsError },
          { data: comRetrospectiva, error: retrospectivaError },
        ] = await Promise.all([
          supabase
            .from('sprint_deliverables')
            .select(DELIVERABLE_COLUNAS_DA_LISTA)
            .eq('sprint_id', sprintId)
            .order('due_date', { ascending: true }),
          supabase
            .from('sprint_events')
            .select('*')
            .eq('sprint_id', sprintId)
            .order('event_date', { ascending: true })
            .order('start_time', { ascending: true }),
          supabase.from('sprint_metrics').select('*').eq('sprint_id', sprintId),
          // Quem tem retrospectiva anexada, só os ids. O PostgREST não projeta
          // expressão, então "tem ou não tem" ou vinha junto com o markdown
          // inteiro, ou sai daqui: um filtro que devolve um punhado de uuids, na
          // mesma leva das outras leituras. (Um texto só de espaços passaria
          // neste filtro; a tela não deixa gravar um, o botão exige `trim()`.)
          supabase
            .from('sprint_deliverables')
            .select('id')
            .eq('sprint_id', sprintId)
            .not('retrospective_report', 'is', null)
            .neq('retrospective_report', ''),
        ]);

        // Sem isto, uma leitura que falha vira "nenhum entregável cadastrado" na
        // tela: lista vazia é indistinguível de erro engolido.
        const falha = deliverablesError ?? eventsError ?? metricsError ?? retrospectivaError;
        if (falha) throw falha;

        const idsComRetrospectiva = new Set(
          ((comRetrospectiva ?? []) as Array<{ id: string }>).map((linha) => linha.id),
        );

        return {
          sprint: sprintData as SprintDetalhesSprint,
          deliverables: applyDeliverableRealtimeChanges(
            ((deliverablesData ?? []) as unknown as SprintDetalhesDeliverable[]).map(
              (deliverable) => ({
                ...deliverable,
                tem_retrospectiva: idsComRetrospectiva.has(deliverable.id),
              }),
            ),
            pendingRealtimeChangesRef.current,
          ),
          events: (eventsData ?? []) as SprintDetalhesEvent[],
          metrics: (metricsData ?? []) as SprintDetalhesMetric[],
        };
      } finally {
        fetchInProgressRef.current = false;
        pendingRealtimeChangesRef.current = [];
      }
    },
  });

  // Catálogos: pessoas do Digital, projetos, processos e o vínculo entre eles.
  // Não dependem da sprint e alimentam só os selects do modal de tarefa, mas
  // eram relidos por inteiro a cada sprint aberta. Query própria, sem sprintId
  // na chave: a primeira sprint da sessão paga, as seguintes reaproveitam.
  const catalogosQuery = useQuery<SprintDetalhesCatalogos>({
    queryKey: sprintDetalhesKeys.catalogos(),
    // Sem sprint na rota a tela não abre; não há o que catalogar.
    enabled: Boolean(sprintId),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const [profiles, { data: projectsData }, { data: processesData }, { data: projectProcessesData }] =
        await Promise.all([
          fetchPerfisDigital(),
          supabase.from('projects').select('id, name').order('name'),
          supabase.from('processes').select('id, name, project_id').order('name'),
          supabase.from('project_processes').select('process_id, project_id'),
        ]);

      return {
        profiles,
        projects: (projectsData ?? []) as SprintDetalhesProject[],
        processes: (processesData ?? []) as SprintDetalhesProcess[],
        projectProcesses: (projectProcessesData ?? []) as SprintDetalhesProjectProcess[],
      };
    },
  });

  const buscarDescricoesDaSprint = useCallback(async () => {
    if (!sprintId) return [];
    const { data, error } = await supabase
      .from('sprint_deliverables')
      .select('id, description')
      .eq('sprint_id', sprintId);
    if (error) throw error;
    return (data ?? []) as Array<{ id: string; description: string | null }>;
  }, [sprintId]);

  const descricoesQuery = useQuery({
    queryKey: sprintDetalhesKeys.descricoes(sprintId),
    enabled: Boolean(sprintId) && comDescricoes,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: buscarDescricoesDaSprint,
  });

  /** Puxa as descrições agora e devolve o mapa — usado pela exportação. */
  const garantirDescricoes = useCallback(async () => {
    const linhas = await queryClient.fetchQuery({
      queryKey: sprintDetalhesKeys.descricoes(sprintId),
      queryFn: buscarDescricoesDaSprint,
      staleTime: 60_000,
    });
    return new Map(linhas.map((linha) => [linha.id, linha.description]));
  }, [buscarDescricoesDaSprint, queryClient, sprintId]);

  // A descrição da tarefa aberta vem sozinha, em uma linha: o modal grava o
  // formulário inteiro, então salvar antes de ela chegar apagaria o texto.
  const descricaoDaTarefaQuery = useQuery({
    queryKey: sprintDetalhesKeys.descricaoDaTarefa(tarefaEmEdicao),
    enabled: Boolean(tarefaEmEdicao),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sprint_deliverables')
        .select('description')
        .eq('id', tarefaEmEdicao as string)
        .maybeSingle();
      if (error) throw error;
      return (data?.description ?? null) as string | null;
    },
  });

  const descricoesPorTarefa = useMemo(
    () => new Map((descricoesQuery.data ?? []).map((linha) => [linha.id, linha.description])),
    [descricoesQuery.data],
  );

  const deliverables = useMemo(() => {
    const base = dataQuery.data?.deliverables ?? [];
    if (descricoesPorTarefa.size === 0) return base;
    return base.map((deliverable) =>
      descricoesPorTarefa.has(deliverable.id)
        ? { ...deliverable, description: descricoesPorTarefa.get(deliverable.id) ?? null }
        : deliverable,
    );
  }, [dataQuery.data?.deliverables, descricoesPorTarefa]);

  const updateCachedData = (
    updater: (current: SprintDetalhesData) => SprintDetalhesData,
  ) => {
    queryClient.setQueryData<SprintDetalhesData | null>(queryKey, (current) =>
      current ? updater(current) : current,
    );
  };

  /**
   * A descrição mora em caches próprios (o da tarefa aberta e o da sprint
   * inteira), fora da listagem. Quem grava o texto precisa passar por aqui:
   * sem isto, o cache guarda a versão anterior por até 10 min e reabrir a
   * tarefa devolve o texto velho (vazio, quando a descrição acabou de ser
   * escrita), que o modal então regrava por cima do banco.
   */
  const sincronizarDescricaoNoCache = useCallback(
    (deliverableId: string, description: string | null) => {
      queryClient.setQueryData(
        sprintDetalhesKeys.descricaoDaTarefa(deliverableId),
        description,
      );
      queryClient.setQueryData<Array<{ id: string; description: string | null }>>(
        sprintDetalhesKeys.descricoes(sprintId),
        (current) => {
          if (!current) return current;
          return current.some((linha) => linha.id === deliverableId)
            ? current.map((linha) =>
                linha.id === deliverableId ? { ...linha, description } : linha,
              )
            : [...current, { id: deliverableId, description }];
        },
      );
    },
    [queryClient, sprintId],
  );

  useEffect(() => {
    if (!sprintId) return;

    const currentQueryKey = sprintDetalhesKeys.detail(sprintId);
    const channel = supabase
      .channel(`sprint-deliverables-${sprintId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sprint_deliverables',
          filter: `sprint_id=eq.${sprintId}`,
        },
        (payload) => {
          const oldRecord = payload.old as Record<string, unknown>;
          const newRecord = payload.new as Record<string, unknown>;
          if (
            payload.eventType !== 'DELETE' &&
            payload.eventType !== 'INSERT' &&
            payload.eventType !== 'UPDATE'
          ) {
            return;
          }
          const change: DeliverableRealtimeChange = {
            eventType: payload.eventType,
            oldRecord,
            newRecord,
          };

          if (fetchInProgressRef.current) {
            pendingRealtimeChangesRef.current.push(change);
          }

          // O payload traz a linha inteira: aproveita para acertar o cache da
          // descrição quando quem editou foi outra pessoa.
          if (
            payload.eventType !== 'DELETE' &&
            typeof newRecord.id === 'string' &&
            'description' in newRecord
          ) {
            sincronizarDescricaoNoCache(
              newRecord.id,
              (newRecord.description as string | null) ?? null,
            );
          }

          queryClient.setQueryData<SprintDetalhesData | null>(
            currentQueryKey,
            (current) => {
              if (!current) return current;
              return {
                ...current,
                deliverables: applyDeliverableRealtimeChanges(current.deliverables, [
                  change,
                ]),
              };
            },
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, sincronizarDescricaoNoCache, sprintId]);

  const updateDeliverableStatus = useMutation({
    mutationFn: async ({ deliverableId, newStatus }: DeliverableStatusInput) => {
      const updates = {
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
      };
      const { error } = await supabase
        .from('sprint_deliverables')
        .update(updates)
        .eq('id', deliverableId);

      if (error) throw error;
      return { deliverableId, updates };
    },
    onSuccess: ({ deliverableId, updates }) => {
      updateCachedData((current) => ({
        ...current,
        deliverables: current.deliverables.map((deliverable) =>
          deliverable.id === deliverableId ? { ...deliverable, ...updates } : deliverable,
        ),
      }));
    },
    onError: () => undefined,
  });

  const reorderDeliverables = useMutation({
    mutationFn: async ({ shifts }: ReorderDeliverablesInput) => {
      await Promise.all(
        shifts.map(({ deliverableId, taskCode }) =>
          supabase
            .from('sprint_deliverables')
            .update({ task_code: taskCode })
            .eq('id', deliverableId),
        ),
      );

      return shifts;
    },
    onSuccess: (shifts) => {
      const taskCodesById = new Map(
        shifts.map(({ deliverableId, taskCode }) => [deliverableId, taskCode]),
      );
      updateCachedData((current) => ({
        ...current,
        deliverables: current.deliverables.map((deliverable) => {
          const taskCode = taskCodesById.get(deliverable.id);
          return taskCode ? { ...deliverable, task_code: taskCode } : deliverable;
        }),
      }));
    },
    onError: () => undefined,
  });

  const updateDeliverable = useMutation({
    mutationFn: async ({ deliverableId, updates }: UpdateDeliverableInput) => {
      const { error } = await supabase
        .from('sprint_deliverables')
        .update(updates)
        .eq('id', deliverableId);

      if (error) throw error;
      return { deliverableId, updates };
    },
    onSuccess: ({ deliverableId, updates }) => {
      updateCachedData((current) => ({
        ...current,
        deliverables: current.deliverables.map((deliverable) =>
          deliverable.id === deliverableId ? { ...deliverable, ...updates } : deliverable,
        ),
      }));
      if ('description' in updates) {
        sincronizarDescricaoNoCache(deliverableId, updates.description ?? null);
      }
    },
    onError: () => undefined,
  });

  const updateRetrospectiveReport = useMutation({
    mutationFn: async ({
      deliverableId,
      deliverableTitle,
      entityType,
      report,
    }: UpdateRetrospectiveReportInput) => {
      await assertCanPerform('sprint_deliverables', 'update', deliverableId);

      // O texto anterior não trafega mais na listagem, e o diff de auditoria
      // precisa dele: lido aqui, uma linha, só na hora de gravar.
      const { data: anterior } = await supabase
        .from('sprint_deliverables')
        .select('retrospective_report')
        .eq('id', deliverableId)
        .maybeSingle();
      const previousReport =
        ((anterior ?? {}) as { retrospective_report?: string | null }).retrospective_report ?? null;

      const { error } = await (supabase as unknown as SprintDeliverablesRetrospectiveClient)
        .from('sprint_deliverables')
        .update({ retrospective_report: report })
        .eq('id', deliverableId);

      if (error) throw error;

      return {
        deliverableId,
        report,
        auditEntry: {
          area: 'dev' as const,
          entity_type: entityType,
          entity_id: deliverableId,
          entity_name: deliverableTitle,
          action: 'updated' as const,
          changed_fields: computeFieldDiff(
            { retrospective_report: previousReport },
            { retrospective_report: report },
            ['retrospective_report'],
          ),
          details: report
            ? 'Retrospectiva markdown anexada à tarefa.'
            : 'Retrospectiva markdown removida da tarefa.',
        },
      };
    },
    onSuccess: ({ deliverableId, report, auditEntry }) => {
      void logAction(auditEntry);
      updateCachedData((current) => ({
        ...current,
        deliverables: current.deliverables.map((deliverable) =>
          deliverable.id === deliverableId
            ? { ...deliverable, tem_retrospectiva: Boolean(report?.trim()) }
            : deliverable,
        ),
      }));
    },
    onError: () => undefined,
  });

  // Move de tarefa entre sprints.
  //
  // O perigo desta operação não é trocar o sprint_id, é deixar uma subtarefa na sprint nova
  // apontando para uma mãe que ficou na antiga: parent_id é ON DELETE CASCADE, então excluir a
  // sprint antiga (ou a mãe) apagaria em silêncio a tarefa que já está na sprint nova. Além disso a
  // aba Detalhes não desenha órfã. Por isso:
  //
  // 1. a raiz movida SEMPRE perde o vínculo de mãe, na mesma instrução que troca de sprint;
  // 2. os descendentes vão junto, em uma instrução única, e mantêm o vínculo entre si;
  // 3. a ordem é raiz primeiro. Como o Supabase não abre transação daqui, existe uma janela entre
  //    as duas gravações; na ordem inversa essa janela é exatamente o estado que apaga tarefa.
  //    Nesta ordem, uma falha no meio deixa os filhos onde já estavam.
  //
  // Nada aqui apaga linha. Em falha parcial, repetir o move converge para o estado correto.
  const moveDeliverableToSprint = useMutation({
    mutationFn: async ({ deliverableId, targetSprint }: MoveDeliverableToSprintInput) => {
      // Fonte da verdade é o banco, não o cache: subtarefa criada por outra pessoa segundos antes
      // não pode ficar atrás.
      const { data: current, error: currentError } = await supabase
        .from('sprint_deliverables')
        .select('id, sprint_id, parent_id, title, start_date, due_date')
        .eq('id', deliverableId)
        .maybeSingle();

      if (currentError) throw currentError;
      if (!current) throw new Error('Tarefa não encontrada.');
      if (current.sprint_id === targetSprint.id) {
        throw new Error('A tarefa já está nesta sprint.');
      }

      const originSprintId = current.sprint_id as string;

      const { data: originRows, error: originError } = await supabase
        .from('sprint_deliverables')
        .select('id, parent_id, start_date, due_date')
        .eq('sprint_id', originSprintId);

      if (originError) throw originError;

      const { descendantIds } = collectDeliverableSubtree(originRows ?? [], deliverableId);
      const movedIds = [deliverableId, ...descendantIds];
      const dates = clampDatesToSprint(current, targetSprint);

      await assertCanPerform('sprint_deliverables', 'update', deliverableId);

      // 1. Raiz: sprint, vínculo de mãe e datas na mesma instrução (atômica por ser uma só).
      const rootPayload = {
        sprint_id: targetSprint.id,
        parent_id: null,
        start_date: dates.start_date,
        due_date: dates.due_date,
      };
      const { error: rootError } = await supabase
        .from('sprint_deliverables')
        .update(rootPayload)
        .eq('id', deliverableId);

      if (rootError) throw rootError;

      // 2. Descendentes: uma instrução para todos, mantendo o parent_id entre eles.
      if (descendantIds.length > 0) {
        const { error: descendantsError } = await supabase
          .from('sprint_deliverables')
          .update({ sprint_id: targetSprint.id })
          .in('id', descendantIds);

        if (descendantsError) throw descendantsError;
      }

      // 3. Datas das subtarefas. Já estão na sprint certa, então isto é cosmético: uma falha aqui
      //    não deixa dano estrutural, só data fora da janela.
      for (const row of originRows ?? []) {
        if (!descendantIds.includes(row.id)) continue;
        const childDates = clampDatesToSprint(row, targetSprint);
        if (
          childDates.due_date === row.due_date &&
          childDates.start_date === row.start_date
        ) {
          continue;
        }
        await supabase.from('sprint_deliverables').update(childDates).eq('id', row.id);
      }

      // 4. Item de backlog que gerou a tarefa acompanha a sprint, senão ele fica apontando para a
      //    sprint antiga (decisão do usuário em 27/07). Uma falha aqui NÃO derruba o move: as
      //    tarefas já estão na sprint certa e lançar erro agora impediria o log de auditoria e
      //    deixaria a operação em erro permanente, já que o retry falharia no mesmo ponto. Em vez
      //    disso o aviso sobe para a UI.
      const { error: backlogError } = await supabase
        .from('sprint_backlog_items')
        .update({ sprint_id: targetSprint.id })
        .in('moved_to_deliverable_id', movedIds);

      // 5. Conferência: sem transação, é aqui que a falha parcial aparece.
      const { data: afterRows } = await supabase
        .from('sprint_deliverables')
        .select('id, sprint_id, parent_id')
        .in('id', movedIds);

      const leftBehind = (afterRows ?? []).filter((row) => row.sprint_id !== targetSprint.id);
      const crossLinked = (afterRows ?? []).filter(
        (row) => row.parent_id && !movedIds.includes(row.parent_id),
      );
      if (leftBehind.length > 0 || crossLinked.length > 0) {
        throw new Error(
          'A movimentação ficou incompleta. Nada foi apagado: repita o move para concluir.',
        );
      }

      // Filho que sobrou fora da sprint de destino apontando para alguém que acabou de mudar. Os
      // descendentes são coletados dentro da sprint de origem, então isto só acontece com vínculo
      // cruzado anterior a esta feature (a base tinha zero). É justamente o vínculo que faz o
      // CASCADE apagar tarefa, então aqui se avisa em vez de esconder.
      const { data: strayChildren } = await supabase
        .from('sprint_deliverables')
        .select('id')
        .in('parent_id', movedIds)
        .neq('sprint_id', targetSprint.id);

      return {
        deliverableId,
        movedIds,
        originSprintId,
        targetSprintId: targetSprint.id,
        backlogWarning: backlogError
          ? 'A tarefa foi movida, mas o item de backlog vinculado continuou na sprint anterior.'
          : null,
        crossSprintWarning:
          strayChildren && strayChildren.length > 0
            ? `${strayChildren.length} subtarefa(s) antigas continuam ligadas a esta tarefa em outra sprint. Avise o time: esse vínculo é o que faz a exclusão da sprint antiga apagar tarefa.`
            : null,
        auditEntry: {
          area: 'dev' as const,
          entity_type: (current.parent_id ? 'subtask' : 'task') as 'subtask' | 'task',
          entity_id: deliverableId,
          entity_name: current.title,
          action: 'updated' as const,
          changed_fields: computeFieldDiff(current, { ...current, ...rootPayload }, [
            'sprint_id',
            'parent_id',
            'start_date',
            'due_date',
          ]),
          details:
            `Movida para a sprint "${targetSprint.name}"` +
            (descendantIds.length > 0
              ? `, com ${descendantIds.length} subtarefa(s) junto.`
              : '.'),
        },
      };
    },
    onSuccess: ({ movedIds, originSprintId, targetSprintId, auditEntry }) => {
      // O parent_id anterior fica registrado no diff: é por ele que se refaz o vínculo à mão, já
      // que o move não guarda a mãe antiga em nenhuma coluna.
      void logAction(auditEntry);

      // Realtime é filtrado por sprint_id, então a origem não recebe o evento de saída e o destino
      // recebe um UPDATE de linha que não está no cache dele. As duas pontas precisam de invalidação
      // explícita.
      updateCachedData((current) => ({
        ...current,
        deliverables: current.deliverables.filter((item) => !movedIds.includes(item.id)),
      }));
      void queryClient.invalidateQueries({ queryKey: sprintDetalhesKeys.detail(originSprintId) });
      void queryClient.invalidateQueries({ queryKey: sprintDetalhesKeys.detail(targetSprintId) });
      // Prefixos crus: as fábricas de chave destes hooks são privadas nos arquivos deles. A soma de
      // horas por pessoa e o kanban leem os mesmos deliverables e ficariam com número velho.
      void queryClient.invalidateQueries({ queryKey: ['domain-sprints'] });
      void queryClient.invalidateQueries({ queryKey: ['domain-horas-acumuladas'] });
      void queryClient.invalidateQueries({ queryKey: ['domain-equipe-kanban'] });
      void queryClient.invalidateQueries({ queryKey: ['daily-sprint-tasks'] });
    },
  });

  const deleteDeliverable = useMutation({
    mutationFn: async (deliverableId: string) => {
      // Se este entregável veio de um item do backlog, o item guarda uma referência
      // (moved_to_deliverable_id) que TRAVA o DELETE (FK sem ON DELETE). Devolvemos o
      // item ao backlog ANTES da checagem/exclusão — senão o banco recusa e o precheck
      // traduz o erro de FK como "operação não permitida para o seu perfil".
      await supabase
        .from('sprint_backlog_items')
        .update({ moved_to_deliverable_id: null, status: 'pending', sprint_id: null })
        .eq('moved_to_deliverable_id', deliverableId);

      await assertCanPerform('sprint_deliverables', 'delete', deliverableId);

      const { data: attachmentsToDelete } = await supabase
        .from('deliverable_attachments')
        .select('id, file_path')
        .eq('deliverable_id', deliverableId);

      if (attachmentsToDelete && attachmentsToDelete.length > 0) {
        await assertCanPerform(
          'deliverable_attachments',
          'delete',
          attachmentsToDelete[0].id,
        );

        await supabase.storage
          .from('deliverable-attachments')
          .remove(attachmentsToDelete.map((attachment) => attachment.file_path));

        await supabase
          .from('deliverable_attachments')
          .delete()
          .eq('deliverable_id', deliverableId);
      }

      const { error } = await supabase
        .from('sprint_deliverables')
        .delete()
        .eq('id', deliverableId);

      if (error) throw error;
      return deliverableId;
    },
    onSuccess: (deliverableId) => {
      updateCachedData((current) => ({
        ...current,
        deliverables: current.deliverables.filter(
          (deliverable) => deliverable.id !== deliverableId,
        ),
      }));
    },
    onError: () => undefined,
  });

  const updateMetric = useMutation({
    mutationFn: async ({ metricId, newValue }: UpdateMetricInput) => {
      await assertCanPerform('sprint_metrics', 'update', metricId);
      const { error } = await supabase
        .from('sprint_metrics')
        .update({ current_value: newValue })
        .eq('id', metricId);

      if (error) throw error;
      return { metricId, newValue };
    },
    onSuccess: ({ metricId, newValue }) => {
      updateCachedData((current) => ({
        ...current,
        metrics: current.metrics.map((metric) =>
          metric.id === metricId ? { ...metric, current_value: newValue } : metric,
        ),
      }));
    },
    onError: () => undefined,
  });

  const updateSprintGoal = useMutation({
    mutationFn: async (goal: string) => {
      if (!sprintId) throw new Error('Sprint inválida');
      await assertCanPerform('sprints', 'update', sprintId);
      const { error } = await supabase
        .from('sprints')
        .update({ goal: goal || null })
        .eq('id', sprintId);
      if (error) throw error;
      return goal;
    },
    onSuccess: (goal) => {
      updateCachedData((current) => ({
        ...current,
        sprint: { ...current.sprint, goal: goal || null },
      }));
    },
    onError: () => undefined,
  });

  const createDeliverable = useMutation({
    mutationFn: async (payload: CreateDeliverableInput) => {
      const { data, error } = await supabase
        .from('sprint_deliverables')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data as SprintDetalhesDeliverable;
    },
    onSuccess: (deliverable) => {
      updateCachedData((current) => ({
        ...current,
        deliverables: [...current.deliverables, deliverable],
      }));
      sincronizarDescricaoNoCache(deliverable.id, deliverable.description ?? null);
    },
    onError: () => undefined,
  });

  const importDeliverables = useMutation({
    mutationFn: async ({
      sprint,
      taskGroups,
      responsibleMapping,
      profiles,
    }: ImportDeliverablesInput) => {
      for (const group of taskGroups) {
        const responsibleName = group.responsible;
        let responsibleId: string | null = null;

        if (responsibleName) {
          if (responsibleMapping[responsibleName]) {
            responsibleId = responsibleMapping[responsibleName];
          } else {
            const profile = findProfileByName(responsibleName, profiles);
            responsibleId = profile?.id || null;
          }
        }

        const { data: parentData, error: parentError } = await supabase
          .from('sprint_deliverables')
          .insert({
            sprint_id: sprint.id,
            title: group.title,
            description: `${group.subtasks.length} subtarefas • ${group.totalHours}h total`,
            assigned_to: responsibleId,
            start_date: group.minDate || sprint.start_date,
            due_date: group.maxDate || sprint.end_date,
            estimated_hours: group.totalHours,
            status: 'pending',
            parent_id: null,
            task_code: null,
          })
          .select()
          .single();

        if (parentError) throw parentError;

        const subtasks = group.subtasks.map((subtask) => {
          let subtaskResponsibleId: string | null = null;
          if (subtask.responsible) {
            if (responsibleMapping[subtask.responsible]) {
              subtaskResponsibleId = responsibleMapping[subtask.responsible];
            } else {
              const profile = findProfileByName(subtask.responsible, profiles);
              subtaskResponsibleId = profile?.id || null;
            }
          }

          return {
            sprint_id: sprint.id,
            title: subtask.subtaskTitle || subtask.title,
            description: subtask.description || null,
            assigned_to: subtaskResponsibleId,
            start_date: subtask.dueDate || sprint.start_date,
            due_date: subtask.dueDate || sprint.end_date,
            estimated_hours: subtask.estimatedHours || null,
            status: 'pending',
            parent_id: parentData.id,
            task_code: subtask.taskCode || null,
            project_id: parentData.project_id || null,
            process_id: parentData.process_id || null,
          };
        });

        if (subtasks.length > 0) {
          const { error: subtasksError } = await supabase
            .from('sprint_deliverables')
            .insert(subtasks);

          if (subtasksError) throw subtasksError;
        }
      }
    },
    onError: () => undefined,
  });

  return {
    sprint: dataQuery.data?.sprint ?? null,
    deliverables,
    events: dataQuery.data?.events ?? [],
    metrics: dataQuery.data?.metrics ?? [],
    profiles: catalogosQuery.data?.profiles ?? [],
    projects: catalogosQuery.data?.projects ?? [],
    processes: catalogosQuery.data?.processes ?? [],
    projectProcesses: catalogosQuery.data?.projectProcesses ?? [],
    /** Descrição da tarefa aberta: enquanto não chega, o modal não deixa salvar. */
    descricaoDaTarefa: descricaoDaTarefaQuery.data ?? null,
    descricaoDaTarefaCarregando: Boolean(tarefaEmEdicao) && descricaoDaTarefaQuery.isPending,
    garantirDescricoes,
    isLoading: !sprintId || dataQuery.isFetching,
    isNotFound: dataQuery.isSuccess && dataQuery.data === null,
    error: dataQuery.error,
    dataUpdatedAt: dataQuery.dataUpdatedAt,
    refetch: dataQuery.refetch,
    updateDeliverableStatus,
    reorderDeliverables,
    updateDeliverable,
    updateRetrospectiveReport,
    moveDeliverableToSprint,
    deleteDeliverable,
    updateMetric,
    updateSprintGoal,
    createDeliverable,
    importDeliverables,
  };
}
