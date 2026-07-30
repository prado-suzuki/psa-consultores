import type { CreateOrgTaskInput, OrgTask, OrgTaskPriority } from '@/hooks/useOrgTasks';

/**
 * Regras puras da seção de Subtarefas do modal de tarefa: progresso da lista,
 * rótulos/cores de prioridade e montagem do payload da criação rápida.
 */

export interface SubtasksProgress {
  total: number;
  concluidas: number;
  /** Percentual concluído arredondado (0 quando não há subtarefas). */
  percentual: number;
}

export function summarizeSubtasks(subtasks: Pick<OrgTask, 'status'>[]): SubtasksProgress {
  const total = subtasks.length;
  const concluidas = subtasks.filter((subtask) => subtask.status === 'done').length;
  return {
    total,
    concluidas,
    percentual: total > 0 ? Math.round((concluidas / total) * 100) : 0,
  };
}

/** Prioridades da menos para a mais urgente — ordem dos itens do seletor. */
export const subtaskPriorityList: OrgTaskPriority[] = ['low', 'medium', 'high', 'urgent'];

export const subtaskPriorityLabels: Record<OrgTaskPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

/**
 * Payload da criação rápida (só o nome). O restante é herdado da tarefa-mãe:
 * projeto e cliente, para a subtarefa não sumir das telas que filtram por eles.
 *
 * Devolve `null` quando não há o mínimo para criar — nome em branco ou tarefa-mãe
 * sem projeto (`org_tasks.project_id` é NOT NULL).
 */
export function buildSubtaskInput(
  title: string,
  parent: Pick<OrgTask, 'id' | 'project_id' | 'client_id'>,
): CreateOrgTaskInput | null {
  const nome = title.trim();
  if (!nome || !parent.project_id) return null;

  return {
    title: nome,
    status: 'todo',
    priority: 'medium',
    parent_task_id: parent.id,
    project_id: parent.project_id,
    client_id: parent.client_id || undefined,
  };
}
