 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 import { toast } from 'sonner';
 import { useAuditLog } from '@/hooks/useAuditLog';
 import { assertCanPerform } from '@/hooks/useRlsPrecheck';
import { AreaKey } from '@/config/areaCategories';
import { isDelegatedOrgTaskReviewer } from '@/lib/orgTaskPermissions';
import { buildMoveTaskPlan, moveChangedFields, pruneNestedSelection } from '@/lib/orgTaskMove';
import { taskSaveErrorMessage } from '@/lib/rlsMessages';
 
export type OrgTaskStatus = 'backlog' | 'waiting_client' | 'todo' | 'in_progress' | 'review' | 'em_ajuste' | 'done';
export type OrgTaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type OrgTaskCategory = 'task' | 'fixed_event';
export type OrgRecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly';
 
export interface OrgTask {
   id: string;
   title: string;
   description: string | null;
   status: OrgTaskStatus;
   priority: OrgTaskPriority;
   assigned_to: string | null;
   assigned_to_name: string | null;
   reviewer_id: string | null;
   created_by: string | null;
   due_date: string | null;
   due_time: string | null;
   is_recurring: boolean;
   recurrence_type: OrgRecurrenceType | null;
   category: OrgTaskCategory;
   tags: string[];
   
   estimated_hours: number | null;
   actual_hours: number | null;
   parent_task_id: string | null;
  start_date: string | null;
  project_id: string | null;
    client_id: string | null;
    contribuinte_id: string | null;
    created_at: string;
    updated_at: string;
   // Joined data
   project?: { id: string; name: string } | null;
    client?: { id: string; nome: string } | null;
   contribuinte?: { id: string; nome_razao_social: string } | null;
 }
 
 export interface OrgTaskComment {
   id: string;
   task_id: string;
   user_id: string | null;
   user_name: string | null;
   comment: string;
   is_system: boolean;
   created_at: string;
 }
 
export interface TaskFilters {
  search?: string;
  assignedTo?: string | 'mine' | 'all';
  status?: OrgTaskStatus[];
  priority?: OrgTaskPriority[];
  projectId?: string;
  clientId?: string;
  contribuinteId?: string;
  startDate?: string;
  endDate?: string;
}
 
 export interface CreateOrgTaskInput {
   title: string;
   description?: string;
   status?: OrgTaskStatus;
   priority?: OrgTaskPriority;
   assigned_to?: string;
   assigned_to_name?: string;
   reviewer_id?: string | null;
    due_date?: string;
    due_time?: string;
    start_date?: string;
   is_recurring?: boolean;
   recurrence_type?: OrgRecurrenceType;
   category?: OrgTaskCategory;
   tags?: string[];
   estimated_hours?: number;
   actual_hours?: number | null;
   parent_task_id?: string;
  project_id: string;
   client_id?: string;
    contribuinte_id?: string;
 }
 
 export const useOrgTasks = (filters?: TaskFilters) => {
   const { user } = useAuth();
 
   return useQuery({
     queryKey: ['org-tasks', filters],
     queryFn: async () => {
       let query = supabase
         .from('org_tasks')
          .select(`
             *,
             project:org_projects(id, name),
             client:cliente(id, nome),
             contribuinte:contribuinte(id, nome_razao_social)
           `)
         .order('created_at', { ascending: false });
 
       if (filters?.search) {
         query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
       }
 
        // assignedTo filter applied client-side to preserve parent-subtask hierarchy

        if (filters?.status && filters.status.length > 0) {
          query = query.in('status', filters.status);
        }

        if (filters?.priority && filters.priority.length > 0) {
          query = query.in('priority', filters.priority);
        }

        if (filters?.projectId) {
          query = query.eq('project_id', filters.projectId);
        }

        if (filters?.clientId) {
          query = query.eq('client_id', filters.clientId);
        }

        if (filters?.contribuinteId) {
          query = query.eq('contribuinte_id', filters.contribuinteId);
        }

        if (filters?.startDate) {
          query = query.gte('due_date', filters.startDate);
        }

        if (filters?.endDate) {
          query = query.lte('due_date', filters.endDate);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Guard against self-referencing parent_task_id
        let allTasks = (data || []).map(t => ({
          ...t,
          reviewer_id: t.reviewer_id ?? null,
          parent_task_id: t.parent_task_id === t.id ? null : t.parent_task_id,
        })) as OrgTask[];

        // Client-side assignedTo filter: shows parent tasks that have matching subtasks
        if (filters?.assignedTo && filters.assignedTo !== 'all') {
          const targetId = filters.assignedTo === 'mine' ? user?.id : filters.assignedTo;
          if (targetId) {
            const belongsToTarget = (task: OrgTask) =>
              task.assigned_to === targetId ||
              (task.reviewer_id === targetId && task.status === 'review');
            const matchingSubtaskParentIds = new Set(
              allTasks
                .filter(t => t.parent_task_id && belongsToTarget(t))
                .map(t => t.parent_task_id)
            );
            allTasks = allTasks.filter(t =>
              belongsToTarget(t) ||
              matchingSubtaskParentIds.has(t.id) ||
              (t.parent_task_id && matchingSubtaskParentIds.has(t.parent_task_id))
            );
          }
        }

        return allTasks;
     },
   });
 };
 
interface OrgTaskMutationOptions {
  showToasts?: boolean;
}

export const useCreateOrgTask = (
  area: AreaKey = 'tax',
  { showToasts = true }: OrgTaskMutationOptions = {},
) => {
   const queryClient = useQueryClient();
   const { user } = useAuth();
   const { logAction } = useAuditLog();

   return useMutation({
     mutationFn: async (input: CreateOrgTaskInput) => {
       const { data, error } = await supabase
         .from('org_tasks')
         .insert({
           ...input,
           created_by: user?.id,
         })
         .select()
         .single();

       if (error) throw error;

       await logAction({
         // Tarefas só existem nas áreas tax/osg (subconjunto de AuditArea).
         area: area as 'tax' | 'osg', entity_type: input.parent_task_id ? 'subtask' : 'task',
         entity_id: data.id, entity_name: input.title, action: 'created',
       });

       return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['org-tasks'] });
        if (showToasts) toast.success('Tarefa criada com sucesso');
      },
      onError: (error) => {
        if (showToasts) toast.error('Erro ao criar tarefa: ' + error.message);
      },
   });
 };
 
