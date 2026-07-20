import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import {
  novaTarefaQueryKeys,
  useCriarNovaTarefa,
  useNovaTarefaSprints,
  useNovaTarefasRecentes,
} from '@/hooks/useDomainNovaTarefa';
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
      onRejected
    );
  return chain;
}

function callsFor(table: string, method: string) {
  return dbCalls.filter((c) => c.table === table && c.method === method);
}
function queryRegistrations() {
  return reactQueryMocks.useQuery.mock.calls.map(([o]) => o as Record<string, unknown>);
}
function mutationRegistration() {
  return reactQueryMocks.useMutation.mock.calls[0][0] as {
    mutationKey: readonly unknown[];
    mutationFn: (input: unknown) => Promise<unknown>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
});

describe('useDomainNovaTarefa — queries', () => {
  it('registra as query keys canônicas', () => {
    renderHook(() => {
      useNovaTarefaSprints();
      useNovaTarefasRecentes();
    });
    expect(queryRegistrations().map((r) => r.queryKey)).toEqual([
      novaTarefaQueryKeys.sprints,
      novaTarefaQueryKeys.recentTasks,
    ]);
  });

  it('sprints: seleciona id, name ordenado por start_date desc', async () => {
    renderHook(() => useNovaTarefaSprints());
    await (queryRegistrations()[0].queryFn as () => Promise<unknown>)();
    expect(callsFor('sprints', 'select')[0].args).toEqual(['id, name']);
    expect(callsFor('sprints', 'order')[0].args).toEqual(['start_date', { ascending: false }]);
  });

  it('recentes: seleciona da tabela tasks, ordena por created_at desc e limita a 10', async () => {
    renderHook(() => useNovaTarefasRecentes());
    await (queryRegistrations()[0].queryFn as () => Promise<unknown>)();
    expect(callsFor('tasks', 'select')[0].args).toEqual([
      'id, title, cluster, priority, status, created_at, due_date',
    ]);
    expect(callsFor('tasks', 'order')[0].args).toEqual(['created_at', { ascending: false }]);
    expect(callsFor('tasks', 'limit')[0].args).toEqual([10]);
  });
});

describe('useDomainNovaTarefa — mutation create-task', () => {
  it('registra a mutation key canônica', () => {
    renderHook(() => useCriarNovaTarefa());
    expect(mutationRegistration().mutationKey).toEqual(['equipe', 'nova-tarefa', 'create-task']);
  });

  it('insere o payload na tabela tasks', async () => {
    const payload = { title: 'T', cluster: 'frontend', created_by: 'user-1' };
    renderHook(() => useCriarNovaTarefa());
    await mutationRegistration().mutationFn(payload);
    expect(callsFor('tasks', 'insert')[0].args).toEqual([payload]);
  });

  it('propaga erro do insert', async () => {
    setDbResult('tasks', 'insert', { data: null, error: new Error('boom') });
    renderHook(() => useCriarNovaTarefa());
    await expect(mutationRegistration().mutationFn({ title: 'T' })).rejects.toThrow('boom');
  });
});
