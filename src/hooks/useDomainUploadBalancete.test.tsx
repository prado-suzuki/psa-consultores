import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => {
  const fetchQuery = vi.fn((options: { queryFn: () => Promise<unknown> }) => options.queryFn());
  return {
    useQuery: vi.fn((options: unknown) => options),
    useMutation: vi.fn((options: unknown) => options),
    useQueryClient: vi.fn(() => ({ fetchQuery, invalidateQueries: vi.fn() })),
    __fetchQuery: fetchQuery,
  };
});

const rlsMocks = vi.hoisted(() => ({
  assertCanPerform: vi.fn<() => Promise<void>>(),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/hooks/useRlsPrecheck', () => rlsMocks);
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import { currentAmbiente } from '@/config/api';
import { useDomainUploadBalancete } from '@/hooks/useDomainUploadBalancete';
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

function render(overrides: Partial<Parameters<typeof useDomainUploadBalancete>[0]> = {}) {
  return renderHook(() =>
    useDomainUploadBalancete({
      open: true,
      clienteId: 'cli-1',
      contribuinteId: 'con-1',
      ...overrides,
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  rlsMocks.assertCanPerform.mockResolvedValue(undefined);
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
});

describe('useDomainUploadBalancete — queries', () => {
  it('registra as query keys canônicas', () => {
    render();
    expect(queryRegistrations().map((r) => r.queryKey)).toEqual([
      ['upload-balancete-clientes'],
      ['upload-balancete-contribuintes', 'cli-1'],
    ]);
  });

  it('define enabled por open e clienteId', () => {
    render({ open: false });
    expect(queryRegistrations()[0].enabled).toBe(false);
    expect(queryRegistrations()[1].enabled).toBe(false);

    vi.clearAllMocks();
    dbCalls.length = 0;
    render({ open: true, clienteId: '' });
    expect(queryRegistrations()[0].enabled).toBe(true);
    expect(queryRegistrations()[1].enabled).toBe(false);
  });

  it('clientes: filtra ativo, não excluído e do ambiente atual, ordenado por nome', async () => {
    render();
    await (queryRegistrations()[0].queryFn as () => Promise<unknown>)();

    expect(callsFor('cliente', 'select')[0].args).toEqual(['id, nome']);
    expect(callsFor('cliente', 'eq').map((c) => c.args)).toEqual([
      ['ativo', true],
      ['excluido', false],
      ['ambiente', currentAmbiente],
    ]);
    expect(callsFor('cliente', 'order')[0].args).toEqual(['nome']);
  });

  it('contribuintes: filtra por cliente_id, não excluído e ambiente atual', async () => {
    render();
    await (queryRegistrations()[1].queryFn as () => Promise<unknown>)();

    expect(callsFor('contribuinte', 'select')[0].args).toEqual(['id, nome_razao_social']);
    expect(callsFor('contribuinte', 'eq').map((c) => c.args)).toEqual([
      ['cliente_id', 'cli-1'],
      ['excluido', false],
      ['ambiente', currentAmbiente],
    ]);
    expect(callsFor('contribuinte', 'order')[0].args).toEqual(['nome_razao_social']);
  });

  it('propaga erro da consulta de clientes', async () => {
    const error = new Error('boom');
    setDbResult('cliente', 'select', { data: null, error });
    render();
    await expect(
      (queryRegistrations()[0].queryFn as () => Promise<unknown>)(),
    ).rejects.toBe(error);
  });
});

describe('useDomainUploadBalancete — leitura imperativa de config', () => {
  it('buscarConfig usa fetchQuery com key canônica e filtra por id_contribuinte', async () => {
    const { result } = render();
    await result.current.buscarConfig('con-9');

    expect((reactQueryMocks.__fetchQuery.mock.calls[0][0] as unknown as { queryKey: unknown }).queryKey).toEqual([
      'upload-balancete-config',
      'con-9',
    ]);
    expect(callsFor('contribuinte_bal_config', 'select')[0].args).toEqual([
      'balancete_detalhamento',
    ]);
    expect(callsFor('contribuinte_bal_config', 'eq')[0].args).toEqual([
      'id_contribuinte',
      'con-9',
    ]);
  });
});

describe('useDomainUploadBalancete — mutation salvarDetalhamento', () => {
  it('sem linha existente: não faz precheck e faz upsert com onConflict', async () => {
    setDbResult('contribuinte_bal_config', 'select', { data: null, error: null });
    render();
    await mutationRegistration(0).mutationFn({ contribuinteId: 'con-1', value: true });

    expect(rlsMocks.assertCanPerform).not.toHaveBeenCalled();
    expect(callsFor('contribuinte_bal_config', 'upsert')[0].args).toEqual([
      { id_contribuinte: 'con-1', balancete_detalhamento: true },
      { onConflict: 'id_contribuinte' },
    ]);
  });

  it('com linha existente: faz precheck de update antes do upsert', async () => {
    setDbResult('contribuinte_bal_config', 'select', { data: { id: 'cfg-1' }, error: null });
    render();
    await mutationRegistration(0).mutationFn({ contribuinteId: 'con-1', value: false });

    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith(
      'contribuinte_bal_config',
      'update',
      'cfg-1',
    );
    expect(callsFor('contribuinte_bal_config', 'upsert')[0].args).toEqual([
      { id_contribuinte: 'con-1', balancete_detalhamento: false },
      { onConflict: 'id_contribuinte' },
    ]);
  });

  it('propaga erro do upsert', async () => {
    const error = new Error('boom');
    setDbResult('contribuinte_bal_config', 'select', { data: null, error: null });
    setDbResult('contribuinte_bal_config', 'upsert', { data: null, error });
    render();
    await expect(
      mutationRegistration(0).mutationFn({ contribuinteId: 'con-1', value: true }),
    ).rejects.toBe(error);
  });

  it('propaga falha do precheck e não faz o upsert', async () => {
    const error = new Error('bloqueado pelo RLS');
    setDbResult('contribuinte_bal_config', 'select', { data: { id: 'cfg-1' }, error: null });
    rlsMocks.assertCanPerform.mockRejectedValueOnce(error);
    render();

    await expect(
      mutationRegistration(0).mutationFn({ contribuinteId: 'con-1', value: true }),
    ).rejects.toBe(error);
    expect(callsFor('contribuinte_bal_config', 'upsert')).toHaveLength(0);
  });
});
