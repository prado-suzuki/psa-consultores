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

import {
  controleAcessosQueryKeys,
  useControleAcessosCadastros,
  useControleAcessosCatalogMutations,
  useControleAcessosEstruturaAreas,
} from '@/hooks/useDomainControleAcessos';
import { supabase } from '@/integrations/supabase/client';

interface DbResult {
  data: unknown;
  error: unknown;
  count?: number;
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
function mutationRegistration(action: string) {
  const options = reactQueryMocks.useMutation.mock.calls
    .map(([registration]) => registration as { mutationKey: readonly unknown[]; mutationFn: (input: unknown) => Promise<unknown> })
    .find((registration) => registration.mutationKey[2] === action);
  if (!options) throw new Error(`Mutation ${action} não registrada no teste`);
  return options;
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  rlsMocks.assertCanPerform.mockResolvedValue(undefined);
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
});

describe('useDomainControleAcessos — queries', () => {
  it('registra as query keys canônicas exportadas', () => {
    renderHook(() => {
      useControleAcessosEstruturaAreas();
      useControleAcessosCadastros();
    });
    expect(queryRegistrations().map((r) => r.queryKey)).toEqual([
      controleAcessosQueryKeys.estruturaAreas,
      controleAcessosQueryKeys.cadastros,
    ]);
  });

  it('cadastros: fica desabilitada (enabled false) e sem retry', () => {
    renderHook(() => useControleAcessosCadastros());
    const [cadastros] = queryRegistrations();
    expect(cadastros.enabled).toBe(false);
    expect(cadastros.retry).toBe(false);
  });

  it('estrutura-areas: seleciona id, name, color, color_index filtrando is_active=true ordenado por name', async () => {
    renderHook(() => useControleAcessosEstruturaAreas());
    await (queryRegistrations()[0].queryFn as () => Promise<unknown>)();
    // `color_index` entra no select porque e ele que a tela le: `color` virou
    // override e esta nulo em todas as linhas. Ver src/lib/corDaArea.ts.
    expect(callsFor('estrutura_areas', 'select')[0].args).toEqual(['id, name, color, color_index']);
    expect(callsFor('estrutura_areas', 'eq')[0].args).toEqual(['is_active', true]);
    expect(callsFor('estrutura_areas', 'order')[0].args).toEqual(['name']);
  });

  it('cadastros: seleciona catalog_clients, conta projects/processes e monta stats', async () => {
    setDbResult('catalog_clients', 'select', {
      data: [{ id: 'c1' }, { id: 'c2' }],
      error: null,
    });
    setDbResult('projects', 'select', { data: null, error: null, count: 7 });
    setDbResult('processes', 'select', { data: null, error: null, count: 3 });

    renderHook(() => useControleAcessosCadastros());
    const result = (await (queryRegistrations()[0].queryFn as () => Promise<unknown>)()) as {
      areas: unknown[];
      stats: { clients: number; projects: number; processes: number };
    };

    expect(callsFor('catalog_clients', 'select')[0].args).toEqual(['*']);
    expect(callsFor('catalog_clients', 'order')[0].args).toEqual(['name']);
    expect(callsFor('projects', 'select')[0].args).toEqual(['id', { count: 'exact', head: true }]);
    expect(callsFor('processes', 'select')[0].args).toEqual(['id', { count: 'exact', head: true }]);
    expect(result.areas).toHaveLength(2);
    expect(result.stats).toEqual({ clients: 2, projects: 7, processes: 3 });
  });

  it('propaga erro do select de catalog_clients', async () => {
    setDbResult('catalog_clients', 'select', { data: null, error: new Error('boom') });
    renderHook(() => useControleAcessosCadastros());
    await expect(
      (queryRegistrations()[0].queryFn as () => Promise<unknown>)(),
    ).rejects.toThrow('boom');
  });
});

describe('useDomainControleAcessos — mutations catalog', () => {
  it('registra as mutation keys canônicas', () => {
    renderHook(() => useControleAcessosCatalogMutations());
    const keys = reactQueryMocks.useMutation.mock.calls.map(([o]) => (o as { mutationKey: unknown }).mutationKey);
    expect(keys).toEqual([
      ['controle-acessos', 'catalog-clients', 'create'],
      ['controle-acessos', 'catalog-clients', 'update'],
      ['controle-acessos', 'catalog-clients', 'toggle'],
      ['controle-acessos', 'catalog-clients', 'delete'],
    ]);
  });

  it('create: insere o payload em catalog_clients sem precheck', async () => {
    const payload = {
      name: 'Área',
      responsible: null,
      description: null,
      color: '#fff',
      estrutura_area_id: null,
    };
    renderHook(() => useControleAcessosCatalogMutations());
    await mutationRegistration('create').mutationFn(payload);
    expect(callsFor('catalog_clients', 'insert')[0].args).toEqual([payload]);
    expect(rlsMocks.assertCanPerform).not.toHaveBeenCalled();
  });

  it('update: faz precheck, envia payload e filtra pelo id', async () => {
    const payload = {
      name: 'Nova',
      responsible: 'Ana',
      description: 'd',
      color: '#000',
      estrutura_area_id: 'e1',
    };
    renderHook(() => useControleAcessosCatalogMutations());
    await mutationRegistration('update').mutationFn({ id: 'c1', payload });
    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('catalog_clients', 'update', 'c1');
    expect(callsFor('catalog_clients', 'update')[0].args).toEqual([payload]);
    expect(callsFor('catalog_clients', 'eq')[0].args).toEqual(['id', 'c1']);
  });

  it('toggle: faz precheck e inverte is_active filtrando pelo id', async () => {
    renderHook(() => useControleAcessosCatalogMutations());
    await mutationRegistration('toggle').mutationFn({ id: 'c1', isActive: true });
    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('catalog_clients', 'update', 'c1');
    expect(callsFor('catalog_clients', 'update')[0].args).toEqual([{ is_active: false }]);
    expect(callsFor('catalog_clients', 'eq')[0].args).toEqual(['id', 'c1']);
  });

  it('delete: faz precheck e filtra a exclusão pelo id', async () => {
    renderHook(() => useControleAcessosCatalogMutations());
    await mutationRegistration('delete').mutationFn('c1');
    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('catalog_clients', 'delete', 'c1');
    expect(callsFor('catalog_clients', 'delete')).toHaveLength(1);
    expect(callsFor('catalog_clients', 'eq')[0].args).toEqual(['id', 'c1']);
  });

  it('propaga erro do insert no create', async () => {
    setDbResult('catalog_clients', 'insert', { data: null, error: new Error('falha ao criar') });
    renderHook(() => useControleAcessosCatalogMutations());
    await expect(mutationRegistration('create').mutationFn({})).rejects.toThrow('falha ao criar');
  });

  it('propaga falha do precheck e não inicia a escrita no update', async () => {
    const error = new Error('bloqueado pelo RLS');
    rlsMocks.assertCanPerform.mockRejectedValueOnce(error);
    renderHook(() => useControleAcessosCatalogMutations());
    await expect(
      mutationRegistration('update').mutationFn({ id: 'c1', payload: {} }),
    ).rejects.toBe(error);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