export const useUpdateOrgTask = (
  area: AreaKey = 'tax',
  { showToasts = true }: OrgTaskMutationOptions = {},
) => {
   const queryClient = useQueryClient();
   const { user } = useAuth();
   const { logAction } = useAuditLog();

   return useMutation({
     mutationFn: async ({ id, reviewTransitionValidated = false, ...updates }:
       Partial<OrgTask> & { id: string; reviewTransitionValidated?: boolean }) => {
        // Fetch current state for diff
        const { data: current, error: currentError } = await supabase
          .from('org_tasks')
          .select('*')
          .eq('id', id)
          .single();
        if (currentError) throw currentError;

        // Envia só campos que efetivamente mudaram, para não disparar
        // triggers de RLS (ex.: org_tasks_team_member_status_only) por
        // colunas inalteradas presentes no payload do formulário.
        // Normaliza '' e undefined para null: o TaskModal envia campos
        // opcionais vazios como '' onde o banco guarda NULL — sem isso
        // eles entrariam no diff e o trigger bloquearia team_member.
        const normEmpty = (v: unknown) => (v === '' || v === undefined ? null : v);
        const changedOnly: Record<string, unknown> = {};
        if (current) {
          for (const key of Object.keys(updates)) {
            if (key === 'id') continue;
            const oldVal = normEmpty((current as any)[key]);
            const newVal = normEmpty((updates as any)[key]);
            if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
              changedOnly[key] = newVal;
            }
          }
        } else {
          Object.assign(changedOnly, updates);
        }

         if (Object.keys(changedOnly).length === 0) {
           return current;
         }

         const currentUserIsReviewer = current && isDelegatedOrgTaskReviewer(current, user?.id);
         if (currentUserIsReviewer) {
           if (changedOnly.status === 'done') {
             throw new Error('O revisor não pode concluir a tarefa. Devolva-a para ajustes.');
           }
           const changedKeys = Object.keys(changedOnly);
           const isValidReturn = reviewTransitionValidated &&
             changedOnly.status === 'em_ajuste' &&
             changedKeys.every(key => key === 'status');
           if (!isValidReturn) {
             throw new Error('Abra a tarefa e informe o ajuste necessário para devolvê-la.');
           }
         }

         await assertCanPerform('org_tasks', 'update', id);
         const reviewerReturn = currentUserIsReviewer && changedOnly.status === 'em_ajuste';
         const updateQuery = supabase.from('org_tasks').update(changedOnly).eq('id', id);
         const { data, error } = reviewerReturn
           ? await updateQuery
           : await updateQuery.select().maybeSingle();

          if (error) throw error;

          // Ao sair de review, o revisor perde SELECT e não pode receber RETURNING.
          if (!reviewerReturn && !data) {
            throw new Error('Sem permissão para atualizar esta tarefa. Verifique se você é membro do projeto.');
          }

          const updatedTask = reviewerReturn ? { ...current, ...changedOnly } : data;

          // Build changed_fields (convert undefined→null to avoid missing "new" in JSON)
         const changedFields: Record<string, { old: unknown; new: unknown }> = {};
         if (current) {
           for (const key of Object.keys(updates)) {
             if (key === 'id') continue;
              const oldVal = normEmpty((current as any)[key]);
              const newVal = normEmpty((updates as any)[key]);
             if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
               changedFields[key] = { old: oldVal, new: newVal };
             }
           }
         }

          const entityName = updatedTask?.title || current?.title || 'Tarefa';
          const isSubtask = !!(updatedTask?.parent_task_id || current?.parent_task_id);

         // Only log if something actually changed
         if (Object.keys(changedFields).length > 0) {
           await logAction({
             area: area as 'tax' | 'osg', entity_type: isSubtask ? 'subtask' : 'task',
             entity_id: id, entity_name: entityName, action: 'updated',
             changed_fields: changedFields,
           });
         }

          return updatedTask || current;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['org-tasks'] });
        if (showToasts) toast.success('Tarefa atualizada');
      },
      onError: (error) => {
        if (showToasts)
          toast.error(taskSaveErrorMessage(error, { prefix: 'Erro ao atualizar tarefa: ' }));
      },
   });
 };
 
