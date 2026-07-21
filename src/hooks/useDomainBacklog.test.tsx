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
  domainBacklogQueryKeys,
  useCreateDomainBacklogDeliverable,
  useCreateDomainBacklogItem,
  useDeleteDomainBacklogItem,
  useDomainBacklog,
  useMoveDomainBacklogItem,
  useUpdateDomainBacklogItem,
} from '@/hooks/useDomainBacklog';
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
      if (['insert', 'update', 'delete', 'upsert'].includes(method)) operation = method;
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
function mutationRegistration() {
  return reactQueryMocks.useMutation.mock.calls[0][0] as {
    mutationKey: readonly unknown[];
    mutationFn: (input: unknown) => Promise<unknown>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  rlsMocks.assertCanPerform.mockResolvedValue(undefined);
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
});

describe('useDomainBacklog — query', () => {
  it('registra a query key canônica', () => {
    renderHook(() => useDomainBacklog());
    expect(queryRegistrations()[0].queryKey).toEqual(domainBacklogQueryKeys.data);
  });

  it('busca backlog filtrando sem sprint e excluindo os já movidos, ordenado', async () => {
    renderHook(() => useDomainBacklog());
    await (queryRegistrations()[0].queryFn as () => Promise<unknown>)();

    expect(callsFor('sprint_backlog_items', 'select')[0].args).toEqual(['*']);
    expect(callsFor('sprint_backlog_items', 'is')[0].args).toEqual(['sprint_id', null]);
    expect(callsFor('sprint_backlog_items', 'neq')[0].args).toEqual(['status', 'moved_to_sprint']);
    expect(callsFor('sprint_backlog_items', 'order').map((c) => c.args)).toEqual([
      ['priority', { ascending: true }],
      ['created_at', { ascending: false }],
    ]);
  });

  it('busca sprints ativos/planejamento e demais catálogos', async () => {
    renderHook(() => useDomainBacklog());
    await (queryRegistrations()[0].queryFn as () => Promise<unknown>)();

    expect(callsFor('sprints', 'in')[0].args).toEqual(['status', ['active', 'planned']]);
    expect(callsFor('profiles_safe', 'select')[0].args).toEqual(['id, first_name, last_name']);
    expect(callsFor('projects', 'select')[0].args).toEqual(['id, name']);
    expect(callsFor('processes', 'select')[0].args).toEqual(['id, name, project_id']);
    expect(callsFor('project_processes', 'select')[0].args).toEqual(['process_id, project_id']);
  });

  it('propaga erro da consulta do backlog', async () => {
    setDbResult('sprint_backlog_items', 'select', { data: null, error: new Error('boom') });
    renderHook(() => useDomainBacklog());
    await expect(
      (queryRegistrations()[0].queryFn as () => Promise<unknown>)()
    ).rejects.toThrow('boom');
  });
});

describe('useDomainBacklog — mutation create-item', () => {
  it('registra a mutation key canônica', () => {
    renderHook(() => useCreateDomainBacklogItem());
    expect(mutationRegistration().mutationKey).toEqual(['domain-backlog', 'create-item']);
  });

  it('insere o payload em sprint_backlog_items sem precheck', async () => {
    const payload = { title: 'Item', priority: 'high', project_id: 'p-1' };
    renderHook(() => useCreateDomainBacklogItem());
    await mutationRegistration().mutationFn(payload);

    expect(callsFor('sprint_backlog_items', 'insert')[0].args).toEqual([payload]);
    expect(rlsMocks.assertCanPerform).not.toHaveBeenCalled();
  });

  it('propaga erro do insert', async () => {
    // a cadeia termina em .insert().select().single(); a operação de escrita é insert
    setDbResult('sprint_backlog_items', 'insert', { data: null, error: new Error('boom') });
    renderHook(() => useCreateDomainBacklogItem());
    await expect(mutationRegistration().mutationFn({ title: 'X' })).rejects.toThrow('boom');
  });
});

