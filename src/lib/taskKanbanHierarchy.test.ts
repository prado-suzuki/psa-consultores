import { describe, expect, it } from 'vitest';
import type { OrgTaskStatus } from '@/hooks/useOrgTasks';
import {
  buildTaskKanbanColumns,
  parentToRevealAfterStatusChange,
  type KanbanTask,
  type TaskKanbanColumn,
} from '@/lib/taskKanbanHierarchy';

const STATUSES: readonly OrgTaskStatus[] = [
  'backlog',
  'waiting_client',
  'todo',
  'in_progress',
  'review',
  'em_ajuste',
  'done',
];

const task = (id: string, status: OrgTaskStatus, parent_task_id: string | null = null): KanbanTask => ({
  id,
  status,
  parent_task_id,
});

const column = (columns: TaskKanbanColumn<KanbanTask>[], status: OrgTaskStatus) =>
  columns.find((item) => item.status === status) as TaskKanbanColumn<KanbanTask>;

const cardIds = (columns: TaskKanbanColumn<KanbanTask>[], status: OrgTaskStatus) =>
  column(columns, status).cards.map((card) => card.task.id);

describe('buildTaskKanbanColumns', () => {
  it('mantém a filha aninhada quando ela está no mesmo status da mãe', () => {
    const tasks = [task('mae', 'todo'), task('filha', 'todo', 'mae')];

    const columns = buildTaskKanbanColumns(tasks, STATUSES);
    const aFazer = column(columns, 'todo');

    expect(cardIds(columns, 'todo')).toEqual(['mae']);
    expect(aFazer.cards[0].nested.map((item) => item.id)).toEqual(['filha']);
    expect(aFazer.cards[0].subtaskCount).toBe(1);
  });

  it('promove a filha a card próprio na coluna dela quando o status diverge da mãe', () => {
    const tasks = [
      task('mae', 'in_progress'),
      task('filha-parada', 'todo', 'mae'),
      task('filha-junto', 'in_progress', 'mae'),
    ];

    const columns = buildTaskKanbanColumns(tasks, STATUSES);

    expect(cardIds(columns, 'todo')).toEqual(['filha-parada']);
    expect(cardIds(columns, 'in_progress')).toEqual(['mae']);
    // A filha alinhada não vira card: fica aninhada na mãe.
    expect(column(columns, 'in_progress').cards[0].nested.map((item) => item.id)).toEqual([
      'filha-junto',
    ]);
    // O card promovido carrega a mãe, para o quadro poder rotular "↳ mãe".
    expect(column(columns, 'todo').cards[0].parent?.id).toBe('mae');
  });

  it('conta tarefas (não cards) no cabeçalho da coluna e separa as aninhadas', () => {
    const tasks = [
      task('mae', 'todo'),
      task('filha-1', 'todo', 'mae'),
      task('filha-2', 'todo', 'mae'),
      task('outra-mae', 'todo'),
      task('filha-longe', 'in_progress', 'outra-mae'),
    ];

    const columns = buildTaskKanbanColumns(tasks, STATUSES);
    const aFazer = column(columns, 'todo');

    expect(aFazer.taskCount).toBe(4);
    expect(aFazer.cards).toHaveLength(2);
    expect(aFazer.nestedCount).toBe(2);
    expect(aFazer.cardIdsWithNested).toEqual(['mae']);
    expect(column(columns, 'in_progress').taskCount).toBe(1);
  });

  it('vale a invariante: taskCount = cards + aninhadas em toda coluna', () => {
    const tasks = [
      task('m1', 'backlog'),
      task('f1', 'done', 'm1'),
      task('f2', 'backlog', 'm1'),
      task('m2', 'review'),
      task('f3', 'review', 'm2'),
      task('f4', 'waiting_client', 'm2'),
      task('m3', 'done'),
      task('f5', 'done', 'm3'),
      task('solta', 'em_ajuste'),
    ];

    const columns = buildTaskKanbanColumns(tasks, STATUSES);

    for (const item of columns) {
      expect(item.taskCount).toBe(item.cards.length + item.nestedCount);
    }
    // E nada se perde: toda tarefa está em alguma coluna.
    const total = columns.reduce((sum, item) => sum + item.taskCount, 0);
    expect(total).toBe(tasks.length);
  });

  it('promove a filha quando a mãe não está na lista visível (filtro a removeu)', () => {
    // Antes a filha desaparecia do quadro: não era raiz e o card da mãe não existia.
    const tasks = [task('filha', 'in_progress', 'mae-filtrada')];

    const columns = buildTaskKanbanColumns(tasks, STATUSES);

    expect(cardIds(columns, 'in_progress')).toEqual(['filha']);
    expect(column(columns, 'in_progress').cards[0].parent).toBeNull();
    expect(column(columns, 'in_progress').taskCount).toBe(1);
  });

  it('dá card próprio à neta cuja mãe está aninhada, para não perder tarefa', () => {
    const tasks = [
      task('avo', 'todo'),
      task('mae', 'todo', 'avo'),
      task('neta', 'todo', 'mae'),
    ];

    const columns = buildTaskKanbanColumns(tasks, STATUSES);
    const aFazer = column(columns, 'todo');

    expect(cardIds(columns, 'todo')).toEqual(['avo', 'neta']);
    expect(aFazer.cards[0].nested.map((item) => item.id)).toEqual(['mae']);
    expect(aFazer.taskCount).toBe(3);
    expect(aFazer.taskCount).toBe(aFazer.cards.length + aFazer.nestedCount);
  });

  it('conta as concluídas de todas as filhas, inclusive as que estão em outra coluna', () => {
    const tasks = [
      task('mae', 'backlog'),
      task('f1', 'done', 'mae'),
      task('f2', 'done', 'mae'),
      task('f3', 'backlog', 'mae'),
    ];

    const columns = buildTaskKanbanColumns(tasks, STATUSES);
    const card = column(columns, 'backlog').cards[0];

    expect(card.subtaskCount).toBe(3);
    expect(card.completedSubtasks).toBe(2);
    // As concluídas saem do card do Backlog e vão para a coluna Concluído.
    expect(card.nested.map((item) => item.id)).toEqual(['f3']);
    expect(cardIds(columns, 'done')).toEqual(['f1', 'f2']);
  });

  it('diz em que colunas estão as filhas que não aparecem no card da mãe', () => {
    const tasks = [
      task('mae', 'todo'),
      task('f1', 'done', 'mae'),
      task('f2', 'done', 'mae'),
      task('f3', 'in_progress', 'mae'),
      task('f4', 'todo', 'mae'),
    ];

    const card = column(buildTaskKanbanColumns(tasks, STATUSES), 'todo').cards[0];

    // Na ordem das colunas, não na ordem das tarefas.
    expect(card.elsewhere).toEqual([
      { status: 'in_progress', count: 1, taskIds: ['f3'] },
      { status: 'done', count: 2, taskIds: ['f1', 'f2'] },
    ]);
    // A que está no mesmo status segue aninhada e não entra no "onde estão".
    expect(card.nested.map((item) => item.id)).toEqual(['f4']);
  });

  it('não lista lugar nenhum quando todas as filhas estão aninhadas', () => {
    const tasks = [task('mae', 'todo'), task('f1', 'todo', 'mae')];

    expect(column(buildTaskKanbanColumns(tasks, STATUSES), 'todo').cards[0].elsewhere).toEqual([]);
  });

  it('não trava com tarefa apontando para si mesma nem com ciclo entre duas', () => {
    const tasks = [
      task('sozinha', 'todo', 'sozinha'),
      task('a', 'review', 'b'),
      task('b', 'review', 'a'),
    ];

    const columns = buildTaskKanbanColumns(tasks, STATUSES);

    expect(cardIds(columns, 'todo')).toEqual(['sozinha']);
    expect(column(columns, 'review').taskCount).toBe(2);
    expect(column(columns, 'review').taskCount).toBe(
      column(columns, 'review').cards.length + column(columns, 'review').nestedCount,
    );
  });

  it('devolve todas as colunas pedidas, na ordem, mesmo vazias', () => {
    const columns = buildTaskKanbanColumns([], STATUSES);

    expect(columns.map((item) => item.status)).toEqual(STATUSES);
    expect(columns.every((item) => item.cards.length === 0 && item.taskCount === 0)).toBe(true);
  });

  it('preserva a ordem de entrada das tarefas dentro da coluna', () => {
    const tasks = [task('z', 'todo'), task('a', 'todo'), task('m', 'todo')];

    expect(cardIds(buildTaskKanbanColumns(tasks, STATUSES), 'todo')).toEqual(['z', 'a', 'm']);
  });
});

describe('parentToRevealAfterStatusChange', () => {
  it('devolve a mãe quando a filha passa a ficar aninhada nela', () => {
    const tasks = [task('mae', 'in_progress'), task('filha', 'todo', 'mae')];

    expect(parentToRevealAfterStatusChange(tasks[1], 'in_progress', tasks)).toBe('mae');
  });

  it('devolve nulo quando a filha continua divergindo da mãe', () => {
    const tasks = [task('mae', 'in_progress'), task('filha', 'todo', 'mae')];

    expect(parentToRevealAfterStatusChange(tasks[1], 'review', tasks)).toBeNull();
  });

  it('devolve nulo para tarefa-raiz e para mãe ausente da lista', () => {
    const raiz = task('mae', 'todo');
    const orfa = task('filha', 'todo', 'mae-filtrada');

    expect(parentToRevealAfterStatusChange(raiz, 'done', [raiz])).toBeNull();
    expect(parentToRevealAfterStatusChange(orfa, 'todo', [orfa])).toBeNull();
  });
});
