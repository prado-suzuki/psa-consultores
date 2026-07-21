import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
}));

const rlsMocks = vi.hoisted(() => ({
  assertCanPerform: vi.fn<() => Promise<void>>(),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/hooks/useRlsPrecheck', () => rlsMocks);
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import { useDomainGestaoContatos } from '@/hooks/useDomainGestaoContatos';
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
function queryRegistration() {
  return reactQueryMocks.useQuery.mock.calls[0][0] as Record<string, unknown>;
}
function mutationRegistration() {
  return reactQueryMocks.useMutation.mock.calls[0][0] as {
    mutationFn: (input: unknown) => Promise<unknown>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  rlsMocks.assertCanPerform.mockResolvedValue(undefined);
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
});

describe('useDomainGestaoContatos — query', () => {
  it('registra a query key canônica', () => {
    renderHook(() => useDomainGestaoContatos());
    expect(queryRegistration().queryKey).toEqual(['gestao-contatos']);
  });

  it('seleciona contatos ordenados por created_at desc', async () => {
    renderHook(() => useDomainGestaoContatos());
    await (queryRegistration().queryFn as () => Promise<unknown>)();
    expect(callsFor('contatos', 'select')[0].args).toEqual(['*']);
    expect(callsFor('contatos', 'order')[0].args).toEqual(['created_at', { ascending: false }]);
  });

  it('propaga erro do select', async () => {
    setDbResult('contatos', 'select', { data: null, error: new Error('boom') });
    renderHook(() => useDomainGestaoContatos());
    await expect((queryRegistration().queryFn as () => Promise<unknown>)()).rejects.toThrow('boom');
  });
});

describe('useDomainGestaoContatos — mutation update', () => {
  it('faz precheck, atualiza status/notas/updated_at e filtra pelo id', async () => {
    renderHook(() => useDomainGestaoContatos());
    await mutationRegistration().mutationFn({
      id: 'ct1',
      status: 'atendido',
      notasInternas: 'ok',
    });
    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('contatos', 'update', 'ct1');
    expect(callsFor('contatos', 'update')[0].args).toEqual([
      {
        status: 'atendido',
        notas_internas: 'ok',
        updated_at: expect.any(String),
      },
    ]);
    expect(callsFor('contatos', 'eq')[0].args).toEqual(['id', 'ct1']);
  });

  it('propaga erro do update', async () => {
    setDbResult('contatos', 'update', { data: null, error: new Error('falha') });
    renderHook(() => useDomainGestaoContatos());
    await expect(
      mutationRegistration().mutationFn({ id: 'ct1', status: 's', notasInternas: 'n' }),
    ).rejects.toThrow('falha');
  });

  it('propaga falha do precheck e não inicia a escrita', async () => {
    const error = new Error('bloqueado pelo RLS');
    rlsMocks.assertCanPerform.mockRejectedValueOnce(error);
    renderHook(() => useDomainGestaoContatos());
    await expect(
      mutationRegistration().mutationFn({ id: 'ct1', status: 's', notasInternas: 'n' }),
    ).rejects.toBe(error);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
