import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  keepPreviousData: 'keepPreviousData',
}));

const rlsMocks = vi.hoisted(() => ({
  assertCanPerform: vi.fn<() => Promise<void>>(),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/hooks/useRlsPrecheck', () => rlsMocks);
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import { useDomainEquipeTarefas } from '@/hooks/useDomainEquipeTarefas';
import { supabase } from '@/integrations/supabase/client';

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
      if (['select', 'insert', 'update', 'delete', 'upsert'].includes(method)) operation = method;
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
function mutationRegistration(index: number) {
  return reactQueryMocks.useMutation.mock.calls[index][0] as {
    mutationFn: (input: unknown) => Promise<unknown>;
  };
}

const filtros = { statusFilter: 'all', clusterFilter: 'all', priorityFilter: 'all' };

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  rlsMocks.assertCanPerform.mockResolvedValue(undefined);
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
});

describe('useDomainEquipeTarefas — query', () => {
  it('registra a query key canônica derivada dos filtros', () => {
    renderHook(() => useDomainEquipeTarefas(filtros));
    expect(queryRegistrations()[0].queryKey).toEqual([
      'equipe-tarefas',
      'data',
      'all',
      'all',
      'all',
    ]);
  });

  it('sem filtros ativos: seleciona tasks ordenadas por created_at desc, profiles e sprints ativas', async () => {
    renderHook(() => useDomainEquipeTarefas(filtros));
    await (queryRegistrations()[0].queryFn as () => Promise<unknown>)();

    expect(callsFor('tasks', 'select')[0].args).toEqual(['*']);
    expect(callsFor('tasks', 'order')[0].args).toEqual(['created_at', { ascending: false }]);
    // nenhum filtro aplicado quando tudo é 'all'
    expect(callsFor('tasks', 'eq')).toHaveLength(0);

    expect(callsFor('profiles_safe', 'select')[0].args).toEqual(['id, first_name, last_name']);
    expect(callsFor('sprints', 'eq')[0].args).toEqual(['status', 'active']);
    expect(callsFor('sprints', 'order')[0].args).toEqual(['start_date', { ascending: false }]);
  });

  it('com filtros ativos: aplica eq de status, cluster e priority em tasks', async () => {
    renderHook(() =>
      useDomainEquipeTarefas({
        statusFilter: 'in_progress',
        clusterFilter: 'frontend',
        priorityFilter: 'high',
      }),
    );
    await (queryRegistrations()[0].queryFn as () => Promise<unknown>)();

    expect(callsFor('tasks', 'eq').map((c) => c.args)).toEqual([
      ['status', 'in_progress'],
      ['cluster', 'frontend'],
      ['priority', 'high'],
    ]);
  });
});

describe('useDomainEquipeTarefas — mutations', () => {
  it('updateTask faz precheck, envia payload e filtra pelo id', async () => {
    const payload = { title: 'Nova', status: 'done' };
    renderHook(() => useDomainEquipeTarefas(filtros));
    await mutationRegistration(0).mutationFn({ taskId: 'task-1', payload });

    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('tasks', 'update', 'task-1');
    expect(callsFor('tasks', 'update')[0].args).toEqual([payload]);
    expect(callsFor('tasks', 'eq')[0].args).toEqual(['id', 'task-1']);
  });

  it('deleteTask faz precheck e filtra a exclusão pelo id', async () => {
    renderHook(() => useDomainEquipeTarefas(filtros));
    await mutationRegistration(1).mutationFn('task-1');

    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('tasks', 'delete', 'task-1');
    expect(callsFor('tasks', 'delete')).toHaveLength(1);
    expect(callsFor('tasks', 'eq')[0].args).toEqual(['id', 'task-1']);
  });

  it('propaga erro do update', async () => {
    const error = new Error('boom');
    setDbResult('tasks', 'update', { data: null, error });
    renderHook(() => useDomainEquipeTarefas(filtros));

    await expect(
      mutationRegistration(0).mutationFn({ taskId: 'task-1', payload: { title: 'x' } }),
    ).rejects.toBe(error);
  });

  it('propaga falha do precheck e não inicia a escrita', async () => {
    const error = new Error('bloqueado pelo RLS');
    rlsMocks.assertCanPerform.mockRejectedValueOnce(error);
    renderHook(() => useDomainEquipeTarefas(filtros));

    await expect(mutationRegistration(1).mutationFn('task-1')).rejects.toBe(error);
    expect(callsFor('tasks', 'delete')).toHaveLength(0);
  });
});
