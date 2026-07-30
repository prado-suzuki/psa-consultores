import { describe, expect, it } from 'vitest';
import {
  buildMoveTaskPlan,
  collectDescendantIds,
  moveChangedFields,
  previewBulkMove,
  pruneNestedSelection,
  type MovableTask,
  type MoveTargetProject,
} from '@/lib/orgTaskMove';

const task = (overrides: Partial<MovableTask> = {}): MovableTask => ({
  id: 'task-1',
  project_id: 'project-1',
  client_id: 'client-1',
  contribuinte_id: 'contrib-1',
  parent_task_id: null,
  ...overrides,
});

const target = (overrides: Partial<MoveTargetProject> = {}): MoveTargetProject => ({
  id: 'project-2',
  name: 'Projeto 2',
  external_client_id: 'client-1',
  contribuinte_id: 'contrib-1',
  ...overrides,
});

describe('collectDescendantIds', () => {
  it('coleta subtarefas e netas, ignorando tarefas de outras árvores', () => {
    const tasks = [
      { id: 'mae', parent_task_id: null },
      { id: 'filha-1', parent_task_id: 'mae' },
      { id: 'filha-2', parent_task_id: 'mae' },
      { id: 'neta', parent_task_id: 'filha-1' },
      { id: 'outra', parent_task_id: null },
      { id: 'filha-de-outra', parent_task_id: 'outra' },
    ];

    expect(collectDescendantIds('mae', tasks).sort()).toEqual(['filha-1', 'filha-2', 'neta']);
  });

  it('retorna vazio para tarefa sem subtarefas', () => {
    expect(collectDescendantIds('mae', [{ id: 'mae', parent_task_id: null }])).toEqual([]);
  });

  it('não entra em loop com ciclo em parent_task_id', () => {
    const tasks = [
      { id: 'a', parent_task_id: 'b' },
      { id: 'b', parent_task_id: 'a' },
    ];

    expect(collectDescendantIds('a', tasks)).toEqual(['b']);
  });
});

describe('buildMoveTaskPlan', () => {
  it('move só o project_id quando o destino é do mesmo cliente', () => {
    const plan = buildMoveTaskPlan({ task: task(), target: target(), descendantIds: [] });

    expect(plan.rootChanges).toEqual({ project_id: 'project-2' });
    expect(plan.descendantChanges).toEqual({ project_id: 'project-2' });
    expect(plan.changesClient).toBe(false);
    expect(plan.changesContribuinte).toBe(false);
    expect(plan.detachesFromParent).toBe(false);
  });

  it('leva cliente e contribuinte do destino quando o cliente muda', () => {
    const plan = buildMoveTaskPlan({
      task: task(),
      target: target({ external_client_id: 'client-2', contribuinte_id: 'contrib-2' }),
      descendantIds: ['filha-1'],
    });

    expect(plan.rootChanges).toEqual({
      project_id: 'project-2',
      client_id: 'client-2',
      contribuinte_id: 'contrib-2',
    });
    // Subtarefas recebem o mesmo contexto — senão ficariam com cliente divergente da mãe.
    expect(plan.descendantChanges).toEqual({
      project_id: 'project-2',
      client_id: 'client-2',
      contribuinte_id: 'contrib-2',
    });
    expect(plan.changesClient).toBe(true);
    expect(plan.changesContribuinte).toBe(true);
  });

  it('limpa o contribuinte quando o projeto de destino não tem um', () => {
    const plan = buildMoveTaskPlan({
      task: task(),
      target: target({ external_client_id: 'client-2', contribuinte_id: null }),
      descendantIds: [],
    });

    expect(plan.rootChanges).toEqual({
      project_id: 'project-2',
      client_id: 'client-2',
      contribuinte_id: null,
    });
    expect(plan.changesContribuinte).toBe(true);
  });

  it('preserva o cliente da tarefa quando o projeto de destino não tem cliente', () => {
    const plan = buildMoveTaskPlan({
      task: task(),
      target: target({ external_client_id: null }),
      descendantIds: [],
    });

    expect(plan.rootChanges).toEqual({ project_id: 'project-2' });
    expect(plan.changesClient).toBe(false);
  });

  it('desvincula da mãe quando a tarefa movida é uma subtarefa', () => {
    const plan = buildMoveTaskPlan({
      task: task({ parent_task_id: 'mae' }),
      target: target(),
      descendantIds: [],
    });

    expect(plan.rootChanges).toEqual({ project_id: 'project-2', parent_task_id: null });
    expect(plan.detachesFromParent).toBe(true);
  });

  it('não desvincula as netas: elas seguem penduradas na subtarefa movida', () => {
    const plan = buildMoveTaskPlan({
      task: task({ parent_task_id: 'mae' }),
      target: target(),
      descendantIds: ['neta'],
    });

    expect(plan.descendantChanges).toEqual({ project_id: 'project-2' });
  });
});

