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

import { useDomainDetalheFerramenta } from '@/hooks/useDomainDetalheFerramenta';
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
function mutationRegistrations() {
  return reactQueryMocks.useMutation.mock.calls.map(
    ([o]) => o as { mutationFn: (input: unknown) => Promise<unknown> }
  );
}

const noopOptions = {
  id: 'tool-1',
  onUpdateSuccess: () => undefined,
  onUpdateError: () => undefined,
  onDeleteSuccess: () => undefined,
  onDeleteError: () => undefined,
};

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  rlsMocks.assertCanPerform.mockResolvedValue(undefined);
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
});

describe('useDomainDetalheFerramenta — queries', () => {
  it('registra as query keys canônicas por id', () => {
    renderHook(() => useDomainDetalheFerramenta(noopOptions));
    expect(queryRegistrations().map((r) => r.queryKey)).toEqual([
      ['tool', 'tool-1'],
      ['tool-access', 'tool-1'],
    ]);
  });

  it('tool: seleciona a ferramenta filtrando pelo id', async () => {
    renderHook(() => useDomainDetalheFerramenta(noopOptions));
    await (queryRegistrations()[0].queryFn as () => Promise<unknown>)();
    expect(callsFor('tools', 'select')[0].args).toEqual(['*']);
    expect(callsFor('tools', 'eq')[0].args).toEqual(['id', 'tool-1']);
  });

  it('tool-access: seleciona os acessos filtrando pelo tool_id', async () => {
    renderHook(() => useDomainDetalheFerramenta(noopOptions));
    await (queryRegistrations()[1].queryFn as () => Promise<unknown>)();
    expect(callsFor('tool_area_access', 'select')[0].args).toEqual(['*']);
    expect(callsFor('tool_area_access', 'eq')[0].args).toEqual(['tool_id', 'tool-1']);
  });

  it('propaga erro da consulta da ferramenta', async () => {
    setDbResult('tools', 'select', { data: null, error: new Error('boom-select') });
    renderHook(() => useDomainDetalheFerramenta(noopOptions));
    await expect(
      (queryRegistrations()[0].queryFn as () => Promise<unknown>)()
    ).rejects.toThrow('boom-select');
  });
});

describe('useDomainDetalheFerramenta — mutation updateTool', () => {
  it('faz precheck, atualiza a ferramenta pelo id e recria os acessos', async () => {
    setDbResult('tool_area_access', 'select', { data: { id: 'access-1' }, error: null });
    renderHook(() => useDomainDetalheFerramenta(noopOptions));

    await mutationRegistrations()[0].mutationFn({
      name: 'Nova',
      description: 'Desc',
      status: 'active',
      selectedAreas: ['fiscal'],
      userId: 'user-1',
    });

    // precheck de update na tabela alvo
    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('tools', 'update', 'tool-1');
    // update com payload e filtro por id
    const updateArgs = callsFor('tools', 'update')[0].args[0] as Record<string, unknown>;
    expect(updateArgs).toMatchObject({ name: 'Nova', description: 'Desc', status: 'active' });
    expect(typeof updateArgs.updated_at).toBe('string');
    expect(callsFor('tools', 'eq')[0].args).toEqual(['id', 'tool-1']);
    // precheck do delete em lote (amostra) + delete filtrado por tool_id
    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith(
      'tool_area_access',
      'delete',
      'access-1'
    );
    expect(callsFor('tool_area_access', 'delete')).toHaveLength(1);
    expect(callsFor('tool_area_access', 'eq').map((c) => c.args)).toContainEqual([
      'tool_id',
      'tool-1',
    ]);
    // insere os novos acessos
    expect(callsFor('tool_area_access', 'insert')[0].args).toEqual([
      [{ tool_id: 'tool-1', area: 'fiscal', granted_by: 'user-1' }],
    ]);
  });

  it('propaga erro do update da ferramenta', async () => {
    setDbResult('tools', 'update', { data: null, error: new Error('boom-update') });
    renderHook(() => useDomainDetalheFerramenta(noopOptions));
    await expect(
      mutationRegistrations()[0].mutationFn({
        name: 'x',
        description: 'y',
        status: 'active',
        selectedAreas: [],
        userId: 'user-1',
      })
    ).rejects.toThrow('boom-update');
  });

  it('propaga falha do precheck e não inicia a escrita', async () => {
    const error = new Error('bloqueado pelo RLS');
    rlsMocks.assertCanPerform.mockRejectedValueOnce(error);
    renderHook(() => useDomainDetalheFerramenta(noopOptions));
    await expect(
      mutationRegistrations()[0].mutationFn({
        name: 'x',
        description: 'y',
        status: 'active',
        selectedAreas: [],
        userId: 'user-1',
      })
    ).rejects.toBe(error);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('useDomainDetalheFerramenta — mutation deleteTool', () => {
  it('faz precheck e exclui a ferramenta filtrando pelo id', async () => {
    renderHook(() => useDomainDetalheFerramenta(noopOptions));
    await mutationRegistrations()[1].mutationFn(undefined);
    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('tools', 'delete', 'tool-1');
    expect(callsFor('tools', 'delete')).toHaveLength(1);
    expect(callsFor('tools', 'eq')[0].args).toEqual(['id', 'tool-1']);
  });

  it('propaga erro do delete', async () => {
    setDbResult('tools', 'delete', { data: null, error: new Error('boom-delete') });
    renderHook(() => useDomainDetalheFerramenta(noopOptions));
    await expect(mutationRegistrations()[1].mutationFn(undefined)).rejects.toThrow('boom-delete');
  });
});
