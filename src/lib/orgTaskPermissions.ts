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

/**
 * Quem pode mudar os campos fora do trio status/horas/revisor — espelho do
 * trigger `org_tasks_team_member_status_only` (RLS-06): sublíder ou acima, e o
 * criador da própria tarefa. Serve para a lista só oferecer o seletor de
 * responsável e o de prazo a quem o banco vai deixar gravar.
 *
 * O revisor delegado fica fora mesmo sendo líder: enquanto a revisão está com
 * ele, a única escrita que passa é devolver para ajustes.
 */
export function canEditOrgTaskFields(
  task: Pick<OrgTask, 'assigned_to' | 'created_by' | 'reviewer_id'>,
  actor: OrgTaskActor,
) {
  if (isDelegatedOrgTaskReviewer(task, actor.userId)) return false;
  if (actor.isAdmin || actor.isLider || actor.isSublider) return true;
  return !!actor.userId && task.created_by === actor.userId;
}
