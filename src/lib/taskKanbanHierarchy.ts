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

export interface TaskKanbanCard<T extends KanbanTask> {
  task: T;
  /**
   * Mãe da tarefa quando ela ganhou card próprio por divergir do status dela
   * (ou porque a mãe não está na lista visível). `null` em tarefa-raiz.
   */
  parent: T | null;
  /** Filhas que continuam ANINHADAS neste card — as que estão no mesmo status. */
  nested: T[];
  /**
   * Onde foram parar as filhas que NÃO estão aninhadas aqui, por status e na
   * ordem das colunas. Sem isso o card da mãe dizia "2 subtarefas" e não havia
   * como saber em que coluna elas estavam.
   */
  elsewhere: TaskKanbanSubtaskGroup[];
  /** TODAS as filhas diretas — é o que a pílula "x/y subtarefas" conta. */
  subtaskCount: number;
  /** Filhas diretas concluídas (qualquer coluna). */
  completedSubtasks: number;
}

export interface TaskKanbanColumn<T extends KanbanTask> {
  status: OrgTaskStatus;
  cards: TaskKanbanCard<T>[];
  /**
   * Tarefas neste status — cards + aninhadas. Bate com os KPIs do topo por
   * construção, e tudo que ele conta está fisicamente nesta coluna (ver a
   * invariante em `buildTaskKanbanColumns`).
   */
  taskCount: number;
  /** Quantas estão aninhadas dentro de um card desta coluna (o "+N" do cabeçalho). */
  nestedCount: number;
  /** Cards que guardam aninhadas — é o que o "+N" expande. */
  cardIdsWithNested: string[];
}

/**
 * Monta as colunas do quadro de tarefas.
 *
 * Regra (opção A2): a filha **só ganha card próprio quando o status dela
 * difere do da mãe**. Alinhada, segue aninhada no card da mãe — que está nesta
 * mesma coluna, justamente porque o status é o mesmo.
 *
 * Daí a invariante que faz o contador do cabeçalho ser honesto:
 *
 *   toda tarefa aparece na coluna do seu status — como card, ou aninhada dentro
 *   de um card que está naquela mesma coluna
 *
 * e portanto `taskCount === cards.length + nestedCount` em toda coluna.
 *
 * Antes disso, o quadro só desenhava as raízes e pendurava TODAS as filhas na
 * coluna da mãe: filha concluída aparecia dentro de um card no Backlog, filha
 * em andamento não aparecia na coluna "Em Progresso", e o contador da coluna
 * (que contava cards) nunca batia com o KPI do topo (que conta tarefas).
 *
 * Casos de borda tratados:
 * - **Mãe fora da lista** (filtro de status/responsável/escopo a removeu): a
 *   filha é promovida a card próprio em vez de desaparecer do quadro.
 * - **Neta sob filha aninhada**: como a filha não tem card, a neta ganha o
 *   dela — nada se perde, mesmo que hoje não exista neta no banco.
 * - **Dado circular** (mãe apontando para a própria filha): a resolução é
 *   memoizada antes de recorrer, então não travar é garantido.
 */
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

  // Tem card próprio quem é raiz, quem diverge da mãe, ou quem tem mãe sem card
  // (aí não haveria ninho onde aparecer).
  const ownCardCache = new Map<string, boolean>();
  const hasOwnCard = (task: T): boolean => {
    const cached = ownCardCache.get(task.id);
    if (cached !== undefined) return cached;
    // Marca antes de recorrer: dado circular não pode travar a montagem.
    ownCardCache.set(task.id, true);
    const parent = parentOf(task);
    const value = !parent || parent.status !== task.status || !hasOwnCard(parent);
    ownCardCache.set(task.id, value);
    return value;
  };

  const columns = new Map<OrgTaskStatus, TaskKanbanColumn<T>>(
    statuses.map((status) => [
      status,
      { status, cards: [], taskCount: 0, nestedCount: 0, cardIdsWithNested: [] },
    ]),
  );

  for (const task of tasks) {
    // Status fora das colunas do quadro não acontece (a coluna é enum do banco),
    // mas se acontecer a tarefa não é contada em coluna nenhuma.
    const column = columns.get(task.status);
    if (column) column.taskCount += 1;
  }

  for (const task of tasks) {
    if (!hasOwnCard(task)) continue;
    const column = columns.get(task.status);
    if (!column) continue;

    const children = childrenByParent.get(task.id) ?? [];
    const nested = children.filter((child) => !hasOwnCard(child));
    column.cards.push({
      task,
      parent: parentOf(task),
      nested,
      elsewhere: groupByStatus(
        children.filter((child) => hasOwnCard(child)),
        statuses,
      ),
      subtaskCount: children.length,
      completedSubtasks: children.filter((child) => child.status === 'done').length,
    });
    column.nestedCount += nested.length;
    if (nested.length > 0) column.cardIdsWithNested.push(task.id);
  }

  return statuses.map((status) => columns.get(status) as TaskKanbanColumn<T>);
}

/**
 * Id da mãe que precisa ser aberta depois de a filha mudar de status.
 *
 * Ao arrastar a filha para a coluna onde a mãe está, ela volta a ficar aninhada
 * — e o aninhamento nasce fechado, então pareceria que o card sumiu. Abrir a
 * mãe mostra a filha no lugar novo.
 */
export function parentToRevealAfterStatusChange<T extends KanbanTask>(
  task: T,
  nextStatus: OrgTaskStatus,
  tasks: T[],
): string | null {
  if (!task.parent_task_id || task.parent_task_id === task.id) return null;
  const parent = tasks.find((item) => item.id === task.parent_task_id);
  if (!parent || parent.status !== nextStatus) return null;
  return parent.id;
}
