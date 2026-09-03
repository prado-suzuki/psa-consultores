import type { OrgTask, OrgTaskStatus } from '@/hooks/useOrgTasks';

/**
 * O mínimo que o quadro precisa saber de uma tarefa. As regras de montagem
 * dependem só de id/status/mãe, então ficam testáveis sem montar uma OrgTask
 * inteira.
 */
export type KanbanTask = Pick<OrgTask, 'id' | 'status' | 'parent_task_id'>;

/** Filhas que estão em OUTRA coluna, agrupadas pelo status onde foram parar. */
export interface TaskKanbanSubtaskGroup {
  status: OrgTaskStatus;
  count: number;
  taskIds: string[];
}

/**
 * Um card do quadro. Só existe este tipo: ou é a tarefa no lugar dela, ou é a
 * CÓPIA da tarefa-mãe na coluna onde as filhas dela estão.
 */
export interface TaskKanbanEntry<T extends KanbanTask> {
  /** Identidade e chave de expansão. */
  key: string;
  /** A tarefa desenhada no card — na cópia, é a própria mãe. */
  task: T;
  /**
   * Cópia: o card original desta tarefa está em outra coluna (a do status
   * dela). Cópia não arrasta — quem se move é a filha, de dentro da lista.
   */
  isCopy: boolean;
  /** Filhas desta tarefa QUE ESTÃO NESTA COLUNA — a lista colapsável do card. */
  children: T[];
  /**
   * Em que colunas estão as OUTRAS filhas, na ordem do quadro. Sem isso o card
   * da mãe dizia "1/9 subtarefas" e não havia como saber onde elas estavam nem
   * como chegar até lá — e a coluna de destino costuma estar fora da tela.
   */
  elsewhere: TaskKanbanSubtaskGroup[];
  /** TODAS as filhas diretas — é o que a pílula "x/y subtarefas" conta. */
  subtaskCount: number;
  /** Filhas diretas concluídas, em qualquer coluna. */
  completedSubtasks: number;
}

export interface TaskKanbanColumn<T extends KanbanTask> {
  status: OrgTaskStatus;
  entries: TaskKanbanEntry<T>[];
  /**
   * Tarefas neste status — o que o cabeçalho mostra. Bate com os KPIs do topo
   * por construção (ver a invariante abaixo).
   */
  taskCount: number;
  /**
   * Quantas estão dentro da lista de um card desta coluna. Não vira número na
   * tela — o cabeçalho mostra só `taskCount`, como a régua de KPIs — mas fecha
   * a conta do title e é o que a invariante verifica.
   */
  hiddenCount: number;
}

/** Chave da cópia de uma mãe numa coluna. */
export function taskKanbanCopyKey(parentId: string, status: OrgTaskStatus) {
  return `copia:${parentId}:${status}`;
}

/** Agrupa tarefas por status, na ordem das colunas do quadro. */
function groupByStatus<T extends KanbanTask>(
  tasks: T[],
  statuses: readonly OrgTaskStatus[],
): TaskKanbanSubtaskGroup[] {
  return statuses
    .map((status) => {
      const doStatus = tasks.filter((task) => task.status === status);
      return { status, count: doStatus.length, taskIds: doStatus.map((task) => task.id) };
    })
    .filter((group) => group.count > 0);
}

/**
 * Monta as colunas do quadro de tarefas.
 *
 * Regra única: **a filha aparece sempre dentro do card da mãe** — e o card da
 * mãe se repete em toda coluna onde ela tem filha, marcado como cópia e
 * carregando o status real dela no rótulo. Assim o quadro tem um só tipo de
 * card, a filha nunca aparece solta sem contexto, e uma mãe com 9 subtarefas
 * espalhadas ocupa um card por coluna em vez de nove cards.
 *
 * Daí a invariante que faz o contador do cabeçalho ser honesto:
 *
 *   toda tarefa aparece na coluna do seu status — como card próprio, ou na
 *   lista de um card daquela mesma coluna
 *
 * e portanto `taskCount === cards que não são cópia + hiddenCount`.
 *
 * Antes disso, o quadro só desenhava as raízes e pendurava TODAS as filhas na
 * coluna da mãe: filha concluída aparecia dentro de um card no Backlog, filha
 * em andamento não aparecia na coluna "Em Andamento", e o contador da coluna
 * (que contava cards) nunca batia com o KPI do topo (que conta tarefas).
 *
 * Casos de borda tratados:
 * - **Mãe fora da lista** (filtro de status/responsável/escopo a removeu): a
 *   filha vira card próprio em vez de desaparecer do quadro.
 * - **Neta**: a mãe do meio também ganha cópia na coluna da neta, então nada se
 *   perde mesmo com três níveis.
 * - **Dado circular** (mãe apontando para a própria filha): a mãe é ignorada,
 *   e a filha cai no caso "mãe fora da lista".
 */
