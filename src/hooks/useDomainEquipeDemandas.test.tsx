import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  setQueryData: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: queryMocks.useQuery,
  useMutation: queryMocks.useMutation,
  useQueryClient: () => ({ setQueryData: queryMocks.setQueryData }),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

import {
  equipeDemandasQueryKeys,
  useEquipeDemandasQuery,
} from '@/hooks/useDomainEquipeDemandasQueries';
import {
  useEquipeDemandaItemMutations,
  useEquipeDemandaParentMutations,
} from '@/hooks/useDomainEquipeDemandasMutations';
import { supabase } from '@/integrations/supabase/client';

interface Registration {
  queryKey?: readonly unknown[];
  mutationKey?: readonly unknown[];
  queryFn?: () => Promise<Record<string, unknown>>;
  mutationFn?: (input: never) => Promise<unknown>;
  [key: string]: unknown;
}
interface DbResult {
  data: unknown;
  error: unknown;
}
interface DbCall {
  table: string;
  method: string;
  args: unknown[];
}
const calls: DbCall[] = [];
const results = new Map<string, DbResult>();

function chainFor(table: string) {
  let operation = 'select';
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'order']) {
    chain[method] = vi.fn((...args: unknown[]) => {
      calls.push({ table, method, args });
      if (['select', 'insert', 'update', 'delete'].includes(method)) operation = method;
      return chain;
    });
  }
  chain.then = (resolve: (value: DbResult) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(results.get(`${table}:${operation}`) ?? { data: [], error: null }).then(
      resolve,
      reject,
    );
  return chain;
}

function queryRegistration() {
  const registration = queryMocks.useQuery.mock.calls.at(-1)?.[0] as Registration | undefined;
  if (!registration?.queryFn) throw new Error('Query não registrada');
  return registration as Registration & { queryFn: () => Promise<Record<string, unknown>> };
}

function mutation(action: string) {
  const registration = queryMocks.useMutation.mock.calls
    .map(([value]) => value as Registration)
    .find(({ mutationKey }) => mutationKey?.[1] === action);
  if (!registration?.mutationFn) throw new Error(`Mutation ${action} não registrada`);
  return registration as Registration & { mutationFn: (input: never) => Promise<unknown> };
}

function callsFor(table: string, method: string) {
  return calls.filter((call) => call.table === table && call.method === method);
}

const handlers = {
  onTeamMembers: vi.fn(),
  onDemandas: vi.fn(),
  onDemandItems: vi.fn(),
  onComplete: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  results.clear();
  vi.mocked(supabase.from).mockImplementation((table: string) => chainFor(table) as never);
});

