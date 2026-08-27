import { describe, expect, it } from 'vitest';
import type { OrgTaskStatus } from '@/hooks/useOrgTasks';
import {
  buildTaskKanbanColumns,
  keyToRevealAfterStatusChange,
  taskKanbanCopyKey,
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

/** Resumo legível de uma coluna: cada card com o que ele mostra. */
const resumo = (columns: TaskKanbanColumn<KanbanTask>[], status: OrgTaskStatus) =>
  column(columns, status).entries.map((entry) => ({
    dona: entry.task.id,
    copia: entry.isCopy,
    filhas: entry.children.map((child) => child.id),
  }));

describe('buildTaskKanbanColumns', () => {
  it('mostra a filha dentro do card da mãe quando os dois estão na mesma coluna', () => {
    const tasks = [task('mae', 'todo'), task('filha', 'todo', 'mae')];

    const columns = buildTaskKanbanColumns(tasks, STATUSES);

    expect(resumo(columns, 'todo')).toEqual([{ dona: 'mae', copia: false, filhas: ['filha'] }]);
  });

  it('repete o card da mãe, como cópia, na coluna onde as filhas estão', () => {
    const tasks = [
      task('mae', 'in_progress'),
      task('filha-parada', 'todo', 'mae'),
      task('filha-junto', 'in_progress', 'mae'),
    ];

    const columns = buildTaskKanbanColumns(tasks, STATUSES);

    expect(resumo(columns, 'in_progress')).toEqual([
      { dona: 'mae', copia: false, filhas: ['filha-junto'] },
    ]);
    expect(resumo(columns, 'todo')).toEqual([
      { dona: 'mae', copia: true, filhas: ['filha-parada'] },
    ]);
    expect(column(columns, 'todo').entries[0].key).toBe(taskKanbanCopyKey('mae', 'todo'));
  });

  it('resolve o caso da reclamação: 9 subtarefas espalhadas viram 4 cards', () => {
    const tasks = [
      task('mae', 'todo'),
      task('f1', 'waiting_client', 'mae'),
      task('f2', 'waiting_client', 'mae'),
      task('f3', 'review', 'mae'),
      task('f4', 'review', 'mae'),
      task('f5', 'review', 'mae'),
      task('f6', 'review', 'mae'),
      task('f7', 'review', 'mae'),
      task('f8', 'review', 'mae'),
      task('f9', 'done', 'mae'),
    ];

    const columns = buildTaskKanbanColumns(tasks, STATUSES);

    expect(resumo(columns, 'todo')).toEqual([{ dona: 'mae', copia: false, filhas: [] }]);
    expect(resumo(columns, 'waiting_client')).toEqual([
      { dona: 'mae', copia: true, filhas: ['f1', 'f2'] },
    ]);
    expect(resumo(columns, 'review')).toEqual([
      { dona: 'mae', copia: true, filhas: ['f3', 'f4', 'f5', 'f6', 'f7', 'f8'] },
    ]);
    // Uma filha só também vai para dentro da cópia: um formato de card apenas.
    expect(resumo(columns, 'done')).toEqual([{ dona: 'mae', copia: true, filhas: ['f9'] }]);
    expect(columns.reduce((total, item) => total + item.entries.length, 0)).toBe(4);
  });

  it('dá uma cópia por mãe, sem misturar filhas de mães diferentes', () => {
    const tasks = [
      task('mae-a', 'todo'),
      task('mae-b', 'todo'),
      task('a1', 'review', 'mae-a'),
      task('b1', 'review', 'mae-b'),
    ];

    expect(resumo(buildTaskKanbanColumns(tasks, STATUSES), 'review')).toEqual([
      { dona: 'mae-a', copia: true, filhas: ['a1'] },
      { dona: 'mae-b', copia: true, filhas: ['b1'] },
    ]);
  });

  it('conta tarefas (não cards) no cabeçalho e separa as que estão dentro de uma lista', () => {
    const tasks = [
      task('mae', 'todo'),
      task('filha-1', 'todo', 'mae'),
      task('filha-2', 'todo', 'mae'),
      task('outra-mae', 'todo'),
      task('longe-1', 'in_progress', 'outra-mae'),
      task('longe-2', 'in_progress', 'outra-mae'),
    ];

    const columns = buildTaskKanbanColumns(tasks, STATUSES);
    const aFazer = column(columns, 'todo');
    const emProgresso = column(columns, 'in_progress');

    expect(aFazer.taskCount).toBe(4);
    expect(aFazer.hiddenCount).toBe(2);
    // A cópia não é tarefa: as duas filhas continuam contadas, o card não.
    expect(emProgresso.taskCount).toBe(2);
    expect(emProgresso.entries).toHaveLength(1);
    expect(emProgresso.hiddenCount).toBe(2);
    expect(emProgresso.entries[0].key).toBe(taskKanbanCopyKey('outra-mae', 'in_progress'));
  });

  it('vale a invariante: taskCount = cards que não são cópia + o que está nas listas', () => {
    const tasks = [
      task('m1', 'backlog'),
      task('f1', 'done', 'm1'),
      task('f2', 'done', 'm1'),
      task('f3', 'backlog', 'm1'),
      task('m2', 'review'),
      task('f4', 'review', 'm2'),
      task('f5', 'waiting_client', 'm2'),
      task('m3', 'done'),
      task('f6', 'done', 'm3'),
      task('solta', 'em_ajuste'),
    ];

    const columns = buildTaskKanbanColumns(tasks, STATUSES);

    for (const item of columns) {
      const proprios = item.entries.filter((entry) => !entry.isCopy).length;
      expect(item.taskCount).toBe(proprios + item.hiddenCount);
    }
    const total = columns.reduce((sum, item) => sum + item.taskCount, 0);
    expect(total).toBe(tasks.length);
  });

  it('dá card próprio à filha quando a mãe não está na lista visível', () => {
    // Antes a filha desaparecia do quadro: não era raiz e o card da mãe não existia.
    const tasks = [task('filha', 'in_progress', 'mae-filtrada')];

    expect(resumo(buildTaskKanbanColumns(tasks, STATUSES), 'in_progress')).toEqual([
      { dona: 'filha', copia: false, filhas: [] },
    ]);
    expect(column(buildTaskKanbanColumns(tasks, STATUSES), 'in_progress').taskCount).toBe(1);
  });

  it('não perde a neta: a mãe do meio também ganha cópia na coluna dela', () => {
    const tasks = [task('avo', 'todo'), task('mae', 'todo', 'avo'), task('neta', 'review', 'mae')];

    const columns = buildTaskKanbanColumns(tasks, STATUSES);

    expect(resumo(columns, 'todo')).toEqual([{ dona: 'avo', copia: false, filhas: ['mae'] }]);
    expect(resumo(columns, 'review')).toEqual([{ dona: 'mae', copia: true, filhas: ['neta'] }]);
    expect(column(columns, 'todo').taskCount).toBe(2);
    expect(column(columns, 'review').taskCount).toBe(1);
  });

  it('conta as concluídas de todas as filhas, inclusive as de outra coluna', () => {
    const tasks = [
      task('mae', 'backlog'),
      task('f1', 'done', 'mae'),
      task('f2', 'done', 'mae'),
      task('f3', 'backlog', 'mae'),
    ];

    const columns = buildTaskKanbanColumns(tasks, STATUSES);
    const cardDaMae = column(columns, 'backlog').entries[0];

    expect(cardDaMae.subtaskCount).toBe(3);
    expect(cardDaMae.completedSubtasks).toBe(2);
    expect(cardDaMae.children.map((item) => item.id)).toEqual(['f3']);
    // A cópia carrega a mesma contagem — é o mesmo card, repetido.
    expect(column(columns, 'done').entries[0].subtaskCount).toBe(3);
  });

  it('diz em que colunas estão as filhas que não aparecem neste card', () => {
    const tasks = [
      task('mae', 'todo'),
      task('f1', 'done', 'mae'),
      task('f2', 'done', 'mae'),
      task('f3', 'in_progress', 'mae'),
      task('f4', 'todo', 'mae'),
    ];

    const columns = buildTaskKanbanColumns(tasks, STATUSES);
    const cardDaMae = column(columns, 'todo').entries[0];

    // Na ordem das colunas, não na ordem das tarefas.
    expect(cardDaMae.elsewhere).toEqual([
      { status: 'in_progress', count: 1, taskIds: ['f3'] },
      { status: 'done', count: 2, taskIds: ['f1', 'f2'] },
    ]);
    // A que está nesta coluna sai da lista de destinos: ela já está no card.
    expect(cardDaMae.children.map((item) => item.id)).toEqual(['f4']);
  });

  it('não aponta destino nenhum quando todas as filhas estão neste card', () => {
    const tasks = [task('mae', 'todo'), task('f1', 'todo', 'mae')];

    expect(column(buildTaskKanbanColumns(tasks, STATUSES), 'todo').entries[0].elsewhere).toEqual([]);
  });

  it('a cópia também sabe onde estão as irmãs que ficaram fora dela', () => {
    const tasks = [
      task('mae', 'todo'),
      task('f1', 'review', 'mae'),
      task('f2', 'done', 'mae'),
    ];

    const copia = column(buildTaskKanbanColumns(tasks, STATUSES), 'review').entries[0];

    expect(copia.isCopy).toBe(true);
    expect(copia.elsewhere).toEqual([{ status: 'done', count: 1, taskIds: ['f2'] }]);
  });

  it('não trava com tarefa apontando para si mesma nem com ciclo entre duas', () => {
    const tasks = [
      task('sozinha', 'todo', 'sozinha'),
      task('a', 'review', 'b'),
      task('b', 'review', 'a'),
    ];

    const columns = buildTaskKanbanColumns(tasks, STATUSES);

    expect(resumo(columns, 'todo')).toEqual([{ dona: 'sozinha', copia: false, filhas: [] }]);
    expect(column(columns, 'review').taskCount).toBe(2);
  });

  it('devolve todas as colunas pedidas, na ordem, mesmo vazias', () => {
    const columns = buildTaskKanbanColumns([], STATUSES);

    expect(columns.map((item) => item.status)).toEqual(STATUSES);
    expect(columns.every((item) => item.entries.length === 0 && item.taskCount === 0)).toBe(true);
  });

  it('preserva a ordem de entrada: o card nasce na posição de quem precisou dele', () => {
    const tasks = [
      task('z', 'todo'),
      task('mae', 'review'),
      task('filha-de-mae', 'todo', 'mae'),
      task('a', 'todo'),
    ];

    expect(resumo(buildTaskKanbanColumns(tasks, STATUSES), 'todo')).toEqual([
      { dona: 'z', copia: false, filhas: [] },
      { dona: 'mae', copia: true, filhas: ['filha-de-mae'] },
      { dona: 'a', copia: false, filhas: [] },
    ]);
  });
});

describe('keyToRevealAfterStatusChange', () => {
  it('devolve o card da mãe quando a filha vai para a coluna dela', () => {
    const tasks = [task('mae', 'in_progress'), task('filha', 'todo', 'mae')];

    expect(keyToRevealAfterStatusChange(tasks[1], 'in_progress', tasks)).toBe('mae');
  });

  it('devolve a cópia da mãe quando a filha vai para qualquer outra coluna', () => {
    const tasks = [task('mae', 'todo'), task('filha', 'in_progress', 'mae')];

    expect(keyToRevealAfterStatusChange(tasks[1], 'review', tasks)).toBe(
      taskKanbanCopyKey('mae', 'review'),
    );
  });

  it('devolve a cópia quando a própria mãe é filha de alguém visível', () => {
    const tasks = [task('avo', 'todo'), task('mae', 'review', 'avo'), task('neta', 'todo', 'mae')];

    // A mãe está em review e é filha da avó, então o card dela em review também
    // é cópia — a chave precisa refletir isso.
    expect(keyToRevealAfterStatusChange(tasks[2], 'review', tasks)).toBe(
      taskKanbanCopyKey('mae', 'review'),
    );
  });

  it('devolve nulo para tarefa-raiz e para mãe ausente da lista', () => {
    const raiz = task('mae', 'todo');
    const orfa = task('filha', 'todo', 'mae-filtrada');

    expect(keyToRevealAfterStatusChange(raiz, 'done', [raiz])).toBeNull();
    expect(keyToRevealAfterStatusChange(orfa, 'todo', [orfa])).toBeNull();
  });
});
