import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
    // fetchQuery real o suficiente para o escopo de ambiente rodar no teste.
    fetchQuery: vi.fn((options: { queryFn: () => Promise<unknown> }) => options.queryFn()),
  })),
}));

const rlsMocks = vi.hoisted(() => ({
  assertCanPerform: vi.fn<(table: string, op: string, id: string) => Promise<void>>(),
  canPerform: vi.fn(),
}));

const auditMocks = vi.hoisted(() => ({
  logAction: vi.fn<() => Promise<void>>(),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/hooks/useRlsPrecheck', () => rlsMocks);
vi.mock('@/hooks/useAuditLog', () => ({ useAuditLog: () => ({ logAction: auditMocks.logAction }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

import { useMoveOrgTaskToProject, useMoveOrgTasksToProject, useOrgTasks, type OrgTask } from '@/hooks/useOrgTasks';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';

interface DbResult {
  data: unknown;
  error: unknown;
}
interface ChainRecord {
  table: string;
  calls: { method: string; args: unknown[] }[];
}

// Cada `supabase.from(...)` vira um registro; as respostas são consumidas na
// ordem em que o hook aguarda as consultas — é isso que trava a SEQUÊNCIA
// (pré-check antes de escrever, mãe antes das filhas).
const chains: ChainRecord[] = [];
const dbQueue: DbResult[] = [];

function makeChain(table: string) {
  const record: ChainRecord = { table, calls: [] };
  chains.push(record);
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'update', 'eq', 'in', 'or', 'gte', 'lte', 'order', 'single', 'maybeSingle']) {
    chain[method] = vi.fn((...args: unknown[]) => {
      record.calls.push({ method, args });
      return chain;
    });
  }
  chain.then = (onFulfilled: (r: DbResult) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(dbQueue.shift() ?? { data: null, error: null }).then(onFulfilled, onRejected);
  return chain;
}

function moveMutation() {
  const { result } = renderHook(() => useMoveOrgTaskToProject('tax'));
  return result.current as unknown as {
    mutationFn: (input: { taskId: string; targetProjectId: string }) => Promise<unknown>;
  };
}

function bulkMoveMutation() {
  const { result } = renderHook(() => useMoveOrgTasksToProject('tax'));
  return result.current as unknown as {
    mutationFn: (input: { taskIds: string[]; targetProjectId: string }) => Promise<{
      targetName: string;
      movedCount: number;
      movedSubtasks: number;
      skippedCount: number;
      failed: { title: string; message: string }[];
    }>;
  };
}

function chainOf(table: string, method: string) {
  return chains.filter(chain => chain.table === table && chain.calls.some(call => call.method === method));
}

function argsOf(record: ChainRecord, method: string) {
  return record.calls.filter(call => call.method === method).map(call => call.args);
}

const currentTask = {
  id: 'task-1',
  title: 'Apurar ICMS',
  project_id: 'project-1',
  client_id: 'client-1',
  contribuinte_id: 'contrib-1',
  parent_task_id: null as string | null,
};

const targetProject = {
  id: 'project-2',
  name: 'Projeto Beta',
  external_client_id: 'client-1',
  contribuinte_id: 'contrib-1',
};

/** Fila padrão: tarefa, projeto destino, projeto origem, filhas, update mãe. */
function queueMove({
  task = currentTask,
  target = targetProject,
  children = [] as { id: string; title: string; project_id: string | null }[],
} = {}) {
  dbQueue.push({ data: task, error: null });
  dbQueue.push({ data: target, error: null });
  dbQueue.push({ data: { name: 'Projeto Alfa' }, error: null });
  dbQueue.push({ data: children, error: null });
  if (children.length > 0) dbQueue.push({ data: [], error: null });
  dbQueue.push({ data: { id: task.id }, error: null });
  if (children.length > 0) dbQueue.push({ data: null, error: null });
}

beforeEach(() => {
  vi.clearAllMocks();
  chains.length = 0;
  dbQueue.length = 0;
  rlsMocks.assertCanPerform.mockResolvedValue(undefined);
  auditMocks.logAction.mockResolvedValue(undefined);
  vi.mocked(supabase.from).mockImplementation((table: string) => makeChain(table) as never);
});

describe('useMoveOrgTaskToProject', () => {
  it('troca o project_id da tarefa e audita o movimento', async () => {
    queueMove();

    const result = await moveMutation().mutationFn({ taskId: 'task-1', targetProjectId: 'project-2' });

    const updates = chainOf('org_tasks', 'update');
    expect(updates).toHaveLength(1);
    expect(argsOf(updates[0], 'update')[0]).toEqual([{ project_id: 'project-2' }]);
    expect(argsOf(updates[0], 'eq')[0]).toEqual(['id', 'task-1']);
    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('org_tasks', 'update', 'task-1');
    expect(auditMocks.logAction).toHaveBeenCalledTimes(1);
    expect(auditMocks.logAction).toHaveBeenCalledWith(expect.objectContaining({
      area: 'tax',
      entity_type: 'task',
      entity_id: 'task-1',
      entity_name: 'Apurar ICMS',
      action: 'updated',
      changed_fields: { project_id: { old: 'project-1', new: 'project-2' } },
      details: 'Movida do projeto "Projeto Alfa" para "Projeto Beta"',
    }));
    expect(result).toEqual({ targetName: 'Projeto Beta', movedSubtasks: 0 });
  });

  it('leva as subtarefas junto, em uma única atualização', async () => {
    queueMove({ children: [
      { id: 'sub-1', title: 'Coletar notas', project_id: 'project-1' },
      { id: 'sub-2', title: 'Conferir CFOP', project_id: 'project-1' },
    ] });

    const result = await moveMutation().mutationFn({ taskId: 'task-1', targetProjectId: 'project-2' });

    const updates = chainOf('org_tasks', 'update');
    expect(updates).toHaveLength(2);
    expect(argsOf(updates[1], 'update')[0]).toEqual([{ project_id: 'project-2' }]);
    expect(argsOf(updates[1], 'in')[0]).toEqual(['id', ['sub-1', 'sub-2']]);
    // Pré-check em toda a árvore ANTES de qualquer escrita: sem transação no
    // cliente, falhar no meio deixaria mãe e filhas em projetos diferentes.
    expect(rlsMocks.assertCanPerform.mock.calls.map(call => call[2]))
      .toEqual(['task-1', 'sub-1', 'sub-2']);
    expect(auditMocks.logAction).toHaveBeenCalledTimes(3);
    expect(auditMocks.logAction).toHaveBeenCalledWith(expect.objectContaining({
      entity_type: 'subtask',
      entity_id: 'sub-1',
      changed_fields: { project_id: { old: 'project-1', new: 'project-2' } },
    }));
    expect(result).toEqual({ targetName: 'Projeto Beta', movedSubtasks: 2 });
  });

  it('leva cliente e contribuinte do destino quando o cliente muda', async () => {
    queueMove({
      target: { ...targetProject, external_client_id: 'client-2', contribuinte_id: 'contrib-2' },
    });

    await moveMutation().mutationFn({ taskId: 'task-1', targetProjectId: 'project-2' });

    expect(argsOf(chainOf('org_tasks', 'update')[0], 'update')[0]).toEqual([{
      project_id: 'project-2',
      client_id: 'client-2',
      contribuinte_id: 'contrib-2',
    }]);
  });

  it('desvincula da mãe ao mover uma subtarefa e audita como subtask', async () => {
    queueMove({ task: { ...currentTask, parent_task_id: 'task-mae' } });

    await moveMutation().mutationFn({ taskId: 'task-1', targetProjectId: 'project-2' });

    expect(argsOf(chainOf('org_tasks', 'update')[0], 'update')[0]).toEqual([{
      project_id: 'project-2',
      parent_task_id: null,
    }]);
    expect(auditMocks.logAction).toHaveBeenCalledWith(expect.objectContaining({
      entity_type: 'subtask',
      changed_fields: {
        project_id: { old: 'project-1', new: 'project-2' },
        parent_task_id: { old: 'task-mae', new: null },
      },
    }));
  });

  it('recusa mover para o projeto em que a tarefa já está', async () => {
    dbQueue.push({ data: currentTask, error: null });

    await expect(
      moveMutation().mutationFn({ taskId: 'task-1', targetProjectId: 'project-1' }),
    ).rejects.toThrow('A tarefa já está neste projeto.');
    expect(chainOf('org_tasks', 'update')).toHaveLength(0);
  });

  it('não escreve nada quando a RLS barra alguma tarefa da árvore', async () => {
    queueMove({ children: [{ id: 'sub-1', title: 'Coletar notas', project_id: 'project-1' }] });
    rlsMocks.assertCanPerform.mockRejectedValueOnce(new Error('sem permissão'));

    await expect(
      moveMutation().mutationFn({ taskId: 'task-1', targetProjectId: 'project-2' }),
    ).rejects.toThrow('sem permissão');
    expect(chainOf('org_tasks', 'update')).toHaveLength(0);
    expect(auditMocks.logAction).not.toHaveBeenCalled();
  });

  it('avisa quando a mãe foi movida mas as subtarefas não', async () => {
    queueMove({ children: [{ id: 'sub-1', title: 'Coletar notas', project_id: 'project-1' }] });
    // Substitui a resposta do update das filhas por erro.
    dbQueue[dbQueue.length - 1] = { data: null, error: new Error('rls') };

    await expect(
      moveMutation().mutationFn({ taskId: 'task-1', targetProjectId: 'project-2' }),
    ).rejects.toThrow('A tarefa foi movida, mas as subtarefas continuaram em "Projeto Alfa": rls');
  });
});

describe('useMoveOrgTasksToProject (lote)', () => {
  /** Nome do destino (para os toasts) + a cadeia de mães da seleção. */
  function queueBulkHeader(lineage: { id: string; title: string; project_id: string | null; parent_task_id: string | null }[]) {
    dbQueue.push({ data: { id: 'project-2', name: 'Projeto Beta' }, error: null });
    dbQueue.push({ data: lineage, error: null });
  }

  it('move cada tarefa selecionada e agrega o resultado', async () => {
    queueBulkHeader([
      { id: 'task-1', title: 'Apurar ICMS', project_id: 'project-1', parent_task_id: null },
      { id: 'task-2', title: 'Conferir CFOP', project_id: 'project-1', parent_task_id: null },
    ]);
    queueMove({ task: { ...currentTask, id: 'task-1' } });
    queueMove({ task: { ...currentTask, id: 'task-2' } });

    const result = await bulkMoveMutation().mutationFn({
      taskIds: ['task-1', 'task-2'],
      targetProjectId: 'project-2',
    });

    const updates = chainOf('org_tasks', 'update');
    expect(updates).toHaveLength(2);
    expect(argsOf(updates[0], 'eq')[0]).toEqual(['id', 'task-1']);
    expect(argsOf(updates[1], 'eq')[0]).toEqual(['id', 'task-2']);
    expect(result).toEqual({
      targetName: 'Projeto Beta',
      movedCount: 2,
      movedSubtasks: 0,
      skippedCount: 0,
      failed: [],
    });
  });

  it('não move em separado a filha marcada junto com a mãe: ela vai de carona', async () => {
    queueBulkHeader([
      { id: 'mae', title: 'Apurar ICMS', project_id: 'project-1', parent_task_id: null },
      { id: 'filha', title: 'Coletar notas', project_id: 'project-1', parent_task_id: 'mae' },
    ]);
    queueMove({
      task: { ...currentTask, id: 'mae' },
      children: [{ id: 'filha', title: 'Coletar notas', project_id: 'project-1' }],
    });

    const result = await bulkMoveMutation().mutationFn({
      taskIds: ['mae', 'filha'],
      targetProjectId: 'project-2',
    });

    // Movida como raiz (eq id) + filhas em lote (in id) — nunca a filha sozinha,
    // que perderia o vínculo com a mãe (parent_task_id = null).
    const updates = chainOf('org_tasks', 'update');
    expect(updates).toHaveLength(2);
    expect(argsOf(updates[0], 'eq')[0]).toEqual(['id', 'mae']);
    expect(argsOf(updates[1], 'in')[0]).toEqual(['id', ['filha']]);
    expect(result.movedCount).toBe(1);
    expect(result.movedSubtasks).toBe(1);
  });

  it('ignora, sem erro, as que já estão no projeto de destino', async () => {
    queueBulkHeader([
      { id: 'task-1', title: 'Apurar ICMS', project_id: 'project-2', parent_task_id: null },
    ]);

    const result = await bulkMoveMutation().mutationFn({
      taskIds: ['task-1'],
      targetProjectId: 'project-2',
    });

    expect(chainOf('org_tasks', 'update')).toHaveLength(0);
    expect(result).toEqual({
      targetName: 'Projeto Beta',
      movedCount: 0,
      movedSubtasks: 0,
      skippedCount: 1,
      failed: [],
    });
  });

  it('uma falha não derruba as demais e é reportada por tarefa', async () => {
    queueBulkHeader([
      { id: 'task-1', title: 'Apurar ICMS', project_id: 'project-1', parent_task_id: null },
      { id: 'task-2', title: 'Conferir CFOP', project_id: 'project-1', parent_task_id: null },
    ]);
    dbQueue.push({ data: null, error: new Error('rls barrou') });
    queueMove({ task: { ...currentTask, id: 'task-2' } });

    const result = await bulkMoveMutation().mutationFn({
      taskIds: ['task-1', 'task-2'],
      targetProjectId: 'project-2',
    });

    expect(chainOf('org_tasks', 'update')).toHaveLength(1);
    expect(result.movedCount).toBe(1);
    expect(result.failed).toEqual([{ title: 'Apurar ICMS', message: 'rls barrou' }]);
  });
});

const OUTRO_AMBIENTE = currentAmbiente === 'prod' ? 'dev' : 'prod';

/**
 * org_tasks não tem coluna `ambiente`: a tarefa herda o ambiente do cliente dela
 * e do cliente do projeto onde mora (ver lib/ambienteScope). Sem esse corte as
 * visões de Projetos e tarefas misturavam o trabalho de dev e de prod.
 */
describe('useOrgTasks (escopo de ambiente)', () => {
  function queryFnOf() {
    const { result } = renderHook(() => useOrgTasks());
    return (result.current as unknown as { queryFn: () => Promise<OrgTask[]> }).queryFn;
  }

  const tarefa = (patch: Partial<OrgTask>) => ({
    id: 'task-1',
    title: 'Apurar ICMS',
    project_id: 'project-1',
    client_id: null,
    parent_task_id: null,
    reviewer_id: null,
    project: { id: 'project-1', name: 'Projeto Alfa', external_client_id: null },
    ...patch,
  });

  /** Tarefas + a régua de ambiente, na ordem em que o hook aguarda as consultas. */
  function queueTasks(tarefas: unknown[]) {
    dbQueue.push({ data: tarefas, error: null });
    dbQueue.push({
      data: [
        { id: 'client-dev', ambiente: currentAmbiente },
        { id: 'client-fora', ambiente: OUTRO_AMBIENTE },
      ],
      error: null,
    });
  }

  it('descarta a tarefa cujo cliente é de outro ambiente', async () => {
    queueTasks([
      tarefa({ id: 'task-dentro', client_id: 'client-dev' }),
      tarefa({ id: 'task-fora', client_id: 'client-fora' }),
    ]);

    const tasks = await queryFnOf()();

    expect(tasks.map(task => task.id)).toEqual(['task-dentro']);
  });

  it('descarta a tarefa cujo PROJETO é de cliente de outro ambiente', async () => {
    // Se o projeto sai da lista e a tarefa fica, ela viraria órfã na hierarquia.
    queueTasks([
      tarefa({ id: 'task-dentro' }),
      tarefa({ id: 'task-fora', project: { id: 'project-2', name: 'Projeto Beta', external_client_id: 'client-fora' } }),
    ]);

    const tasks = await queryFnOf()();

    expect(tasks.map(task => task.id)).toEqual(['task-dentro']);
  });

  it('mantém tarefa sem cliente e com cliente irresolvível', async () => {
    queueTasks([
      tarefa({ id: 'task-sem-cliente' }),
      tarefa({ id: 'task-cliente-apagado', client_id: 'client-inexistente' }),
    ]);

    const tasks = await queryFnOf()();

    expect(tasks.map(task => task.id)).toEqual(['task-sem-cliente', 'task-cliente-apagado']);
  });
});
