import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(() => ({
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  })),
}));

const rlsMocks = vi.hoisted(() => ({
  assertCanPerform: vi.fn<() => Promise<void>>(),
}));

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
  storageRemove: vi.fn(),
  storageFrom: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/hooks/useRlsPrecheck', () => rlsMocks);
vi.mock('@/lib/excelImporter', () => ({
  findProfileByName: vi.fn(() => null),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: supabaseMocks.from,
    channel: supabaseMocks.channel,
    removeChannel: supabaseMocks.removeChannel,
    storage: { from: supabaseMocks.storageFrom },
  },
}));

import { useDomainEquipeSprintDetalhes } from '@/hooks/useDomainEquipeSprintDetalhes';

// Constante interna do hook, replicada para as asserções de wiring.
const DIGITAL_CLUSTER_ID = '952435d2-ef26-4829-80a2-e186dc61158c';

interface DbResult {
  data: unknown;
  error: unknown;
}
interface DbCall {
  table: string;
  method: string;
  args: unknown[];
}

const dbCalls: DbCall[] = [];
const dbResults = new Map<string, DbResult>();

function setDbResult(table: string, operation: string, result: DbResult) {
  dbResults.set(`${table}:${operation}`, result);
}

function makeSupabaseChain(table: string) {
  let operation = 'select';
  const chain: Record<string, unknown> = {};
  for (const method of [
    'select',
    'insert',
    'update',
    'delete',
    'upsert',
    'eq',
    'neq',
    'is',
    'in',
    'filter',
    'order',
    'limit',
    'single',
    'maybeSingle',
  ]) {
    chain[method] = vi.fn((...args: unknown[]) => {
      dbCalls.push({ table, method, args });
      // Uma escrita seguida de .select() (insert().select().single()) deve resolver
      // pelo resultado da escrita — o select encadeado não sobrescreve a operação.
      if (['insert', 'update', 'delete', 'upsert'].includes(method)) operation = method;
      else if (method === 'select' && operation === 'select') operation = 'select';
      return chain;
    });
  }
  chain.then = (onFulfilled: (r: DbResult) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(dbResults.get(`${table}:${operation}`) ?? { data: [], error: null }).then(
      onFulfilled,
      onRejected,
    );
  return chain;
}

function callsFor(table: string, method: string) {
  return dbCalls.filter((c) => c.table === table && c.method === method);
}

function queryRegistrations() {
  return reactQueryMocks.useQuery.mock.calls.map(([o]) => o as Record<string, unknown>);
}

function renderDomain(sprintId: string | undefined = 'sprint-1') {
  return renderHook(() => useDomainEquipeSprintDetalhes(sprintId)).result
    .current as unknown as Record<string, { mutationFn: (input: unknown) => Promise<unknown> }>;
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  rlsMocks.assertCanPerform.mockResolvedValue(undefined);
  supabaseMocks.from.mockImplementation((t: string) => makeSupabaseChain(t) as never);
  const channelObject = {
    on: vi.fn(() => channelObject),
    subscribe: vi.fn(() => channelObject),
  };
  supabaseMocks.channel.mockReturnValue(channelObject);
  supabaseMocks.storageRemove.mockResolvedValue({ data: [], error: null });
  supabaseMocks.storageFrom.mockReturnValue({ remove: supabaseMocks.storageRemove });
});

