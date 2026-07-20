import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => {
  const fetchQuery = vi.fn((options: { queryFn: () => Promise<unknown> }) => options.queryFn());
  return {
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

import { useDomainGerenciarDados } from '@/hooks/useDomainGerenciarDados';
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
function mutationRegistration(action: string) {
  const options = reactQueryMocks.useMutation.mock.calls
    .map(([o]) => o as { mutationKey: readonly unknown[]; mutationFn: (i: unknown) => Promise<unknown> })
    .find((o) => o.mutationKey[1] === action);
  if (!options) throw new Error(`Mutation ${action} não registrada`);
  return options;
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  rlsMocks.assertCanPerform.mockResolvedValue(undefined);
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
});

describe('useDomainGerenciarDados — mutation keys', () => {
  it('registra as mutation keys canônicas', () => {
    renderHook(() => useDomainGerenciarDados());
    const keys = reactQueryMocks.useMutation.mock.calls.map(
      ([o]) => (o as { mutationKey: readonly unknown[] }).mutationKey,
    );
    expect(keys).toEqual([
      ['gerenciar-dados', 'importar-clientes'],
      ['gerenciar-dados', 'importar-contribuintes'],
      ['gerenciar-dados', 'limpar-tabela'],
    ]);
  });
});

describe('useDomainGerenciarDados — leitura imperativa', () => {
  it('buscarClientesExistentes usa fetchQuery com key canônica e filtra por ambiente', async () => {
    const { result } = renderHook(() => useDomainGerenciarDados());
    await result.current.buscarClientesExistentes('dev');

    expect((reactQueryMocks.__fetchQuery.mock.calls[0][0] as unknown as { queryKey: unknown }).queryKey).toEqual([
      'gerenciar-dados',
      'clientes-existentes',
      'dev',
    ]);
    expect(callsFor('cliente', 'select')[0].args).toEqual(['id, nome']);
    expect(callsFor('cliente', 'eq')[0].args).toEqual(['ambiente', 'dev']);
  });
});

describe('useDomainGerenciarDados — mutations de importação', () => {
  it('importar-clientes insere o array na tabela cliente', async () => {
    const payload = [{ nome: 'A' }, { nome: 'B' }];
    renderHook(() => useDomainGerenciarDados());
    await mutationRegistration('importar-clientes').mutationFn(payload);

    expect(callsFor('cliente', 'insert')[0].args).toEqual([payload]);
    expect(rlsMocks.assertCanPerform).not.toHaveBeenCalled();
  });

  it('importar-contribuintes insere o array na tabela contribuinte', async () => {
    const payload = [{ nome_razao_social: 'X' }];
    renderHook(() => useDomainGerenciarDados());
    await mutationRegistration('importar-contribuintes').mutationFn(payload);

    expect(callsFor('contribuinte', 'insert')[0].args).toEqual([payload]);
  });

  it('propaga erro do insert de clientes', async () => {
    const error = new Error('boom');
    setDbResult('cliente', 'insert', { data: null, error });
    renderHook(() => useDomainGerenciarDados());
    await expect(
      mutationRegistration('importar-clientes').mutationFn([{ nome: 'A' }]),
    ).rejects.toBe(error);
  });
});

describe('useDomainGerenciarDados — limpar tabela', () => {
  it('limpar contribuinte: deleta só a tabela pelo ambiente, sem tocar em cliente', async () => {
    renderHook(() => useDomainGerenciarDados());
    await mutationRegistration('limpar-tabela').mutationFn({
      selectedTable: 'contribuinte',
      selectedAmbiente: 'dev',
    });

    expect(callsFor('contribuinte', 'delete')).toHaveLength(1);
    expect(callsFor('contribuinte', 'eq')[0].args).toEqual(['ambiente', 'dev']);
    expect(callsFor('cliente', 'delete')).toHaveLength(0);
  });

  it('limpar cliente: precheck em amostra de contribuinte, deleta contribuinte e depois cliente pelo ambiente', async () => {
    setDbResult('contribuinte', 'select', { data: { id: 'c-1' }, error: null });
    renderHook(() => useDomainGerenciarDados());
    await mutationRegistration('limpar-tabela').mutationFn({
      selectedTable: 'cliente',
      selectedAmbiente: 'prod',
    });

    // amostra de contribuinte pelo ambiente
    expect((reactQueryMocks.__fetchQuery.mock.calls[0][0] as unknown as { queryKey: unknown }).queryKey).toEqual([
      'gerenciar-dados',
      'amostra-contribuinte',
      'prod',
    ]);
    expect(callsFor('contribuinte', 'eq')[0].args).toEqual(['ambiente', 'prod']);
    expect(callsFor('contribuinte', 'limit')[0].args).toEqual([1]);

    // precheck com o id amostrado
    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('contribuinte', 'delete', 'c-1');

    // deleta contribuinte (FK) e depois cliente, ambos filtrando por ambiente
    expect(callsFor('contribuinte', 'delete')).toHaveLength(1);
    expect(callsFor('cliente', 'delete')).toHaveLength(1);
    expect(callsFor('cliente', 'eq')[0].args).toEqual(['ambiente', 'prod']);
  });

  it('limpar cliente sem amostra: não roda precheck mas ainda deleta pelo ambiente', async () => {
    setDbResult('contribuinte', 'select', { data: null, error: null });
    renderHook(() => useDomainGerenciarDados());
    await mutationRegistration('limpar-tabela').mutationFn({
      selectedTable: 'cliente',
      selectedAmbiente: 'dev',
    });

    expect(rlsMocks.assertCanPerform).not.toHaveBeenCalled();
    expect(callsFor('contribuinte', 'delete')).toHaveLength(1);
    expect(callsFor('cliente', 'delete')).toHaveLength(1);
  });

  it('propaga erro do delete de contribuinte no fluxo de limpar cliente', async () => {
    const error = new Error('fk');
    setDbResult('contribuinte', 'delete', { data: null, error });
    renderHook(() => useDomainGerenciarDados());
    await expect(
      mutationRegistration('limpar-tabela').mutationFn({
        selectedTable: 'cliente',
        selectedAmbiente: 'dev',
      }),
    ).rejects.toBe(error);
    expect(callsFor('cliente', 'delete')).toHaveLength(0);
  });
});
