// Regra de conclusão de tarefa-mãe, compartilhada pelo Kanban (/equipe/kanban) e pelo
// detalhe da sprint (/equipe/sprints/:id): concluir uma mãe que ainda tem subtarefa aberta
// esconde trabalho de alguém (a subtarefa fica aninhada num card já riscado), então o
// usuário precisa ser avisado antes.

export interface CompletableTask {
  id: string;
  title: string;
  status: string;
  parent_id: string | null;
  task_code: string | null;
}

const sortByTaskCode = (a: CompletableTask, b: CompletableTask) =>
  a.task_code && b.task_code
    ? a.task_code.localeCompare(b.task_code, undefined, { numeric: true })
    : 0;

/**
 * Descendentes (filhas, netas, ...) ainda não concluídos, ordenados por código.
 * Ignora ciclo de `parent_id` (dado inconsistente) para não travar em loop.
 */
export function findOpenSubtasks<T extends CompletableTask>(tasks: T[], parentId: string): T[] {
  const childrenByParent = new Map<string, T[]>();
  for (const task of tasks) {
    if (!task.parent_id) continue;
    const list = childrenByParent.get(task.parent_id) ?? [];
    list.push(task);
    childrenByParent.set(task.parent_id, list);
  }

  const open: T[] = [];
  const visited = new Set<string>([parentId]);
  const walk = (id: string) => {
    for (const child of childrenByParent.get(id) ?? []) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      if (child.status !== 'completed') open.push(child);
      walk(child.id);
    }
  };
  walk(parentId);

  return open.sort(sortByTaskCode);
}

/**
 * Subtarefas abertas que devem gerar aviso antes de gravar o novo status.
 * Vazio = pode gravar direto: só barra a transição PARA concluído (reabrir ou salvar
 * uma mãe que já estava concluída não incomoda ninguém).
 */
export function getBlockingOpenSubtasks<T extends CompletableTask>(
  tasks: T[],
  taskId: string,
  nextStatus: string,
  currentStatus: string | undefined,
): T[] {
  if (nextStatus !== 'completed' || currentStatus === 'completed') return [];
  return findOpenSubtasks(tasks, taskId);
}

/** "1 subtarefa aberta" / "3 subtarefas abertas" — usado no título do aviso. */
export function formatOpenSubtasksLabel(count: number) {
  return count === 1 ? '1 subtarefa aberta' : `${count} subtarefas abertas`;
}