export function buildTaskKanbanColumns<T extends KanbanTask>(
  tasks: T[],
  statuses: readonly OrgTaskStatus[],
): TaskKanbanColumn<T>[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));

  const parentOf = (task: T): T | null => {
    const parentId = task.parent_task_id;
    if (!parentId || parentId === task.id) return null;
    return byId.get(parentId) ?? null;
  };

  const childrenByParent = new Map<string, T[]>();
  for (const task of tasks) {
    const parent = parentOf(task);
    if (!parent) continue;
    const list = childrenByParent.get(parent.id) ?? [];
    list.push(task);
    childrenByParent.set(parent.id, list);
  }

  const columns = new Map<OrgTaskStatus, TaskKanbanColumn<T>>(
    statuses.map((status) => [status, { status, entries: [], taskCount: 0, hiddenCount: 0 }]),
  );

  for (const task of tasks) {
    // Status fora das colunas do quadro não acontece (a coluna é enum do banco),
    // mas se acontecer a tarefa não é contada em coluna nenhuma.
    const column = columns.get(task.status);
    if (column) column.taskCount += 1;
  }

  const criados = new Set<string>();
  const adicionar = (dona: T, status: OrgTaskStatus) => {
    // O card é o "de verdade" quando a tarefa está na coluna do próprio status
    // e não é filha de ninguém; nos outros casos, é cópia.
    const isCopy = !(dona.status === status && !parentOf(dona));
    const key = isCopy ? taskKanbanCopyKey(dona.id, status) : dona.id;
    if (criados.has(key)) return;
    criados.add(key);

    const column = columns.get(status);
    if (!column) return;
    const filhas = childrenByParent.get(dona.id) ?? [];
    const children = filhas.filter((filha) => filha.status === status);
    column.entries.push({
      key,
      task: dona,
      isCopy,
      children,
      elsewhere: groupByStatus(
        filhas.filter((filha) => filha.status !== status),
        statuses,
      ),
      subtaskCount: filhas.length,
      completedSubtasks: filhas.filter((filha) => filha.status === 'done').length,
    });
    column.hiddenCount += children.length;
  };

  // Uma passada na ordem de entrada: o card nasce na posição da primeira
  // tarefa que precisa dele — a própria, ou a primeira filha daquela coluna.
  for (const task of tasks) {
    const parent = parentOf(task);
    if (parent) adicionar(parent, task.status);
    else adicionar(task, task.status);
  }

  return statuses.map((status) => columns.get(status) as TaskKanbanColumn<T>);
}

/**
 * Chave do card que vai receber a filha depois da mudança de status — ou
 * `null` se ela tem card próprio (mãe fora da lista).
 *
 * A filha sempre pousa dentro do card da mãe na coluna de destino, e a lista
 * nasce fechada: sem abrir esse card, quem arrastou acha que o card sumiu.
 */
export function keyToRevealAfterStatusChange<T extends KanbanTask>(
  task: T,
  nextStatus: OrgTaskStatus,
  tasks: T[],
): string | null {
  if (!task.parent_task_id || task.parent_task_id === task.id) return null;
  const parent = tasks.find((item) => item.id === task.parent_task_id);
  if (!parent) return null;
  // Mesma regra do `adicionar`: só é o card de verdade quando a mãe está na
  // coluna do próprio status e não é filha de ninguém visível.
  const avoVisivel =
    !!parent.parent_task_id &&
    parent.parent_task_id !== parent.id &&
    tasks.some((item) => item.id === parent.parent_task_id);
  return parent.status === nextStatus && !avoVisivel
    ? parent.id
    : taskKanbanCopyKey(parent.id, nextStatus);
}