/**
 * Descendentes (subtarefas, netas, …) buscados no banco — e não na lista já
 * carregada na tela, que pode estar filtrada e deixar subtarefas para trás no
 * projeto de origem. Profundidade limitada por segurança contra ciclos.
 */
const fetchOrgTaskDescendants = async (rootId: string) => {
  const descendants: { id: string; title: string; project_id: string | null }[] = [];
  const visited = new Set<string>([rootId]);
  let frontier = [rootId];

  for (let depth = 0; depth < 10 && frontier.length > 0; depth++) {
    const { data, error } = await supabase
      .from('org_tasks')
      .select('id, title, project_id')
      .in('parent_task_id', frontier);
    if (error) throw error;

    const next = (data || []).filter(row => !visited.has(row.id));
    next.forEach(row => visited.add(row.id));
    descendants.push(...next);
    frontier = next.map(row => row.id);
  }

  return descendants;
};

type AuditLogger = ReturnType<typeof useAuditLog>['logAction'];

/**
 * Sobe a cadeia de mães no banco até resolver todos os ancestrais dos ids dados.
 * Necessário para `pruneNestedSelection`: numa seleção parcial (avó + neta), a
 * mãe do meio pode não estar entre os ids marcados e quebraria a cadeia.
 */
const fetchOrgTaskLineage = async (ids: string[]) => {
  const rows = new Map<string, { id: string; title: string; project_id: string | null; parent_task_id: string | null }>();
  let frontier = [...new Set(ids)];

  for (let depth = 0; depth < 10 && frontier.length > 0; depth++) {
    const { data, error } = await supabase
      .from('org_tasks')
      .select('id, title, project_id, parent_task_id')
      .in('id', frontier);
    if (error) throw error;

    (data || []).forEach(row => rows.set(row.id, row));
    frontier = (data || [])
      .map(row => row.parent_task_id)
      .filter((parentId): parentId is string => !!parentId && !rows.has(parentId));
  }

  return [...rows.values()];
};

