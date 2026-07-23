import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
}));

const rlsMocks = vi.hoisted(() => ({
  assertCanPerform: vi.fn<() => Promise<void>>(),
}));

const functionsInvoke = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/hooks/useRlsPrecheck', () => rlsMocks);
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), functions: { invoke: functionsInvoke } },
}));

import { useDomainProcessImprovement } from '@/hooks/useDomainProcessImprovement';
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
function mutationRegistration(action: string) {
  const options = reactQueryMocks.useMutation.mock.calls
    .map(([o]) => o as { mutationKey: readonly unknown[]; mutationFn: (i: unknown) => Promise<unknown> })
    .find((o) => o.mutationKey[1] === action);
  if (!options) throw new Error(`Mutation ${action} não registrada no teste`);
  return options;
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  rlsMocks.assertCanPerform.mockResolvedValue(undefined);
  functionsInvoke.mockResolvedValue({ data: null, error: null });
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
});

describe('useDomainProcessImprovement — query job-roles', () => {
  it('registra a query key canônica, habilita por open e aplica a política offline-first', () => {
    renderHook(() => useDomainProcessImprovement(true));
    const reg = queryRegistrations()[0];
    expect(reg.queryKey).toEqual(['domain-process-improvement', 'job-roles']);
    expect(reg.enabled).toBe(true);
    expect(reg.staleTime).toBe(0);
    expect(reg.gcTime).toBe(0);
    expect(reg.retry).toBe(false);
  });

  it('desabilita a query quando o modal está fechado', () => {
    renderHook(() => useDomainProcessImprovement(false));
    expect(queryRegistrations()[0].enabled).toBe(false);
  });

  it('filtra apenas cargos ativos e ordena por categoria e valor/hora', async () => {
    renderHook(() => useDomainProcessImprovement(true));
    await (queryRegistrations()[0].queryFn as () => Promise<unknown>)();
    expect(callsFor('job_roles', 'select')[0].args).toEqual(['*']);
    expect(callsFor('job_roles', 'eq')[0].args).toEqual(['is_active', true]);
    expect(callsFor('job_roles', 'order').map((c) => c.args)).toEqual([
      ['category', { ascending: true }],
      ['hourly_rate', { ascending: true }],
    ]);
  });
});

describe('useDomainProcessImprovement — mutations', () => {
  it('registra todas as mutation keys canônicas', () => {
    renderHook(() => useDomainProcessImprovement(true));
    const keys = reactQueryMocks.useMutation.mock.calls.map(([o]) => (o as { mutationKey: unknown }).mutationKey);
    expect(keys).toEqual([
      ['domain-process-improvement', 'create-improvement'],
      ['domain-process-improvement', 'create-savings-details'],
      ['domain-process-improvement', 'create-team-members'],
      ['domain-process-improvement', 'calculate-roi'],
      ['domain-process-improvement', 'update-process'],
    ]);
  });

  it('create-improvement insere o payload em process_improvements', async () => {
    const payload = { process_id: 'p1', title: 'Melhoria' } as never;
    renderHook(() => useDomainProcessImprovement(true));
    await mutationRegistration('create-improvement').mutationFn(payload);
    expect(callsFor('process_improvements', 'insert')[0].args).toEqual([payload]);
  });

  it('create-savings-details insere o array em improvement_savings_details', async () => {
    const payload = [{ improvement_id: 'i1', label: 'x' }] as never;
    renderHook(() => useDomainProcessImprovement(true));
    await mutationRegistration('create-savings-details').mutationFn(payload);
    expect(callsFor('improvement_savings_details', 'insert')[0].args).toEqual([payload]);
  });

  it('create-team-members insere o array em improvement_team_members', async () => {
    const payload = [{ improvement_id: 'i1', job_role_id: 'r1' }] as never;
    renderHook(() => useDomainProcessImprovement(true));
    await mutationRegistration('create-team-members').mutationFn(payload);
    expect(callsFor('improvement_team_members', 'insert')[0].args).toEqual([payload]);
  });

  it('calculate-roi invoca a edge function com o improvement_id', async () => {
    renderHook(() => useDomainProcessImprovement(true));
    await mutationRegistration('calculate-roi').mutationFn('improvement-1');
    expect(functionsInvoke).toHaveBeenCalledWith('calculate-process-roi', {
      body: { improvement_id: 'improvement-1' },
    });
  });

  it('update-process faz precheck, atualiza o processo e filtra pelo id', async () => {
    const payload = { stage: 'done' } as never;
    renderHook(() => useDomainProcessImprovement(true));
    await mutationRegistration('update-process').mutationFn({ processId: 'proc-1', payload });
    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('processes', 'update', 'proc-1');
    expect(callsFor('processes', 'update')[0].args).toEqual([payload]);
    expect(callsFor('processes', 'eq')[0].args).toEqual(['id', 'proc-1']);
  });

  it('update-process propaga falha do precheck e não inicia a escrita', async () => {
    const error = new Error('bloqueado pelo RLS');
    rlsMocks.assertCanPerform.mockRejectedValueOnce(error);
    renderHook(() => useDomainProcessImprovement(true));
    await expect(
      mutationRegistration('update-process').mutationFn({
        processId: 'proc-1',
        payload: { stage: 'done' } as never,
      })
    ).rejects.toBe(error);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
