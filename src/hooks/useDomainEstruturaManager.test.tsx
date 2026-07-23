import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { useProfilesMinRole } from '@/hooks/useDomainEstruturaManager';
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
const rpcResults = new Map<string, DbResult>();

function setDbResult(table: string, operation: string, result: DbResult) {
  dbResults.set(`${table}:${operation}`, result);
}
function setRpcResult(fn: string, result: DbResult) {
  rpcResults.set(fn, result);
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

function queryRegistrations() {
  return reactQueryMocks.useQuery.mock.calls.map(([o]) => o as Record<string, unknown>);
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  rpcResults.clear();
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
  vi.mocked(supabase.rpc).mockImplementation(
    ((fn: string) =>
      Promise.resolve(rpcResults.get(fn) ?? { data: [], error: null })) as never
  );
});

describe('useProfilesMinRole — query', () => {
  it('registra a query key canônica incluindo o role mínimo', () => {
    renderHook(() => useProfilesMinRole('lider'));
    expect(queryRegistrations()[0].queryKey).toEqual(['profiles-min-role', 'lider']);
  });

  it('chama o RPC get_profiles_with_min_role com o parâmetro _minimum_role', async () => {
    renderHook(() => useProfilesMinRole('sublider'));
    await (queryRegistrations()[0].queryFn as () => Promise<unknown>)();

    expect(supabase.rpc).toHaveBeenCalledWith('get_profiles_with_min_role', {
      _minimum_role: 'sublider',
    });
  });

  it('retorna os perfis devolvidos pelo RPC', async () => {
    const profiles = [{ id: 'p-1', first_name: 'A', last_name: 'B', email: null }];
    setRpcResult('get_profiles_with_min_role', { data: profiles, error: null });
    renderHook(() => useProfilesMinRole('admin'));

    await expect(
      (queryRegistrations()[0].queryFn as () => Promise<unknown>)()
    ).resolves.toEqual(profiles);
  });

  it('propaga erro do RPC', async () => {
    setRpcResult('get_profiles_with_min_role', { data: null, error: new Error('boom') });
    renderHook(() => useProfilesMinRole('team_member'));

    await expect(
      (queryRegistrations()[0].queryFn as () => Promise<unknown>)()
    ).rejects.toThrow('boom');
  });
});
