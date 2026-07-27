import { describe, expect, it } from 'vitest';
import {
  findOpenSubtasks,
  formatOpenSubtasksLabel,
  getBlockingOpenSubtasks,
  type CompletableTask,
} from '@/lib/deliverableCompletion';

const task = (id: string, overrides: Partial<CompletableTask> = {}): CompletableTask => ({
  id,
  title: id,
  status: 'pending',
  parent_id: null,
  task_code: null,
  ...overrides,
});

const tree = [
  task('mae', { task_code: 'TAX-01', status: 'completed' }),
  task('sub-feita', { parent_id: 'mae', task_code: 'TAX-02', status: 'completed' }),
  task('sub-aberta', { parent_id: 'mae', task_code: 'TAX-03' }),
  task('neta-aberta', { parent_id: 'sub-aberta', task_code: 'TAX-03.1', status: 'in_progress' }),
  task('outra-mae', { task_code: 'GED-01' }),
  task('outra-sub', { parent_id: 'outra-mae', task_code: 'GED-02', status: 'completed' }),
];

describe('deliverableCompletion', () => {
  it('acha descendentes abertos de todos os níveis, por código, ignorando ramos alheios', () => {
    expect(findOpenSubtasks(tree, 'mae').map(({ id }) => id)).toEqual([
      'sub-aberta',
      'neta-aberta',
    ]);
    // 'in_progress' também conta como aberta.
    expect(findOpenSubtasks(tree, 'sub-aberta').map(({ id }) => id)).toEqual(['neta-aberta']);
    expect(findOpenSubtasks(tree, 'outra-mae')).toEqual([]);
    expect(findOpenSubtasks(tree, 'sub-feita')).toEqual([]);
    expect(findOpenSubtasks(tree, 'inexistente')).toEqual([]);
  });

  it('não entra em loop se o parent_id formar ciclo (dado inconsistente)', () => {
    const cycle = [
      task('a', { parent_id: 'b', task_code: 'A' }),
      task('b', { parent_id: 'a', task_code: 'B' }),
    ];
    expect(findOpenSubtasks(cycle, 'a').map(({ id }) => id)).toEqual(['b']);
  });

  it('só barra a transição para concluído, e nunca quando a mãe já estava concluída', () => {
    expect(
      getBlockingOpenSubtasks(tree, 'mae', 'completed', 'pending').map(({ id }) => id),
    ).toEqual(['sub-aberta', 'neta-aberta']);
    // Reabrir/mover para outro status nunca avisa.
    expect(getBlockingOpenSubtasks(tree, 'mae', 'pending', 'completed')).toEqual([]);
    expect(getBlockingOpenSubtasks(tree, 'mae', 'in_progress', 'pending')).toEqual([]);
    // Já concluída: salvar de novo não deve reabrir o aviso.
    expect(getBlockingOpenSubtasks(tree, 'mae', 'completed', 'completed')).toEqual([]);
    // Tudo fechado abaixo: segue direto.
    expect(getBlockingOpenSubtasks(tree, 'outra-mae', 'completed', 'pending')).toEqual([]);
  });

  it('pluraliza o rótulo do aviso', () => {
    expect(formatOpenSubtasksLabel(1)).toBe('1 subtarefa aberta');
    expect(formatOpenSubtasksLabel(3)).toBe('3 subtarefas abertas');
  });
});
