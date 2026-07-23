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

import { useDeleteProcessStage, useUpdateProcessStage } from '@/hooks/useDomainStageEdit';
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

function mutationRegistrations() {
  return reactQueryMocks.useMutation.mock.calls.map(
    ([o]) => o as { mutationFn: (input: unknown) => Promise<unknown> }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
});

describe('useDomainStageEdit — useUpdateProcessStage', () => {
  it('atualiza process_stages com o payload e filtra pelo id da etapa', async () => {
    const payload = {
      name: 'Etapa revisada',
      description: 'nova descrição',
      responsible: 'Fulano',
      time_current: '1h',
      time_target: '30min',
      frequency: 'diária',
      volume: '10',
      automation_level: 'partial',
    };
    renderHook(() => useUpdateProcessStage());

    await mutationRegistrations()[0].mutationFn({ stageId: 'stage-1', payload });

    expect(callsFor('process_stages', 'update')[0].args).toEqual([payload]);
    expect(callsFor('process_stages', 'eq')[0].args).toEqual(['id', 'stage-1']);
  });

  it('propaga erro do update', async () => {
    const error = new Error('falha no update');
    setDbResult('process_stages', 'update', { data: null, error });
    renderHook(() => useUpdateProcessStage());

    await expect(
      mutationRegistrations()[0].mutationFn({ stageId: 'stage-1', payload: {} })
    ).rejects.toBe(error);
  });
});

describe('useDomainStageEdit — useDeleteProcessStage', () => {
  it('exclui a etapa filtrando pelo id', async () => {
    renderHook(() => useDeleteProcessStage());

    await mutationRegistrations()[0].mutationFn('stage-1');

    expect(callsFor('process_stages', 'delete')).toHaveLength(1);
    expect(callsFor('process_stages', 'eq')[0].args).toEqual(['id', 'stage-1']);
  });

  it('propaga erro do delete', async () => {
    const error = new Error('falha no delete');
    setDbResult('process_stages', 'delete', { data: null, error });
    renderHook(() => useDeleteProcessStage());

    await expect(mutationRegistrations()[0].mutationFn('stage-1')).rejects.toBe(error);
  });
});
