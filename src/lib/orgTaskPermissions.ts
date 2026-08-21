import type { OrgTask } from '@/hooks/useOrgTasks';

export function isDelegatedOrgTaskReviewer(
  task: Pick<OrgTask, 'assigned_to' | 'reviewer_id'>,
  userId?: string | null,
) {
  return !!userId && task.reviewer_id === userId && task.assigned_to !== userId;
}

export interface OrgTaskActor {
  userId?: string | null;
  isAdmin?: boolean;
  isLider?: boolean;
  isSublider?: boolean;
}

/**
 * Quem pode mudar o status de uma tarefa — espelho da policy
 * `rls_org_tasks_update`: admin, líder/sublíder com acesso ao projeto,
 * responsável, criador, ou revisor enquanto a tarefa está em revisão.
 *
 * Serve para o quadro não oferecer um arrasto que o banco vai recusar. É
 * deliberadamente **permissiva na dúvida**: para líder/sublíder a RLS ainda
 * exige `can_view_org_project`, que só o banco sabe responder, e bloquear o
 * arrasto aqui esconderia movimentos legítimos. Errar para o lado de deixar
 * arrastar custa uma mensagem de erro; errar para o outro trava o trabalho.
 */
export function canUpdateOrgTaskStatus(
  task: Pick<OrgTask, 'assigned_to' | 'created_by' | 'reviewer_id' | 'status' | 'project_id'>,
  actor: OrgTaskActor,
) {
  if (actor.isAdmin) return true;
  if ((actor.isLider || actor.isSublider) && task.project_id) return true;
  if (!actor.userId) return false;
  if (task.assigned_to === actor.userId) return true;
  if (task.created_by === actor.userId) return true;
  return task.reviewer_id === actor.userId && task.status === 'review';
}
