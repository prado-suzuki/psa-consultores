import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

const rlsMocks = vi.hoisted(() => ({
  assertCanPerform: vi.fn<() => Promise<void>>(),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/hooks/useRlsPrecheck', () => rlsMocks);
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import { useUpdateDomainSOPConfig, type UpdateDomainSOPConfigInput } from '@/hooks/useDomainSOPConfig';
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
    'or',
    'order',
    'limit',
    'range',
    'single',
    'maybeSingle',
    'gte',
    'lte',
    'ilike',
    'contains',
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

function mutationRegistration() {
  return reactQueryMocks.useMutation.mock.calls[0][0] as {
    mutationKey: readonly unknown[];
    mutationFn: (input: unknown) => Promise<unknown>;
  };
}

const updates: UpdateDomainSOPConfigInput['updates'] = {
  sop_before_link: 'https://link',
  sop_before_document_path: 'path/a',
  sop_before_content: 'antes',
  sop_link: 'https://sop',
  sop_document_path: 'path/b',
  formatted_content: 'conteúdo',
};

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  rlsMocks.assertCanPerform.mockResolvedValue(undefined);
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
});

describe('useDomainSOPConfig — useUpdateDomainSOPConfig', () => {
  it('registra a mutation key canônica', () => {
    renderHook(() => useUpdateDomainSOPConfig());
    expect(mutationRegistration().mutationKey).toEqual(['domain-sop-config', 'update']);
  });

  it('faz precheck, atualiza processes com os updates e filtra pelo id do processo', async () => {
    renderHook(() => useUpdateDomainSOPConfig());

    await mutationRegistration().mutationFn({ processId: 'proc-1', updates });

    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('processes', 'update', 'proc-1');
    expect(callsFor('processes', 'update')[0].args).toEqual([updates]);
    expect(callsFor('processes', 'eq')[0].args).toEqual(['id', 'proc-1']);
  });

  it('propaga falha do precheck e não inicia a escrita', async () => {
    const error = new Error('bloqueado pelo RLS');
    rlsMocks.assertCanPerform.mockRejectedValueOnce(error);
    renderHook(() => useUpdateDomainSOPConfig());

    await expect(
      mutationRegistration().mutationFn({ processId: 'proc-1', updates })
    ).rejects.toBe(error);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('propaga erro do update', async () => {
    const error = new Error('falha no update');
    setDbResult('processes', 'update', { data: null, error });
    renderHook(() => useUpdateDomainSOPConfig());

    await expect(
      mutationRegistration().mutationFn({ processId: 'proc-1', updates })
    ).rejects.toBe(error);
  });
});
