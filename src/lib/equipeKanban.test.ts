import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildDeliverableStatusPayload,
  buildDeliverableUpdatePayload,
  buildEquipeKanbanFilePath,
  buildEquipeKanbanHierarchy,
  filterEquipeKanbanDeliverables,
  getEquipeKanbanColumnDeliverables,
  getEquipeKanbanErrorMessage,
  getEquipeKanbanSubtasks,
  validateEquipeKanbanFile,
  type EquipeKanbanDeliverable,
  type EquipeKanbanFilters,
} from '@/lib/equipeKanban';

const deliverable = (
  id: string,
  overrides: Partial<EquipeKanbanDeliverable> = {},
): EquipeKanbanDeliverable => ({
  id,
  title: id,
  description: null,
  status: 'pending',
  assigned_to: null,
  sprint_id: null,
  estimated_hours: null,
  due_date: null,
  start_date: null,
  parent_id: null,
  task_code: null,
  ...overrides,
});

const filters = (overrides: Partial<EquipeKanbanFilters> = {}): EquipeKanbanFilters => ({
  sprint: 'all',
  responsible: 'all',
  project: 'all',
  process: 'all',
  startDate: undefined,
  endDate: undefined,
  ...overrides,
});

afterEach(() => vi.useRealTimers());

describe('equipeKanban', () => {
  it('combina filtros e preserva a peculiaridade de processo representar o projeto da sprint', () => {
    const items = [
      deliverable('match', {
        sprint_id: 'sprint-a',
        assigned_to: 'user-a',
        start_date: '2026-07-02',
        due_date: '2026-07-20',
      }),
      deliverable('same-project', { sprint_id: 'sprint-b', assigned_to: 'user-a' }),
      deliverable('other-project', { sprint_id: 'sprint-c', assigned_to: 'user-a' }),
    ];
    const sprints = [
      { id: 'sprint-a', name: 'A', project_id: 'project-a' },
      { id: 'sprint-b', name: 'B', project_id: 'project-a' },
      { id: 'sprint-c', name: 'C', project_id: 'project-c' },
    ];
    const processes = [{ id: 'process-a', name: 'Processo A', project_id: 'project-a' }];

    expect(
      filterEquipeKanbanDeliverables(
        items,
        sprints,
        processes,
        filters({ process: 'process-a' }),
      ).map(({ id }) => id),
    ).toEqual(['match', 'same-project']);
    expect(
      filterEquipeKanbanDeliverables(
        items,
        sprints,
        processes,
        filters({
          sprint: 'sprint-a',
          responsible: 'user-a',
          project: 'project-a',
          process: 'process-a',
          startDate: new Date('2026-07-01T00:00:00'),
          endDate: new Date('2026-07-31T00:00:00'),
        }),
      ).map(({ id }) => id),
    ).toEqual(['match']);
    expect(
      filterEquipeKanbanDeliverables(items, sprints, processes, filters({ process: 'missing' })),
    ).toEqual([]);
  });

  it('monta somente raízes, mantém órfãs fora do resultado e ordena subtarefas por código numérico', () => {
    const items = [
      deliverable('child-10', { parent_id: 'parent', task_code: 'T-10', status: 'completed' }),
      deliverable('orphan', { parent_id: 'absent', task_code: 'T-1' }),
      deliverable('parent', { task_code: 'T-0' }),
      deliverable('child-2', { parent_id: 'parent', task_code: 'T-2' }),
    ];

    const hierarchy = buildEquipeKanbanHierarchy(items);
    expect(hierarchy).toHaveLength(1);
    expect(hierarchy[0]).toMatchObject({ id: 'parent', subtaskCount: 2, completedSubtasks: 1 });
    expect(hierarchy[0].subtasks.map(({ id }) => id)).toEqual(['child-2', 'child-10']);
    expect(getEquipeKanbanSubtasks(items, 'parent').map(({ id }) => id)).toEqual([
      'child-2',
      'child-10',
    ]);
  });

  it('ordena vencimentos e mantém data nula no fim em asc e no início em desc', () => {
    const hierarchy = buildEquipeKanbanHierarchy([
      deliverable('null-date'),
      deliverable('later', { due_date: '2026-08-10' }),
      deliverable('earlier', { due_date: '2026-07-10' }),
      deliverable('other-column', { status: 'completed', due_date: '2026-01-01' }),
    ]);

    expect(
      getEquipeKanbanColumnDeliverables(hierarchy, 'pending', 'asc').map(({ id }) => id),
    ).toEqual(['earlier', 'later', 'null-date']);
    expect(
      getEquipeKanbanColumnDeliverables(hierarchy, 'pending', 'desc').map(({ id }) => id),
    ).toEqual(['null-date', 'later', 'earlier']);
  });

  it('gera payloads de status e salvamento com completed_at somente nas transições corretas', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-17T12:00:00.000Z'));
    const form = {
      title: 'Entrega',
      description: '',
      assigned_to: '',
      status: 'completed',
      start_date: '',
      due_date: '2026-07-31',
      estimated_hours: '2.5',
    };

    expect(buildDeliverableStatusPayload('completed')).toEqual({
      status: 'completed',
      completed_at: '2026-07-17T12:00:00.000Z',
    });
    expect(buildDeliverableStatusPayload('pending')).toEqual({
      status: 'pending',
      completed_at: null,
    });
    expect(buildDeliverableUpdatePayload(form, 'pending')).toEqual({
      title: 'Entrega',
      description: null,
      assigned_to: null,
      status: 'completed',
      start_date: null,
      due_date: '2026-07-31',
      estimated_hours: 2.5,
      completed_at: '2026-07-17T12:00:00.000Z',
    });
    expect(
      buildDeliverableUpdatePayload({ ...form, status: 'in_progress' }, 'completed').completed_at,
    ).toBeNull();
    expect(buildDeliverableUpdatePayload(form, 'completed')).not.toHaveProperty('completed_at');
  });

  it('valida tipo antes do tamanho, aceita o limite e cria caminho com timestamp e extensão', () => {
    const invalidLarge = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'malware.exe', {
      type: 'x/exe',
    });
    const tooLarge = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.pdf', {
      type: 'application/pdf',
    });
    const allowed = new File([new Uint8Array(10 * 1024 * 1024)], 'report.final.PDF', {
      type: 'application/pdf',
    });
    expect(validateEquipeKanbanFile(invalidLarge)).toContain('Tipo de arquivo');
    expect(validateEquipeKanbanFile(tooLarge)).toBe('Arquivo muito grande. Máximo 10MB.');
    expect(validateEquipeKanbanFile(allowed)).toBeNull();

    vi.useFakeTimers();
    vi.setSystemTime(1234);
    expect(buildEquipeKanbanFilePath('delivery-1', allowed)).toBe('delivery-1/1234.PDF');
  });

  it('extrai somente mensagem textual não vazia e usa fallback nos demais erros', () => {
    expect(getEquipeKanbanErrorMessage(new Error('negado pelo RLS'), 'fallback')).toBe(
      'negado pelo RLS',
    );
    expect(getEquipeKanbanErrorMessage({ message: '' }, 'fallback')).toBe('fallback');
    expect(getEquipeKanbanErrorMessage({ message: 42 }, 'fallback')).toBe('fallback');
    expect(getEquipeKanbanErrorMessage('erro', 'fallback')).toBe('fallback');
  });
});