describe('useDomainBacklog — mutation update-item', () => {
  it('registra a mutation key canônica', () => {
    renderHook(() => useUpdateDomainBacklogItem());
    expect(mutationRegistration().mutationKey).toEqual(['domain-backlog', 'update-item']);
  });

  it('faz precheck, atualiza e filtra pelo id', async () => {
    const payload = { title: 'Atualizado', priority: 'low' };
    renderHook(() => useUpdateDomainBacklogItem());
    await mutationRegistration().mutationFn({ itemId: 'item-1', payload });

    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith(
      'sprint_backlog_items',
      'update',
      'item-1'
    );
    expect(callsFor('sprint_backlog_items', 'update')[0].args).toEqual([payload]);
    expect(callsFor('sprint_backlog_items', 'eq')[0].args).toEqual(['id', 'item-1']);
  });

  it('propaga erro do update', async () => {
    setDbResult('sprint_backlog_items', 'update', { data: null, error: new Error('boom') });
    renderHook(() => useUpdateDomainBacklogItem());
    await expect(
      mutationRegistration().mutationFn({ itemId: 'item-1', payload: {} })
    ).rejects.toThrow('boom');
  });

  it('propaga falha do precheck e não inicia a escrita', async () => {
    const error = new Error('bloqueado pelo RLS');
    rlsMocks.assertCanPerform.mockRejectedValueOnce(error);
    renderHook(() => useUpdateDomainBacklogItem());
    await expect(
      mutationRegistration().mutationFn({ itemId: 'item-1', payload: {} })
    ).rejects.toBe(error);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('useDomainBacklog — mutation delete-item', () => {
  it('registra a mutation key canônica', () => {
    renderHook(() => useDeleteDomainBacklogItem());
    expect(mutationRegistration().mutationKey).toEqual(['domain-backlog', 'delete-item']);
  });

  it('faz precheck e filtra a exclusão pelo id', async () => {
    renderHook(() => useDeleteDomainBacklogItem());
    await mutationRegistration().mutationFn('item-1');

    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith(
      'sprint_backlog_items',
      'delete',
      'item-1'
    );
    expect(callsFor('sprint_backlog_items', 'delete')).toHaveLength(1);
    expect(callsFor('sprint_backlog_items', 'eq')[0].args).toEqual(['id', 'item-1']);
  });

  it('propaga erro do delete', async () => {
    setDbResult('sprint_backlog_items', 'delete', { data: null, error: new Error('boom') });
    renderHook(() => useDeleteDomainBacklogItem());
    await expect(mutationRegistration().mutationFn('item-1')).rejects.toThrow('boom');
  });
});

describe('useDomainBacklog — mutation create-deliverable', () => {
  it('registra a mutation key canônica', () => {
    renderHook(() => useCreateDomainBacklogDeliverable());
    expect(mutationRegistration().mutationKey).toEqual(['domain-backlog', 'create-deliverable']);
  });

  it('insere o entregável em sprint_deliverables sem precheck', async () => {
    const payload = { sprint_id: 's-1', title: 'Entrega', due_date: '2026-01-01' };
    renderHook(() => useCreateDomainBacklogDeliverable());
    await mutationRegistration().mutationFn(payload);

    expect(callsFor('sprint_deliverables', 'insert')[0].args).toEqual([payload]);
    expect(rlsMocks.assertCanPerform).not.toHaveBeenCalled();
  });

  it('propaga erro do insert', async () => {
    setDbResult('sprint_deliverables', 'insert', { data: null, error: new Error('boom') });
    renderHook(() => useCreateDomainBacklogDeliverable());
    await expect(
      mutationRegistration().mutationFn({ sprint_id: 's-1', title: 'X' })
    ).rejects.toThrow('boom');
  });
});

describe('useDomainBacklog — mutation move-item', () => {
  it('registra a mutation key canônica', () => {
    renderHook(() => useMoveDomainBacklogItem());
    expect(mutationRegistration().mutationKey).toEqual(['domain-backlog', 'move-item']);
  });

  it('faz precheck de update, aplica o payload de movimentação e filtra pelo id', async () => {
    const payload = {
      status: 'moved_to_sprint',
      moved_to_deliverable_id: 'd-1',
      sprint_id: 's-1',
    };
    renderHook(() => useMoveDomainBacklogItem());
    await mutationRegistration().mutationFn({ itemId: 'item-1', payload });

    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith(
      'sprint_backlog_items',
      'update',
      'item-1'
    );
    expect(callsFor('sprint_backlog_items', 'update')[0].args).toEqual([payload]);
    expect(callsFor('sprint_backlog_items', 'eq')[0].args).toEqual(['id', 'item-1']);
  });

  it('propaga erro do update', async () => {
    setDbResult('sprint_backlog_items', 'update', { data: null, error: new Error('boom') });
    renderHook(() => useMoveDomainBacklogItem());
    await expect(
      mutationRegistration().mutationFn({ itemId: 'item-1', payload: {} })
    ).rejects.toThrow('boom');
  });
});