/**
 * Move uma tarefa (com suas subtarefas) para outro projeto. Ver as regras em
 * `@/lib/orgTaskMove`. Sem transação no cliente, a permissão é pré-checada em
 * toda a árvore antes de qualquer escrita para não deixar mãe e filhas em
 * projetos diferentes.
 *
 * Núcleo compartilhado pelo movimento avulso e pelo movimento em lote — o lote
 * repete esta rotina tarefa a tarefa para preservar auditoria e pré-check.
 */
const moveOrgTaskToProject = async ({
  taskId,
  targetProjectId,
  area,
  logAction,
}: {
  taskId: string;
  targetProjectId: string;
  area: AreaKey;
  logAction: AuditLogger;
}) => {
  const { data: current, error: currentError } = await supabase
    .from('org_tasks')
    .select('id, title, project_id, client_id, contribuinte_id, parent_task_id')
    .eq('id', taskId)
    .single();
  if (currentError) throw currentError;
  if (current.project_id === targetProjectId) {
    throw new Error('A tarefa já está neste projeto.');
  }

  const { data: target, error: targetError } = await supabase
    .from('org_projects')
    .select('id, name, external_client_id, contribuinte_id')
    .eq('id', targetProjectId)
    .single();
  if (targetError) throw targetError;

  const { data: origin } = current.project_id
    ? await supabase.from('org_projects').select('name').eq('id', current.project_id).maybeSingle()
    : { data: null };
  const originName = origin?.name || 'Sem projeto';

  const descendants = await fetchOrgTaskDescendants(taskId);
  const descendantIds = descendants.map(row => row.id);
  const plan = buildMoveTaskPlan({
    task: current,
    target: { ...target, contribuinte_id: target.contribuinte_id ?? null },
    descendantIds,
  });

  for (const id of [taskId, ...descendantIds]) {
    await assertCanPerform('org_tasks', 'update', id);
  }

  const { data: movedRoot, error: rootError } = await supabase
    .from('org_tasks')
    .update(plan.rootChanges)
    .eq('id', taskId)
    .select('id')
    .maybeSingle();
  if (rootError) throw rootError;
  if (!movedRoot) {
    throw new Error('Sem permissão para mover esta tarefa. Verifique se você é membro do projeto de destino.');
  }

  if (descendantIds.length > 0) {
    const { error: descendantsError } = await supabase
      .from('org_tasks')
      .update(plan.descendantChanges)
      .in('id', descendantIds);
    if (descendantsError) {
      throw new Error(
        `A tarefa foi movida, mas as subtarefas continuaram em "${originName}": ${descendantsError.message}`,
      );
    }
  }

  const subtaskSuffix = descendantIds.length > 0
    ? ` com ${descendantIds.length} subtarefa(s)`
    : '';
  await logAction({
    // Tarefas só existem nas áreas tax/osg (subconjunto de AuditArea).
    area: area as 'tax' | 'osg',
    entity_type: current.parent_task_id ? 'subtask' : 'task',
    entity_id: taskId,
    entity_name: current.title || 'Tarefa',
    action: 'updated',
    changed_fields: moveChangedFields(current, plan.rootChanges),
    details: `Movida do projeto "${originName}" para "${target.name}"${subtaskSuffix}`,
  });

  for (const descendant of descendants) {
    await logAction({
      area: area as 'tax' | 'osg',
      entity_type: 'subtask',
      entity_id: descendant.id,
      entity_name: descendant.title || 'Subtarefa',
      action: 'updated',
      changed_fields: moveChangedFields(descendant, plan.descendantChanges),
      details: `Movida junto com a tarefa "${current.title}" para o projeto "${target.name}"`,
    });
  }

  return { targetName: target.name, movedSubtasks: descendantIds.length };
};

export const useMoveOrgTaskToProject = (area: AreaKey = 'tax') => {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: ({ taskId, targetProjectId }: { taskId: string; targetProjectId: string }) =>
      moveOrgTaskToProject({ taskId, targetProjectId, area, logAction }),
    onSuccess: ({ targetName, movedSubtasks }) => {
      queryClient.invalidateQueries({ queryKey: ['org-tasks'] });
      toast.success(`Tarefa movida para "${targetName}"`, {
        description: movedSubtasks > 0
          ? `${movedSubtasks} subtarefa(s) foram movidas junto.`
          : undefined,
      });
    },
    onError: (error) => {
      toast.error('Erro ao mover tarefa: ' + error.message);
    },
  });
};

