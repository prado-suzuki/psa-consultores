import { useEffect, useRef } from 'react';
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
  description: string | null;
  assigned_to: string | null;
  start_date: string | null;
  due_date: string;
  status: string;
  estimated_hours: number | null;
  // opcional: coluna nova; enquanto o types.ts gerado não a reflete, o dado
  // ainda vem do select('*') em runtime.
  actual_hours?: number | null;
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
  profiles: SprintDetalhesProfile[];
  projects: SprintDetalhesProject[];
  processes: SprintDetalhesProcess[];
  projectProcesses: SprintDetalhesProjectProcess[];
}

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

const sprintDetalhesKeys = {
  detail: (sprintId: string | undefined) =>
    ['domain-equipe-sprint-detalhes', sprintId] as const,
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

    if (change.eventType === 'INSERT' && newId) {
      if (current.some((deliverable) => deliverable.id === newId)) return current;
      return [
        ...current,
        change.newRecord as unknown as SprintDetalhesDeliverable,
      ];
    }

    if (change.eventType === 'UPDATE' && newId) {
      return current.map((deliverable) =>
        deliverable.id === newId
          ? ({ ...deliverable, ...change.newRecord } as SprintDetalhesDeliverable)
          : deliverable,
      );
    }

    return current;
  }, deliverables);

export function useDomainEquipeSprintDetalhes(sprintId: string | undefined) {
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
    gcTime: 0,
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

        // Preserve the original sequential structure/profile lookup workflow.
        const { data: digitalAreas } = await supabase
          .from('estrutura_areas')
          .select('id')
          .eq('cluster_id', DIGITAL_CLUSTER_ID);
        const areaIds = (digitalAreas ?? []).map((area) => area.id);
        let digitalUserIds: string[] = [];

        if (areaIds.length > 0) {
          const { data: digitalEquipes } = await supabase
            .from('estrutura_equipes')
            .select('id, gestor_id')
            .in('area_id', areaIds);
          const equipeIds = (digitalEquipes ?? []).map((equipe) => equipe.id);
          const gestorIds = (digitalEquipes ?? [])
            .map((equipe) => equipe.gestor_id)
            .filter((gestorId): gestorId is string => Boolean(gestorId));
          let digitalMembros: Array<{ user_id: string }> = [];

          if (equipeIds.length > 0) {
            const { data } = await supabase
              .from('estrutura_equipe_membros')
              .select('user_id')
              .in('equipe_id', equipeIds);
            digitalMembros = data ?? [];
          }

          digitalUserIds = Array.from(
            new Set([
              ...gestorIds,
              ...digitalMembros.map((membro) => membro.user_id).filter(Boolean),
            ]),
          );
        }

        let profiles: SprintDetalhesProfile[] = [];
        if (digitalUserIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles_safe')
            .select('id, first_name, last_name')
            .in('id', digitalUserIds);
          profiles = (profilesData ?? []) as SprintDetalhesProfile[];
        }

        const { data: deliverablesData } = await supabase
          .from('sprint_deliverables')
          .select('*')
          .eq('sprint_id', sprintId)
          .order('due_date', { ascending: true });

        const { data: eventsData } = await supabase
          .from('sprint_events')
          .select('*')
          .eq('sprint_id', sprintId)
          .order('event_date', { ascending: true })
          .order('start_time', { ascending: true });

        const { data: metricsData } = await supabase
          .from('sprint_metrics')
          .select('*')
          .eq('sprint_id', sprintId);

        const { data: projectsData } = await supabase
          .from('projects')
          .select('id, name')
          .order('name');

        const { data: processesData } = await supabase
          .from('processes')
          .select('id, name, project_id')
          .order('name');

        const { data: projectProcessesData } = await supabase
          .from('project_processes')
          .select('process_id, project_id');

        return {
          sprint: sprintData as SprintDetalhesSprint,
          profiles,
          deliverables: applyDeliverableRealtimeChanges(
            (deliverablesData ?? []) as SprintDetalhesDeliverable[],
            pendingRealtimeChangesRef.current,
          ),
          events: (eventsData ?? []) as SprintDetalhesEvent[],
          metrics: (metricsData ?? []) as SprintDetalhesMetric[],
          projects: (projectsData ?? []) as SprintDetalhesProject[],
          processes: (processesData ?? []) as SprintDetalhesProcess[],
          projectProcesses: (projectProcessesData ?? []) as SprintDetalhesProjectProcess[],
        };
      } finally {
        fetchInProgressRef.current = false;
        pendingRealtimeChangesRef.current = [];
      }
    },
  });

  const updateCachedData = (
    updater: (current: SprintDetalhesData) => SprintDetalhesData,
  ) => {
    queryClient.setQueryData<SprintDetalhesData | null>(queryKey, (current) =>
      current ? updater(current) : current,
    );
  };

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
  }, [queryClient, sprintId]);

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
    deliverables: dataQuery.data?.deliverables ?? [],
    events: dataQuery.data?.events ?? [],
    metrics: dataQuery.data?.metrics ?? [],
    profiles: dataQuery.data?.profiles ?? [],
    projects: dataQuery.data?.projects ?? [],
    processes: dataQuery.data?.processes ?? [],
    projectProcesses: dataQuery.data?.projectProcesses ?? [],
    isLoading: !sprintId || dataQuery.isFetching,
    isNotFound: dataQuery.isSuccess && dataQuery.data === null,
    error: dataQuery.error,
    dataUpdatedAt: dataQuery.dataUpdatedAt,
    refetch: dataQuery.refetch,
    updateDeliverableStatus,
    reorderDeliverables,
    updateDeliverable,
    moveDeliverableToSprint,
    deleteDeliverable,
    updateMetric,
    updateSprintGoal,
    createDeliverable,
    importDeliverables,
  };
}
