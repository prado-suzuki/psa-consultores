// Fonte única de entregáveis de sprint (tabela `sprint_deliverables`).
// TODA leitura/mutação de entregável deve passar por aqui — nenhuma tela deve
// chamar supabase.from('sprint_deliverables') direto (regra do CLAUDE.md).
//
// Esta é a tabela ELEITA como fonte única de tarefa da equipe (T1 da unificação):
// `tasks` foi aposentada e `org_tasks` é do domínio fiscal.

import {
  useQuery, useMutation, useQueryClient,
  type UseQueryResult, type UseMutationResult,
} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';

export type DeliverableStatus = 'pending' | 'in_progress' | 'completed';

export interface SprintDeliverable {
  id: string;
  title: string;
  description: string | null;
  status: DeliverableStatus;
  assigned_to: string | null;
  sprint_id: string | null;
  project_id: string | null;
  process_id: string | null;
  estimated_hours: number | null;
  due_date: string | null;
  start_date: string | null;
  parent_id: string | null;
  task_code: string | null;
  completed_at: string | null;
  created_at: string | null;
}

export type SprintDeliverableInput = Partial<Omit<SprintDeliverable, 'id'>>;

export interface DeliverableFilters {
  /** Restringe a uma sprint. */
  sprintId?: string;
  /** Restringe a um responsável (profiles.id). */
  assignedTo?: string;
  /** Remove os já concluídos. */
  excludeCompleted?: boolean;
}

const TABLE = 'sprint_deliverables';
const SELECT =
  'id, title, description, status, assigned_to, sprint_id, project_id, process_id, ' +
  'estimated_hours, due_date, start_date, parent_id, task_code, completed_at, created_at';

export function useSprintDeliverables(
  filters: DeliverableFilters = {},
): UseQueryResult<SprintDeliverable[]> {
  const { sprintId, assignedTo, excludeCompleted } = filters;
  return useQuery<SprintDeliverable[]>({
    queryKey: [TABLE, { sprintId, assignedTo, excludeCompleted }],
    queryFn: async () => {
      let q = supabase.from(TABLE as never).select(SELECT);
      if (sprintId) q = q.eq('sprint_id', sprintId);
      if (assignedTo) q = q.eq('assigned_to', assignedTo);
      if (excludeCompleted) q = q.neq('status', 'completed');
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as SprintDeliverable[];
    },
  });
}

export function useCreateSprintDeliverable(): UseMutationResult<
  SprintDeliverable, Error, SprintDeliverableInput
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input) => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .insert(input as never)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as SprintDeliverable;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export function useUpdateSprintDeliverable(): UseMutationResult<
  SprintDeliverable, Error, { id: string; patch: SprintDeliverableInput }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }) => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .update(patch as never)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as SprintDeliverable;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export function useDeleteSprintDeliverable(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      // Se este entregável veio de um item do backlog, o item guarda uma referência
      // (moved_to_deliverable_id) que TRAVA o DELETE (FK sem ON DELETE). Devolvemos o
      // item ao backlog (limpa a referência) antes de excluir.
      const { error: backlogRefError } = await supabase
        .from('sprint_backlog_items' as never)
        .update({ moved_to_deliverable_id: null, status: 'pending', sprint_id: null } as never)
        .eq('moved_to_deliverable_id', id);
      if (backlogRefError) throw new Error(backlogRefError.message);

      // Cascata: limpa anexos (tabela + storage) antes de excluir o entregável.
      const { data: atts } = await supabase
        .from('deliverable_attachments' as never)
        .select('id, file_path')
        .eq('deliverable_id', id);
      const list = (atts ?? []) as unknown as { id: string; file_path: string }[];
      if (list.length > 0) {
        // Precheck antes do storage — amostra um id (delete em lote).
        await assertCanPerform('deliverable_attachments', 'delete', list[0].id);
        await supabase.storage.from('deliverable-attachments').remove(list.map(a => a.file_path));
        const { error: delAttErr } = await supabase
          .from('deliverable_attachments' as never)
          .delete()
          .eq('deliverable_id', id);
        if (delAttErr) throw new Error(delAttErr.message);
      }
      const { error } = await supabase.from(TABLE as never).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}