/**
 * Move VÁRIAS tarefas selecionadas para o mesmo projeto de destino.
 *
 * Sem transação no cliente, cada tarefa é movida com a rotina avulsa (com
 * pré-check e auditoria próprios) e o resultado é agregado: o que falhou não
 * derruba o que já foi movido, e o toast diz exatamente o que ficou de fora.
 * As tarefas aninhadas na seleção são descartadas antes — elas já viajam junto
 * com a mãe, e movê-las em separado as desvincularia dela.
 */
export const useMoveOrgTasksToProject = (area: AreaKey = 'tax') => {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ taskIds, targetProjectId }: { taskIds: string[]; targetProjectId: string }) => {
      const { data: target, error: targetError } = await supabase
        .from('org_projects')
        .select('id, name')
        .eq('id', targetProjectId)
        .single();
      if (targetError) throw targetError;

      const lineage = await fetchOrgTaskLineage(taskIds);
      const lineageById = new Map(lineage.map(row => [row.id, row]));
      const roots = pruneNestedSelection(taskIds, lineage)
        .map(id => lineageById.get(id))
        .filter((row): row is NonNullable<typeof row> => !!row);

      const skipped = roots.filter(row => row.project_id === targetProjectId);
      const toMove = roots.filter(row => row.project_id !== targetProjectId);

      let movedSubtasks = 0;
      const moved: string[] = [];
      const failed: { title: string; message: string }[] = [];

      for (const row of toMove) {
        try {
          const result = await moveOrgTaskToProject({
            taskId: row.id,
            targetProjectId,
            area,
            logAction,
          });
          moved.push(row.id);
          movedSubtasks += result.movedSubtasks;
        } catch (error) {
          failed.push({
            title: row.title || 'Tarefa',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return {
        targetName: target.name,
        movedCount: moved.length,
        movedSubtasks,
        skippedCount: skipped.length,
        failed,
      };
    },
    onSuccess: ({ targetName, movedCount, movedSubtasks, skippedCount, failed }) => {
      queryClient.invalidateQueries({ queryKey: ['org-tasks'] });

      if (failed.length > 0) {
        toast.error(`${failed.length} tarefa(s) não foram movidas`, {
          description: failed.map(item => `${item.title}: ${item.message}`).join(' · '),
        });
      }

      if (movedCount === 0) {
        if (failed.length === 0) {
          toast.info('Nada a mover', {
            description: `As tarefas selecionadas já estão em "${targetName}".`,
          });
        }
        return;
      }

      const details = [
        movedSubtasks > 0 ? `${movedSubtasks} subtarefa(s) foram junto.` : null,
        skippedCount > 0 ? `${skippedCount} já estava(m) neste projeto.` : null,
      ].filter(Boolean).join(' ');
      toast.success(`${movedCount} tarefa(s) movida(s) para "${targetName}"`, {
        description: details || undefined,
      });
    },
    onError: (error) => {
      toast.error('Erro ao mover tarefas: ' + error.message);
    },
  });
};

 export const useDeleteOrgTask = (area: AreaKey = 'tax') => {
   const queryClient = useQueryClient();
   const { logAction } = useAuditLog();

   return useMutation({
     mutationFn: async (id: string) => {
       // Get task info for audit log
       const { data: task } = await supabase.from('org_tasks').select('title, parent_task_id').eq('id', id).single();

       await assertCanPerform('org_tasks', 'delete', id);
       // `.select()` permite detectar o caso em que a RLS bloqueia silenciosamente
       // (sem erro, mas 0 linhas afetadas) — ex.: usuário não é líder nem criador.
       const { data: deleted, error } = await supabase
         .from('org_tasks')
         .delete()
         .eq('id', id)
         .select('id');

       if (error) throw error;

       if (!deleted || deleted.length === 0) {
         throw new Error(
           'Você não tem permissão para excluir esta tarefa. Apenas o criador da tarefa ou um líder pode excluí-la — contate um líder da equipe.'
         );
       }

       await logAction({
         area: area as 'tax' | 'osg', entity_type: task?.parent_task_id ? 'subtask' : 'task',
         entity_id: id, entity_name: task?.title || 'Tarefa excluída', action: 'deleted',
       });
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['org-tasks'] });
       toast.success('Tarefa excluída');
     },
     onError: (error) => {
       toast.error('Erro ao excluir tarefa: ' + error.message);
     },
   });
 };
 
 export const useReassignOrgTask = (area: AreaKey = 'tax') => {
   const queryClient = useQueryClient();
   const { user } = useAuth();
 
   return useMutation({
     mutationFn: async ({ taskId, newAssigneeId, newAssigneeName, comment, currentUserName }: {
       taskId: string;
       newAssigneeId: string;
       newAssigneeName: string;
       comment: string;
       currentUserName: string;
     }) => {
        // Fetch current task to get old assignee and title
        const { data: currentTask } = await supabase
          .from('org_tasks')
          .select('title, assigned_to, assigned_to_name, parent_task_id')
          .eq('id', taskId)
          .single();

        await assertCanPerform('org_tasks', 'update', taskId);
        const { error: updateError } = await supabase
          .from('org_tasks')
          .update({
            assigned_to: newAssigneeId,
            assigned_to_name: newAssigneeName,
          })
          .eq('id', taskId);

        if (updateError) throw updateError;

        const { error: commentError } = await supabase
          .from('org_task_comments')
          .insert({
            task_id: taskId,
            user_id: user?.id,
            user_name: currentUserName,
            comment: `Tarefa reatribuída para ${newAssigneeName}. Motivo: ${comment}`,
            is_system: true,
          });

        if (commentError) throw commentError;

        // Audit log for reassignment
        if (user?.id && currentTask) {
          await supabase.from('audit_logs').insert({
            area,
            entity_type: currentTask.parent_task_id ? 'subtask' : 'task',
            entity_id: taskId,
            entity_name: currentTask.title || 'Tarefa',
            action: 'updated',
            changed_fields: {
              assigned_to: { old: currentTask.assigned_to, new: newAssigneeId },
              assigned_to_name: { old: currentTask.assigned_to_name, new: newAssigneeName },
            },
            performed_by: user.id,
            details: `Reatribuído para ${newAssigneeName}. Motivo: ${comment}`,
          });
        }
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['org-tasks'] });
       toast.success('Tarefa reatribuída com sucesso');
     },
     onError: (error) => {
       toast.error('Erro ao reatribuir tarefa: ' + error.message);
     },
   });
 };
 
 export const useOrgTaskComments = (taskId: string) => {
   return useQuery({
     queryKey: ['org-task-comments', taskId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('org_task_comments')
         .select('*')
         .eq('task_id', taskId)
         .order('created_at', { ascending: false });
 
       if (error) throw error;
       return data as OrgTaskComment[];
     },
     enabled: !!taskId,
   });
 };
 
