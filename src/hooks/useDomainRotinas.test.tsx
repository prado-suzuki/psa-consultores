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

import { useCreateRoutine, useDomainRotinas } from '@/hooks/useDomainRotinas';
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
      if (['insert', 'update', 'delete', 'upsert'].includes(method)) operation = method;
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
    mutationKey?: readonly unknown[];
    mutationFn: (input: unknown) => Promise<unknown>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
});

describe('useDomainRotinas — queries', () => {
  it('registra as query keys canônicas (team-members e assigned-to por userId)', () => {
    renderHook(() => useDomainRotinas('user-1'));
    expect(queryRegistrations().map((r) => r.queryKey)).toEqual([
      ['domain-rotinas', 'team-members'],
      ['domain-rotinas', 'assigned-to', 'user-1'],
    ]);
  });

  it('desabilita a consulta de rotinas quando não há userId e usa null na key', () => {
    renderHook(() => useDomainRotinas(undefined));
    const [, routines] = queryRegistrations();
    expect(routines.queryKey).toEqual(['domain-rotinas', 'assigned-to', null]);
    expect(routines.enabled).toBe(false);
  });

  it('habilita a consulta de rotinas quando há userId', () => {
    renderHook(() => useDomainRotinas('user-1'));
    expect(queryRegistrations()[1].enabled).toBe(true);
  });

  it('team-members: busca profiles_safe ordenado por first_name', async () => {
    renderHook(() => useDomainRotinas('user-1'));
    await (queryRegistrations()[0].queryFn as () => Promise<unknown>)();

    expect(callsFor('profiles_safe', 'select')[0].args).toEqual(['id, first_name, last_name']);
    expect(callsFor('profiles_safe', 'order')[0].args).toEqual(['first_name']);
  });

  it('rotinas: filtra pelo responsável, exclui concluídas e ordena por created_at desc', async () => {
    renderHook(() => useDomainRotinas('user-1'));
    await (queryRegistrations()[1].queryFn as () => Promise<unknown>)();

    expect(callsFor('routines', 'select')[0].args).toEqual(['*']);
    expect(callsFor('routines', 'eq')[0].args).toEqual(['assigned_to', 'user-1']);
    expect(callsFor('routines', 'neq')[0].args).toEqual(['status', 'completed']);
    expect(callsFor('routines', 'order')[0].args).toEqual(['created_at', { ascending: false }]);
  });

  it('rotinas: retorna [] sem tocar o supabase quando não há userId', async () => {
    renderHook(() => useDomainRotinas(undefined));
    await expect(
      (queryRegistrations()[1].queryFn as () => Promise<unknown>)()
    ).resolves.toEqual([]);
    expect(callsFor('routines', 'select')).toHaveLength(0);
  });

  it('propaga erro da consulta de team-members', async () => {
    setDbResult('profiles_safe', 'select', { data: null, error: new Error('boom') });
    renderHook(() => useDomainRotinas('user-1'));
    await expect(
      (queryRegistrations()[0].queryFn as () => Promise<unknown>)()
    ).rejects.toThrow('boom');
  });
});

describe('useDomainRotinas — mutation create-routine', () => {
  it('insere o payload na tabela routines', async () => {
    const payload = {
      title: 'Rotina',
      description: null,
      is_recurring: true,
      frequency: 'weekly',
      assigned_to: 'user-1',
      estimated_hours: 2,
      status: 'pending',
      created_by: 'user-1',
    };
    renderHook(() => useCreateRoutine());
    await mutationRegistration().mutationFn(payload);

    expect(callsFor('routines', 'insert')[0].args).toEqual([payload]);
  });

  it('propaga erro do insert', async () => {
    setDbResult('routines', 'insert', { data: null, error: new Error('boom') });
    renderHook(() => useCreateRoutine());
    await expect(
      mutationRegistration().mutationFn({ title: 'X' })
    ).rejects.toThrow('boom');
  });
});