describe('query agregada de demandas', () => {
  it('registra key exata e todas as opções de atualização imperativa', () => {
    renderHook(() => useEquipeDemandasQuery('user-1', handlers));
    const registration = queryRegistration();
    expect(registration.queryKey).toEqual(['domain-equipe-demandas', 'aggregate', 'user-1']);
    expect(equipeDemandasQueryKeys.aggregate(undefined)).toEqual([
      'domain-equipe-demandas',
      'aggregate',
      null,
    ]);
    expect(registration).toMatchObject({
      staleTime: 0,
      gcTime: 0,
      retry: false,
      networkMode: 'always',
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });
  });

  it('consulta sequencialmente, usa selects/filtros exatos e publica caches parciais', async () => {
    const members = [{ id: 'm1', first_name: 'Ana', last_name: 'Silva' }];
    const demands = [
      { id: 'd1', title: 'Demanda' },
      { id: 'd2', title: 'Outra' },
    ];
    const items = [
      { id: 'i1', demand_id: 'd2', title: 'Filha 2' },
      { id: 'i2', demand_id: 'd1', title: 'Filha 1' },
    ];
    results.set('profiles_safe:select', { data: members, error: null });
    results.set('routines:select', { data: demands, error: null });
    results.set('demand_items:select', { data: items, error: null });
    renderHook(() => useEquipeDemandasQuery('user-1', handlers));

    const completed = await queryRegistration().queryFn();

    expect(
      calls
        .map(({ table }) => table)
        .filter((table, index, all) => index === 0 || table !== all[index - 1]),
    ).toEqual(['profiles_safe', 'routines', 'demand_items']);
    expect(callsFor('profiles_safe', 'select')[0].args).toEqual(['id, first_name, last_name']);
    expect(callsFor('profiles_safe', 'order')[0].args).toEqual(['first_name']);
    expect(callsFor('routines', 'select')[0].args).toEqual(['*']);
    expect(callsFor('routines', 'order')[0].args).toEqual(['created_at', { ascending: false }]);
    expect(callsFor('demand_items', 'select')[0].args).toEqual(['*']);
    expect(callsFor('demand_items', 'in')[0].args).toEqual(['demand_id', ['d1', 'd2']]);
    expect(callsFor('demand_items', 'order')[0].args).toEqual(['due_date', { ascending: true }]);

    expect(queryMocks.setQueryData).toHaveBeenCalledTimes(3);
    const publications = queryMocks.setQueryData.mock.calls.map(
      ([, value]) => value as Record<string, unknown>,
    );
    expect(publications[0]).toMatchObject({ completed: false, teamMembers: members });
    expect(publications[0]).not.toHaveProperty('demandas');
    expect(publications[1]).toMatchObject({
      completed: false,
      teamMembers: members,
      demandas: demands,
    });
    expect(publications[1]).not.toHaveProperty('demandItems');
    expect(publications[2]).toMatchObject({
      completed: false,
      demandItems: { d2: [items[0]], d1: [items[1]] },
    });
    expect(completed).toMatchObject({ completed: true, demandas: demands });
    expect(completed.completionVersion).toEqual(expect.any(Number));
  });

  it('não consulta nem publica demandItems quando a lista de pais está vazia, preservando itens stale', async () => {
    results.set('profiles_safe:select', { data: [], error: null });
    results.set('routines:select', { data: [], error: null });
    renderHook(() => useEquipeDemandasQuery('user-1', handlers));

    const result = await queryRegistration().queryFn();

    expect(callsFor('demand_items', 'select')).toHaveLength(0);
    expect(queryMocks.setQueryData).toHaveBeenCalledTimes(2);
    expect(result).not.toHaveProperty('demandItems');
  });

  it('engole rejeição, registra o erro e completa com a última publicação parcial', async () => {
    const error = new Error('falha de rede');
    vi.mocked(supabase.from).mockImplementationOnce(() => {
      throw error;
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderHook(() => useEquipeDemandasQuery('user-1', handlers));

    await expect(queryRegistration().queryFn()).resolves.toMatchObject({ completed: true });
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching data:', error);
    expect(queryMocks.setQueryData).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('ignora campos error retornados pelas três consultas', async () => {
    const ignored = new Error('erro não inspecionado');
    results.set('profiles_safe:select', { data: null, error: ignored });
    results.set('routines:select', { data: [{ id: 'd1' }], error: ignored });
    results.set('demand_items:select', { data: null, error: ignored });
    renderHook(() => useEquipeDemandasQuery('user-1', handlers));
    await expect(queryRegistration().queryFn()).resolves.toMatchObject({
      completed: true,
      teamMembers: [],
      demandas: [{ id: 'd1' }],
      demandItems: {},
    });
  });
});

describe('sete mutations CUD de demandas', () => {
  beforeEach(() => {
    renderHook(() => {
      useEquipeDemandaParentMutations('user-1');
      useEquipeDemandaItemMutations('user-1');
    });
  });

  it('registra keys exatas, sem precheck, com retry false e network always', () => {
    const registrations = queryMocks.useMutation.mock.calls.map(([value]) => value as Registration);
    expect(registrations.map(({ mutationKey }) => mutationKey)).toEqual([
      ['domain-equipe-demandas', 'create-routine', 'user-1'],
      ['domain-equipe-demandas', 'update-routine', 'user-1'],
      ['domain-equipe-demandas', 'delete-routine', 'user-1'],
      ['domain-equipe-demandas', 'update-routine-status', 'user-1'],
      ['domain-equipe-demandas', 'create-item', 'user-1'],
      ['domain-equipe-demandas', 'update-item-status', 'user-1'],
      ['domain-equipe-demandas', 'delete-item', 'user-1'],
    ]);
    expect(
      registrations.every(({ retry, networkMode }) => retry === false && networkMode === 'always'),
    ).toBe(true);
  });

  it('envia os sete payloads e filtros exatamente, sem leituras prévias', async () => {
    const routine = {
      title: 'Pai',
      description: null,
      is_recurring: false,
      frequency: null,
      start_date: null,
      due_date: '2026-07-31',
      assigned_to: null,
      estimated_hours: 3,
      status: 'pending',
      created_by: undefined,
    };
    const update = { ...routine };
    delete (update as Partial<typeof routine>).status;
    delete (update as Partial<typeof routine>).created_by;
    const item = { demand_id: 'd1', title: 'Filha', due_date: '2026-07-20', status: 'pending' };

    await mutation('create-routine').mutationFn(routine as never);
    await mutation('update-routine').mutationFn({ id: 'd1', payload: update } as never);
    await mutation('delete-routine').mutationFn('d1' as never);
    await mutation('update-routine-status').mutationFn({ id: 'd1', status: 'done' } as never);
    await mutation('create-item').mutationFn(item as never);
    await mutation('update-item-status').mutationFn({ id: 'i1', status: 'done' } as never);
    await mutation('delete-item').mutationFn('i1' as never);

    expect(callsFor('routines', 'insert')[0].args).toEqual([routine]);
    expect(callsFor('routines', 'update').map(({ args }) => args)).toEqual([
      [update],
      [{ status: 'done' }],
    ]);
    expect(callsFor('routines', 'delete')).toHaveLength(1);
    expect(callsFor('routines', 'eq').map(({ args }) => args)).toEqual([
      ['id', 'd1'],
      ['id', 'd1'],
      ['id', 'd1'],
    ]);
    expect(callsFor('demand_items', 'insert')[0].args).toEqual([item]);
    expect(callsFor('demand_items', 'update')[0].args).toEqual([{ status: 'done' }]);
    expect(callsFor('demand_items', 'delete')).toHaveLength(1);
    expect(callsFor('demand_items', 'eq').map(({ args }) => args)).toEqual([
      ['id', 'i1'],
      ['id', 'i1'],
    ]);
    expect(calls.filter(({ method }) => method === 'select')).toHaveLength(0);
  });

  it.each(['create-routine', 'update-routine', 'delete-routine', 'create-item'])(
    '%s propaga exatamente o error inspecionado',
    async (action) => {
      const table = action === 'create-item' ? 'demand_items' : 'routines';
      const operation = action.startsWith('create')
        ? 'insert'
        : action.startsWith('update')
          ? 'update'
          : 'delete';
      const error = new Error(`falha ${action}`);
      results.set(`${table}:${operation}`, { data: null, error });
      const input =
        action === 'create-routine'
          ? {}
          : action === 'update-routine'
            ? { id: 'd1', payload: {} }
            : action === 'delete-routine'
              ? 'd1'
              : {};
      await expect(mutation(action).mutationFn(input as never)).rejects.toBe(error);
    },
  );

  it.each([
    ['update-routine-status', 'routines', 'update', { id: 'd1', status: 'done' }],
    ['update-item-status', 'demand_items', 'update', { id: 'i1', status: 'done' }],
    ['delete-item', 'demand_items', 'delete', 'i1'],
  ])('%s ignora o campo error retornado', async (action, table, operation, input) => {
    results.set(`${table}:${operation}`, { data: null, error: new Error('ignorado') });
    await expect(mutation(action).mutationFn(input as never)).resolves.toBeUndefined();
  });
});