export const useCreateOrgTaskComment = (
  { showToasts = true }: OrgTaskMutationOptions = {},
) => {
   const queryClient = useQueryClient();
   const { user } = useAuth();
 
   return useMutation({
      mutationFn: async ({ taskId, comment, userName, isSystem = false }: {
        taskId: string;
        comment: string;
        userName: string;
        isSystem?: boolean;
      }) => {
        const newComment = {
          task_id: taskId,
          user_id: user?.id,
          user_name: userName,
          comment,
          is_system: isSystem,
        };
        const { error } = await supabase
          .from('org_task_comments')
          .insert(newComment);

        if (error) throw error;
        return newComment;
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['org-task-comments', variables.taskId] });
        if (showToasts) toast.success('Comentário adicionado');
      },
      onError: (error) => {
        if (showToasts) toast.error('Erro ao adicionar comentário: ' + error.message);
      },
   });
 };
 
 export const useTaskStatusCounts = () => {
   const { data: tasks } = useOrgTasks();
 
   const counts: Record<OrgTaskStatus, number> = {
     backlog: 0,
     waiting_client: 0,
     todo: 0,
     in_progress: 0,
     review: 0,
     em_ajuste: 0,
     done: 0,
   };

   tasks?.forEach(task => {
     if (Object.prototype.hasOwnProperty.call(counts, task.status)) {
       counts[task.status] = (counts[task.status] ?? 0) + 1;
     }
   });
 
   return counts;
 };