describe('pruneNestedSelection', () => {
  const tree = [
    { id: 'mae', parent_task_id: null },
    { id: 'filha', parent_task_id: 'mae' },
    { id: 'neta', parent_task_id: 'filha' },
    { id: 'outra', parent_task_id: null },
  ];

  it('mantém as tarefas independentes', () => {
    expect(pruneNestedSelection(['mae', 'outra'], tree).sort()).toEqual(['mae', 'outra']);
  });

  it('descarta a filha quando a mãe também está selecionada', () => {
    expect(pruneNestedSelection(['mae', 'filha'], tree)).toEqual(['mae']);
  });

  it('descarta a neta mesmo quando a mãe intermediária não está selecionada', () => {
    expect(pruneNestedSelection(['mae', 'neta'], tree)).toEqual(['mae']);
  });

  it('mantém a filha quando só ela está selecionada', () => {
    expect(pruneNestedSelection(['filha'], tree)).toEqual(['filha']);
  });

  it('remove ids repetidos e não entra em loop com ciclo', () => {
    const cycle = [
      { id: 'a', parent_task_id: 'b' },
      { id: 'b', parent_task_id: 'a' },
    ];
    // 'b' não está selecionada, então 'a' segue como raiz — e o ciclo a→b→a
    // não pode travar a varredura.
    expect(pruneNestedSelection(['a', 'a'], cycle)).toEqual(['a']);
  });
});

describe('previewBulkMove', () => {
  const tasks: MovableTask[] = [
    { id: 'mae', project_id: 'project-1', client_id: 'client-1', contribuinte_id: 'contrib-1', parent_task_id: null },
    { id: 'filha', project_id: 'project-1', client_id: 'client-1', contribuinte_id: 'contrib-1', parent_task_id: 'mae' },
    { id: 'solta', project_id: 'project-1', client_id: 'client-1', contribuinte_id: 'contrib-1', parent_task_id: null },
    { id: 'ja-no-destino', project_id: 'project-2', client_id: 'client-1', contribuinte_id: 'contrib-1', parent_task_id: null },
    { id: 'sub-de-outra', project_id: 'project-1', client_id: 'client-1', contribuinte_id: 'contrib-1', parent_task_id: 'solta' },
  ];

  it('move só as raízes e conta as subtarefas que vão de carona', () => {
    const preview = previewBulkMove({ selectedIds: ['mae', 'filha', 'solta'], target: target(), tasks });

    expect(preview.movingIds.sort()).toEqual(['mae', 'solta']);
    // 'filha' já estava marcada; 'sub-de-outra' vai junto sem ter sido marcada.
    expect(preview.extraDescendantIds).toEqual(['sub-de-outra']);
    expect(preview.detachCount).toBe(0);
    expect(preview.alreadyThereIds).toEqual([]);
  });

  it('separa as que já estão no projeto de destino', () => {
    const preview = previewBulkMove({ selectedIds: ['solta', 'ja-no-destino'], target: target(), tasks });

    expect(preview.movingIds).toEqual(['solta']);
    expect(preview.alreadyThereIds).toEqual(['ja-no-destino']);
  });

  it('conta desvínculo, cliente e contribuinte quando o destino é de outro cliente', () => {
    const preview = previewBulkMove({
      selectedIds: ['filha', 'solta'],
      target: target({ external_client_id: 'client-2', contribuinte_id: null }),
      tasks,
    });

    expect(preview.movingIds.sort()).toEqual(['filha', 'solta']);
    expect(preview.detachCount).toBe(1);
    expect(preview.changesClientCount).toBe(2);
    expect(preview.changesContribuinteCount).toBe(2);
  });

  it('ignora ids que não estão na lista carregada', () => {
    const preview = previewBulkMove({ selectedIds: ['fantasma'], target: target(), tasks });

    expect(preview.movingIds).toEqual([]);
  });
});

describe('moveChangedFields', () => {
  it('monta o diff a partir do payload aplicado', () => {
    expect(
      moveChangedFields(
        { project_id: 'project-1', client_id: 'client-1', parent_task_id: 'mae' },
        { project_id: 'project-2', parent_task_id: null },
      ),
    ).toEqual({
      project_id: { old: 'project-1', new: 'project-2' },
      parent_task_id: { old: 'mae', new: null },
    });
  });

  it('normaliza ausência para null', () => {
    expect(moveChangedFields({}, { project_id: 'project-2' })).toEqual({
      project_id: { old: null, new: 'project-2' },
    });
  });
});
