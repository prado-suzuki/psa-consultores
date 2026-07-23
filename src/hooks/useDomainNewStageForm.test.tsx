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

import { useCreateProcessStage, type NewStageFormValues } from '@/hooks/useDomainNewStageForm';
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
    mutationFn: (input: unknown) => Promise<unknown>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
});

describe('useDomainNewStageForm — useCreateProcessStage', () => {
  it('insere a etapa com trims, ordem, arrays vazios e automation_level none→null', async () => {
    const form: NewStageFormValues = {
      name: '  Coleta  ',
      description: '  descrição  ',
      responsible: '  Fulano  ',
      time_current: '  1h  ',
      time_target: '  30min  ',
      frequency: '  diária  ',
      volume: '  10  ',
      automation_level: 'none',
    };
    renderHook(() => useCreateProcessStage());

    await mutationRegistration().mutationFn({ processId: 'proc-1', nextOrder: 3, form });

    expect(callsFor('process_stages', 'insert')[0].args).toEqual([
      {
        process_id: 'proc-1',
        stage_order: 3,
        name: 'Coleta',
        description: 'descrição',
        responsible: 'Fulano',
        time_current: '1h',
        time_target: '30min',
        frequency: 'diária',
        volume: '10',
        automation_level: null,
        inputs: [],
        outputs: [],
        systems: [],
      },
    ]);
  });

  it('converte campos opcionais vazios em null e mantém automation_level preenchido', async () => {
    const form: NewStageFormValues = {
      name: 'Etapa',
      description: '',
      responsible: '',
      time_current: '',
      time_target: '',
      frequency: '',
      volume: '',
      automation_level: 'full',
    };
    renderHook(() => useCreateProcessStage());

    await mutationRegistration().mutationFn({ processId: 'proc-1', nextOrder: 1, form });

    expect(callsFor('process_stages', 'insert')[0].args).toEqual([
      {
        process_id: 'proc-1',
        stage_order: 1,
        name: 'Etapa',
        description: null,
        responsible: null,
        time_current: null,
        time_target: null,
        frequency: null,
        volume: null,
        automation_level: 'full',
        inputs: [],
        outputs: [],
        systems: [],
      },
    ]);
  });

  it('propaga erro do insert', async () => {
    const error = new Error('falha no insert');
    setDbResult('process_stages', 'insert', { data: null, error });
    const form: NewStageFormValues = {
      name: 'Etapa',
      description: '',
      responsible: '',
      time_current: '',
      time_target: '',
      frequency: '',
      volume: '',
      automation_level: 'none',
    };
    renderHook(() => useCreateProcessStage());

    await expect(
      mutationRegistration().mutationFn({ processId: 'proc-1', nextOrder: 1, form })
    ).rejects.toBe(error);
  });
});
