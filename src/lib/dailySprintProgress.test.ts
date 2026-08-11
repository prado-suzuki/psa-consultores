import { describe, expect, it } from 'vitest';
import {
  buildDailySprintProgress,
  type SprintProgressTask,
} from '@/lib/dailySprintProgress';

const members = [
  { id: 'ana', first_name: 'Ana', last_name: 'Silva' },
  { id: 'bruno', first_name: 'Bruno', last_name: 'Souza' },
];

const task = (
  id: string,
  overrides: Partial<SprintProgressTask> = {},
): SprintProgressTask => ({
  id,
  title: `Tarefa ${id}`,
  task_code: null,
  status: 'pending',
  parent_id: null,
  assigned_to: 'ana',
  ...overrides,
});

describe('buildDailySprintProgress', () => {
  it('calcula o progresso coletivo e por pessoa somente com tarefas acionáveis', () => {
    const progress = buildDailySprintProgress([
      task('pai'),
      task('filha-1', { parent_id: 'pai', status: 'completed' }),
      task('filha-2', { parent_id: 'pai', status: 'in_progress' }),
      task('bruno-1', { assigned_to: 'bruno', status: 'completed' }),
      task('bruno-2', { assigned_to: 'bruno' }),
    ], members);

    expect(progress).toMatchObject({
      total: 4,
      completed: 2,
      inProgress: 1,
      percentage: 50,
      nextMilestone: 75,
    });
    expect(progress.tasks.map(({ id }) => id)).toEqual(['filha-1', 'filha-2', 'bruno-1', 'bruno-2']);
    expect(progress.people).toEqual([
      expect.objectContaining({ id: 'ana', name: 'Ana Silva', initials: 'AS', total: 2, completed: 1, inProgress: 1, percentage: 50 }),
      expect.objectContaining({ id: 'bruno', name: 'Bruno Souza', initials: 'BS', total: 2, completed: 1, inProgress: 0, percentage: 50 }),
    ]);
  });

  it('mantém tarefas não atribuídas visíveis e celebra 100%', () => {
    const progress = buildDailySprintProgress([
      task('ana', { status: 'completed' }),
      task('sem-pessoa', { assigned_to: null, status: 'completed' }),
    ], members);

    expect(progress.percentage).toBe(100);
    expect(progress.nextMilestone).toBeNull();
    expect(progress.people.at(-1)).toEqual(expect.objectContaining({
      name: 'Não atribuído',
      initials: 'NA',
      percentage: 100,
    }));
  });

  it('devolve zero e o primeiro marco quando a sprint não possui tarefas', () => {
    expect(buildDailySprintProgress([], members)).toMatchObject({
      people: [],
      tasks: [],
      total: 0,
      completed: 0,
      inProgress: 0,
      percentage: 0,
      nextMilestone: 25,
    });
  });
});