describe('useDomainEquipeSprintDetalhes — query de detalhe', () => {
  it('registra a query key canônica e enabled derivado do sprintId', () => {
    renderDomain('sprint-1');
    const registration = queryRegistrations()[0];
    expect(registration.queryKey).toEqual(['domain-equipe-sprint-detalhes', 'sprint-1']);
    expect(registration.enabled).toBe(true);
    expect(registration.retry).toBe(false);
    expect(registration.staleTime).toBe(0);
    expect(registration.gcTime).toBe(0);
  });

  it('desabilita a query quando não há sprintId', () => {
    renderHook(() => useDomainEquipeSprintDetalhes(undefined));
    const registration = queryRegistrations()[0];
    expect(registration.enabled).toBe(false);
    expect(registration.queryKey).toEqual(['domain-equipe-sprint-detalhes', undefined]);
  });

  it('retorna null sem carregar detalhes quando o sprint não existe', async () => {
    setDbResult('sprints', 'select', { data: null, error: null });
    renderDomain('sprint-1');
    const data = await (queryRegistrations()[0].queryFn as () => Promise<unknown>)();
    expect(data).toBeNull();
    expect(callsFor('sprints', 'eq')[0].args).toEqual(['id', 'sprint-1']);
    expect(callsFor('sprints', 'maybeSingle')).toHaveLength(1);
    // Não deve prosseguir para as demais tabelas.
    expect(callsFor('sprint_deliverables', 'select')).toHaveLength(0);
  });

  it('aplica os filtros críticos de cada tabela relacionada ao sprint', async () => {
    setDbResult('sprints', 'select', {
      data: { id: 'sprint-1', name: 'Sprint 1' },
      error: null,
    });
    renderDomain('sprint-1');
    await (queryRegistrations()[0].queryFn as () => Promise<unknown>)();

    expect(callsFor('sprints', 'select')[0].args).toEqual(['*']);
    expect(callsFor('sprints', 'eq')[0].args).toEqual(['id', 'sprint-1']);
    expect(callsFor('estrutura_areas', 'eq')[0].args).toEqual(['cluster_id', DIGITAL_CLUSTER_ID]);
    expect(callsFor('sprint_deliverables', 'eq')[0].args).toEqual(['sprint_id', 'sprint-1']);
    expect(callsFor('sprint_deliverables', 'order')[0].args).toEqual([
      'due_date',
      { ascending: true },
    ]);
    expect(callsFor('sprint_events', 'eq')[0].args).toEqual(['sprint_id', 'sprint-1']);
    expect(callsFor('sprint_metrics', 'eq')[0].args).toEqual(['sprint_id', 'sprint-1']);
    expect(callsFor('projects', 'order')[0].args).toEqual(['name']);
    expect(callsFor('processes', 'order')[0].args).toEqual(['name']);
    expect(callsFor('project_processes', 'select')[0].args).toEqual(['process_id, project_id']);
  });

  it('propaga o erro retornado ao consultar o sprint', async () => {
    const error = new Error('falha ao consultar sprint');
    setDbResult('sprints', 'select', { data: null, error });
    renderDomain('sprint-1');
    await expect(
      (queryRegistrations()[0].queryFn as () => Promise<unknown>)(),
    ).rejects.toBe(error);
  });
});

describe('useDomainEquipeSprintDetalhes — realtime', () => {
  it('assina o canal de sprint_deliverables filtrado pelo sprintId', () => {
    renderDomain('sprint-1');
    expect(supabaseMocks.channel).toHaveBeenCalledWith('sprint-deliverables-sprint-1');
    const channelObject = supabaseMocks.channel.mock.results[0].value;
    expect(channelObject.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'sprint_deliverables',
        filter: 'sprint_id=eq.sprint-1',
      }),
      expect.any(Function),
    );
  });
});

