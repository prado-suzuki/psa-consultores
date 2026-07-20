import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useMutation: vi.fn((options: unknown) => options),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import { useRegistrarDecisaoMetas } from '@/hooks/useDomainDesempenhoDecisoes';
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
function mutationRegistration() {
  return reactQueryMocks.useMutation.mock.calls[0][0] as {
    mutationKey: readonly unknown[];
    mutationFn: (input: unknown) => Promise<unknown>;
  };
}

const input = {
  cicloId: 'ciclo-1',
  responsavelId: 'resp-1',
  decisao: 'promover' as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
});

describe('useDomainDesempenhoDecisoes — mutation registrar-decisao-metas', () => {
  it('registra a mutation key canônica', () => {
    renderHook(() => useRegistrarDecisaoMetas());
    expect(mutationRegistration().mutationKey).toEqual([
      'desempenho-decisoes',
      'registrar-decisao-metas',
    ]);
  });

  it('seleciona as metas individuais do ciclo e do responsável', async () => {
    renderHook(() => useRegistrarDecisaoMetas());
    await mutationRegistration().mutationFn(input);
    expect(callsFor('metas', 'select')[0].args).toEqual(['id']);
    // os três filtros do select devem preceder qualquer filtro de update
    expect(callsFor('metas', 'eq').slice(0, 3).map((c) => c.args)).toEqual([
      ['ciclo_id', 'ciclo-1'],
      ['responsavel_id', 'resp-1'],
      ['nivel', 'individual'],
    ]);
  });

  it('atualiza a recomendação de cada meta filtrando pelo id', async () => {
    setDbResult('metas', 'select', { data: [{ id: 'm1' }, { id: 'm2' }], error: null });
    renderHook(() => useRegistrarDecisaoMetas());
    await mutationRegistration().mutationFn(input);

    expect(callsFor('metas', 'update').map((c) => c.args)).toEqual([
      [{ recomendacao_decisao: 'promover' }],
      [{ recomendacao_decisao: 'promover' }],
    ]);
    // cada update é filtrado pelo id da meta correspondente
    expect(callsFor('metas', 'eq').slice(3).map((c) => c.args)).toEqual([
      ['id', 'm1'],
      ['id', 'm2'],
    ]);
  });

  it('é best-effort: erro no select não interrompe a confirmação nem dispara updates', async () => {
    setDbResult('metas', 'select', { data: null, error: new Error('falha ignorada') });
    renderHook(() => useRegistrarDecisaoMetas());

    await expect(mutationRegistration().mutationFn(input)).resolves.toBeUndefined();
    expect(callsFor('metas', 'update')).toHaveLength(0);
  });
});
