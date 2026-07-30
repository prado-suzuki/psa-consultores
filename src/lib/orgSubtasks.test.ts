import { describe, expect, it } from 'vitest';

import type { OrgTask } from '@/hooks/useOrgTasks';
import { buildSubtaskInput, summarizeSubtasks } from '@/lib/orgSubtasks';

const parent = { id: 'T1', project_id: 'PRJ1', client_id: 'CLI1' } as Pick<
  OrgTask,
  'id' | 'project_id' | 'client_id'
>;

describe('summarizeSubtasks', () => {
  it('conta as concluídas e arredonda o percentual', () => {
    expect(
      summarizeSubtasks([
        { status: 'done' },
        { status: 'todo' },
        { status: 'in_progress' },
      ]),
    ).toEqual({ total: 3, concluidas: 1, percentual: 33 });
  });

  it('devolve zero sem subtarefas, sem dividir por zero', () => {
    expect(summarizeSubtasks([])).toEqual({ total: 0, concluidas: 0, percentual: 0 });
  });
});

describe('buildSubtaskInput', () => {
  it('herda projeto e cliente da tarefa-mãe e nasce a fazer, prioridade média', () => {
    expect(buildSubtaskInput('  Revisão de IRPF  ', parent)).toEqual({
      title: 'Revisão de IRPF',
      status: 'todo',
      priority: 'medium',
      parent_task_id: 'T1',
      project_id: 'PRJ1',
      client_id: 'CLI1',
    });
  });

  it('omite o cliente quando a tarefa-mãe não tem um', () => {
    expect(buildSubtaskInput('Sem cliente', { ...parent, client_id: null })).toMatchObject({
      client_id: undefined,
    });
  });

  it('recusa nome em branco e tarefa-mãe sem projeto', () => {
    expect(buildSubtaskInput('   ', parent)).toBeNull();
    expect(buildSubtaskInput('Nome', { ...parent, project_id: null })).toBeNull();
  });
});
