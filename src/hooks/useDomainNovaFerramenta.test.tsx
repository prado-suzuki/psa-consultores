import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import { useDomainNovaFerramenta } from '@/hooks/useDomainNovaFerramenta';
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
    mutationFn: (input: unknown) => Promise<unknown>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
});

describe('useDomainNovaFerramenta — mutation create-tool', () => {
  it('insere a ferramenta com status development e retorna o registro criado', async () => {
    // insert().select().single() → o resultado destrinchado vem da última operação (select)
    setDbResult('tools', 'select', { data: { id: 'tool-1' }, error: null });
    renderHook(() => useDomainNovaFerramenta({ onSuccess: () => undefined, onError: () => undefined }));

    const tool = await mutationRegistration().mutationFn({
      name: 'Nova',
      description: 'Desc',
      selectedAreas: [],
      userId: 'user-1',
    });

    expect(callsFor('tools', 'insert')[0].args).toEqual([
      { name: 'Nova', description: 'Desc', status: 'development', created_by: 'user-1' },
    ]);
    expect(tool).toEqual({ id: 'tool-1' });
  });

  it('insere os acessos de área quando há áreas selecionadas', async () => {
    setDbResult('tools', 'select', { data: { id: 'tool-9' }, error: null });
    renderHook(() => useDomainNovaFerramenta({ onSuccess: () => undefined, onError: () => undefined }));

    await mutationRegistration().mutationFn({
      name: 'Nova',
      description: 'Desc',
      selectedAreas: ['fiscal', 'contabil'],
      userId: 'user-1',
    });

    expect(callsFor('tool_area_access', 'insert')[0].args).toEqual([
      [
        { tool_id: 'tool-9', area: 'fiscal', granted_by: 'user-1' },
        { tool_id: 'tool-9', area: 'contabil', granted_by: 'user-1' },
      ],
    ]);
  });

  it('não insere acessos quando não há áreas selecionadas', async () => {
    setDbResult('tools', 'select', { data: { id: 'tool-1' }, error: null });
    renderHook(() => useDomainNovaFerramenta({ onSuccess: () => undefined, onError: () => undefined }));

    await mutationRegistration().mutationFn({
      name: 'Nova',
      description: 'Desc',
      selectedAreas: [],
      userId: 'user-1',
    });

    expect(callsFor('tool_area_access', 'insert')).toHaveLength(0);
  });

  it('propaga erro do insert da ferramenta', async () => {
    setDbResult('tools', 'select', { data: null, error: new Error('boom') });
    renderHook(() => useDomainNovaFerramenta({ onSuccess: () => undefined, onError: () => undefined }));

    await expect(
      mutationRegistration().mutationFn({
        name: 'Nova',
        description: 'Desc',
        selectedAreas: [],
        userId: 'user-1',
      })
    ).rejects.toThrow('boom');
  });
});