describe('useDomainEquipeSprintDetalhes — escritas em sprint_deliverables', () => {
  it('updateDeliverableStatus: atualiza status/completed_at filtrando pelo id (sem precheck)', async () => {
    const api = renderDomain();
    await api.updateDeliverableStatus.mutationFn({
      deliverableId: 'deliv-1',
      newStatus: 'completed',
    });

    const update = callsFor('sprint_deliverables', 'update')[0];
    expect(update.args[0]).toMatchObject({ status: 'completed' });
    expect((update.args[0] as { completed_at: string | null }).completed_at).toEqual(
      expect.any(String),
    );
    expect(callsFor('sprint_deliverables', 'eq')[0].args).toEqual(['id', 'deliv-1']);
    expect(rlsMocks.assertCanPerform).not.toHaveBeenCalled();
  });

  it('updateDeliverableStatus: zera completed_at quando o status não é completed', async () => {
    const api = renderDomain();
    await api.updateDeliverableStatus.mutationFn({
      deliverableId: 'deliv-1',
      newStatus: 'pending',
    });
    expect(callsFor('sprint_deliverables', 'update')[0].args[0]).toEqual({
      status: 'pending',
      completed_at: null,
    });
  });

  it('reorderDeliverables: atualiza task_code de cada shift filtrando pelo id', async () => {
    const api = renderDomain();
    await api.reorderDeliverables.mutationFn({
      shifts: [
        { deliverableId: 'deliv-1', taskCode: 'A1' },
        { deliverableId: 'deliv-2', taskCode: 'A2' },
      ],
    });

    const updates = callsFor('sprint_deliverables', 'update');
    expect(updates.map((c) => c.args[0])).toEqual([{ task_code: 'A1' }, { task_code: 'A2' }]);
    expect(callsFor('sprint_deliverables', 'eq').map((c) => c.args)).toEqual([
      ['id', 'deliv-1'],
      ['id', 'deliv-2'],
    ]);
  });

  it('updateDeliverable: envia o payload completo filtrando pelo id (sem precheck)', async () => {
    const updates = {
      title: 'Tarefa',
      description: null,
      assigned_to: 'user-1',
      start_date: null,
      due_date: '2026-07-01',
      estimated_hours: 4,
      status: 'pending',
      completed_at: null,
      project_id: null,
      process_id: null,
      parent_id: null,
      task_code: null,
    };
    const api = renderDomain();
    await api.updateDeliverable.mutationFn({ deliverableId: 'deliv-1', updates });

    expect(callsFor('sprint_deliverables', 'update')[0].args).toEqual([updates]);
    expect(callsFor('sprint_deliverables', 'eq')[0].args).toEqual(['id', 'deliv-1']);
    expect(rlsMocks.assertCanPerform).not.toHaveBeenCalled();
  });

  it('updateDeliverable: propaga erro do update', async () => {
    const error = new Error('falha ao atualizar entregável');
    setDbResult('sprint_deliverables', 'update', { data: null, error });
    const api = renderDomain();
    await expect(
      api.updateDeliverable.mutationFn({
        deliverableId: 'deliv-1',
        updates: {} as never,
      }),
    ).rejects.toBe(error);
  });

  it('createDeliverable: insere o payload e coleta o registro criado', async () => {
    const payload = {
      sprint_id: 'sprint-1',
      title: 'Nova tarefa',
      description: null,
      assigned_to: null,
      start_date: '2026-07-01',
      due_date: '2026-07-05',
      estimated_hours: null,
      status: 'pending',
      parent_id: null,
      project_id: null,
      process_id: null,
      task_code: null,
    };
    setDbResult('sprint_deliverables', 'insert', { data: { id: 'deliv-9' }, error: null });
    const api = renderDomain();
    const result = await api.createDeliverable.mutationFn(payload);

    expect(callsFor('sprint_deliverables', 'insert')[0].args).toEqual([payload]);
    expect(callsFor('sprint_deliverables', 'single')).toHaveLength(1);
    expect(result).toEqual({ id: 'deliv-9' });
    expect(rlsMocks.assertCanPerform).not.toHaveBeenCalled();
  });

  it('createDeliverable: propaga erro do insert', async () => {
    const error = new Error('falha ao criar entregável');
    setDbResult('sprint_deliverables', 'insert', { data: null, error });
    const api = renderDomain();
    await expect(api.createDeliverable.mutationFn({} as never)).rejects.toBe(error);
  });

  it('deleteDeliverable: faz precheck, remove anexos e exclui filtrando pelo id', async () => {
    setDbResult('deliverable_attachments', 'select', {
      data: [{ id: 'att-1', file_path: 'path/att-1.pdf' }],
      error: null,
    });
    const api = renderDomain();
    await api.deleteDeliverable.mutationFn('deliv-1');

    // Precheck no entregável e no anexo.
    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith(
      'sprint_deliverables',
      'delete',
      'deliv-1',
    );
    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith(
      'deliverable_attachments',
      'delete',
      'att-1',
    );
    // Busca de anexos filtrada pelo deliverable_id.
    expect(callsFor('deliverable_attachments', 'select')[0].args).toEqual(['id, file_path']);
    expect(callsFor('deliverable_attachments', 'eq')[0].args).toEqual([
      'deliverable_id',
      'deliv-1',
    ]);
    // Remoção do arquivo no storage.
    expect(supabaseMocks.storageFrom).toHaveBeenCalledWith('deliverable-attachments');
    expect(supabaseMocks.storageRemove).toHaveBeenCalledWith(['path/att-1.pdf']);
    // Exclusão dos metadados de anexo e do próprio entregável.
    expect(callsFor('deliverable_attachments', 'delete')).toHaveLength(1);
    expect(callsFor('sprint_deliverables', 'delete')).toHaveLength(1);
    expect(callsFor('sprint_deliverables', 'eq')[0].args).toEqual(['id', 'deliv-1']);
  });

  it('deleteDeliverable: sem anexos, faz apenas o precheck do entregável e exclui pelo id', async () => {
    setDbResult('deliverable_attachments', 'select', { data: [], error: null });
    const api = renderDomain();
    await api.deleteDeliverable.mutationFn('deliv-1');

    expect(rlsMocks.assertCanPerform).toHaveBeenCalledTimes(1);
    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith(
      'sprint_deliverables',
      'delete',
      'deliv-1',
    );
    expect(supabaseMocks.storageRemove).not.toHaveBeenCalled();
    expect(callsFor('deliverable_attachments', 'delete')).toHaveLength(0);
    expect(callsFor('sprint_deliverables', 'delete')).toHaveLength(1);
    expect(callsFor('sprint_deliverables', 'eq')[0].args).toEqual(['id', 'deliv-1']);
  });

  it('deleteDeliverable: propaga erro do precheck sem tocar no Supabase', async () => {
    const error = new Error('bloqueado pelo RLS');
    rlsMocks.assertCanPerform.mockRejectedValueOnce(error);
    const api = renderDomain();
    await expect(api.deleteDeliverable.mutationFn('deliv-1')).rejects.toBe(error);
    expect(callsFor('sprint_deliverables', 'delete')).toHaveLength(0);
  });

  it('importDeliverables: insere o pai e depois o array de subtarefas', async () => {
    setDbResult('sprint_deliverables', 'insert', {
      data: { id: 'parent-1', project_id: 'proj-1', process_id: 'proc-1' },
      error: null,
    });
    const sprint = {
      id: 'sprint-1',
      name: 'Sprint',
      goal: null,
      start_date: '2026-07-01',
      end_date: '2026-07-31',
      status: 'active',
      project_id: null,
    };
    const api = renderDomain();
    await api.importDeliverables.mutationFn({
      sprint,
      profiles: [],
      responsibleMapping: { Ana: 'user-ana' },
      taskGroups: [
        {
          title: 'Grupo 1',
          responsible: 'Ana',
          totalHours: 8,
          minDate: '2026-07-02',
          maxDate: '2026-07-10',
          subtasks: [
            {
              title: 'Sub 1',
              subtaskTitle: 'Sub 1',
              description: 'desc',
              responsible: 'Ana',
              dueDate: '2026-07-05',
              estimatedHours: 4,
              taskCode: 'S1',
            },
          ],
        },
      ] as never,
    });

    const inserts = callsFor('sprint_deliverables', 'insert');
    expect(inserts).toHaveLength(2);
    // 1ª chamada: entregável pai.
    expect(inserts[0].args[0]).toMatchObject({
      sprint_id: 'sprint-1',
      title: 'Grupo 1',
      assigned_to: 'user-ana',
      parent_id: null,
    });
    // 2ª chamada: array de subtarefas vinculadas ao pai.
    expect(Array.isArray(inserts[1].args[0])).toBe(true);
    expect((inserts[1].args[0] as Array<Record<string, unknown>>)[0]).toMatchObject({
      sprint_id: 'sprint-1',
      title: 'Sub 1',
      parent_id: 'parent-1',
      project_id: 'proj-1',
      process_id: 'proc-1',
      task_code: 'S1',
    });
  });

  it('importDeliverables: propaga erro do insert do pai', async () => {
    const error = new Error('falha ao importar');
    setDbResult('sprint_deliverables', 'insert', { data: null, error });
    const sprint = {
      id: 'sprint-1',
      name: 'Sprint',
      goal: null,
      start_date: '2026-07-01',
      end_date: '2026-07-31',
      status: 'active',
      project_id: null,
    };
    const api = renderDomain();
    await expect(
      api.importDeliverables.mutationFn({
        sprint,
        profiles: [],
        responsibleMapping: {},
        taskGroups: [
          { title: 'G', responsible: null, totalHours: 0, minDate: '', maxDate: '', subtasks: [] },
        ] as never,
      }),
    ).rejects.toBe(error);
  });
});

describe('useDomainEquipeSprintDetalhes — escritas em sprint_metrics', () => {
  it('updateMetric: faz precheck e atualiza current_value filtrando pelo id', async () => {
    const api = renderDomain();
    await api.updateMetric.mutationFn({ metricId: 'metric-1', newValue: 42 });

    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('sprint_metrics', 'update', 'metric-1');
    expect(callsFor('sprint_metrics', 'update')[0].args).toEqual([{ current_value: 42 }]);
    expect(callsFor('sprint_metrics', 'eq')[0].args).toEqual(['id', 'metric-1']);
  });

  it('updateMetric: propaga erro do update', async () => {
    const error = new Error('falha ao atualizar métrica');
    setDbResult('sprint_metrics', 'update', { data: null, error });
    const api = renderDomain();
    await expect(
      api.updateMetric.mutationFn({ metricId: 'metric-1', newValue: 1 }),
    ).rejects.toBe(error);
  });
});
