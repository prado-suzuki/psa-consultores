import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  keepPreviousData: Symbol('keepPreviousData'),
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(() => ({
    getQueryData: vi.fn(() => undefined),
    invalidateQueries: vi.fn(),
  })),
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
  useDomainSprintMutations,
  useDomainSprints,
} from '@/hooks/useDomainSprints';
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
    'range',
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

function queryRegistration() {
  return reactQueryMocks.useQuery.mock.calls[0][0] as Record<string, unknown>;
}

function mutationRegistration(action: string) {
  const options = reactQueryMocks.useMutation.mock.calls
    .map(([o]) => o as { mutationKey: readonly unknown[]; mutationFn: (i: unknown) => Promise<unknown> })
    .find((o) => o.mutationKey[1] === action);
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

describe('useDomainSprints — query agregada', () => {
  it('registra a query key com o filtro de projeto e usa keepPreviousData', () => {
    renderHook(() => useDomainSprints('project-1'));
    const registration = queryRegistration();
    expect(registration.queryKey).toEqual(['domain-sprints', 'project-1']);
    expect(registration.placeholderData).toBe(reactQueryMocks.keepPreviousData);
  });

  it('registra a query key sem filtro (null) quando não há projeto selecionado', () => {
    renderHook(() => useDomainSprints(null));
    expect(queryRegistration().queryKey).toEqual(['domain-sprints', null]);
  });

  it('aplica os filtros/ordenações críticos de projetos, clusters e sprints sem filtro de projeto', async () => {
    renderHook(() => useDomainSprints(null));
    await (queryRegistration().queryFn as () => Promise<unknown>)();

    expect(callsFor('projects', 'select')[0].args).toEqual(['id, name, cluster_id']);
    expect(callsFor('projects', 'order')[0].args).toEqual(['name']);

    expect(callsFor('estrutura_clusters', 'select')[0].args).toEqual(['id, name']);
    expect(callsFor('estrutura_clusters', 'eq')[0].args).toEqual(['is_active', true]);
    expect(callsFor('estrutura_clusters', 'order')[0].args).toEqual(['name']);

    expect(callsFor('sprints', 'select')[0].args).toEqual(['*']);
    expect(callsFor('sprints', 'order')[0].args).toEqual(['name', { ascending: true }]);
    // Sem filtro de projeto não há .eq('project_id', ...).
    expect(callsFor('sprints', 'eq')).toHaveLength(0);
  });

  it('filtra sprints pelo project_id quando há projeto selecionado', async () => {
    setDbResult('sprints', 'select', {
      data: [{ id: 'sprint-1' }],
      error: null,
    });
    renderHook(() => useDomainSprints('project-1'));
    await (queryRegistration().queryFn as () => Promise<unknown>)();

    expect(callsFor('sprints', 'eq')[0].args).toEqual(['project_id', 'project-1']);
  });

  it('lê os agregados da view sprint_resumo, sem tocar em entregáveis nem melhorias', async () => {
    setDbResult('sprints', 'select', {
      data: [{ id: 'sprint-1' }],
      error: null,
    });
    setDbResult('sprint_resumo', 'select', {
      data: [
        {
          sprint_id: 'sprint-1',
          // `numeric` do Postgres chega como string no PostgREST.
          horas_alocadas: '12.5',
          custo_economizado_mensal: '100',
          horas_liberadas: '10',
          melhorias: 2,
        },
      ],
      error: null,
    });
    renderHook(() => useDomainSprints(null));
    const data = (await (queryRegistration().queryFn as () => Promise<unknown>)()) as {
      resumoPorSprint: Record<string, unknown>;
    };

    expect(callsFor('sprint_resumo', 'select')[0].args).toEqual([
      'sprint_id, horas_alocadas, custo_economizado_mensal, horas_liberadas, melhorias',
    ]);
    expect(data.resumoPorSprint['sprint-1']).toEqual({
      horasAlocadas: 12.5,
      custoEconomizadoMensal: 100,
      horasLiberadas: 10,
      melhorias: 2,
    });

    // A tela lista sprints, não tarefas: baixar o backlog inteiro aqui era o
    // gargalo que a view removeu.
    expect(callsFor('sprint_deliverables', 'select')).toHaveLength(0);
    expect(callsFor('process_improvements', 'select')).toHaveLength(0);
    expect(callsFor('profiles_safe', 'select')).toHaveLength(0);
  });

  it('mantém a lista de pé quando a view de resumo falha', async () => {
    setDbResult('sprints', 'select', { data: [{ id: 'sprint-1' }], error: null });
    setDbResult('sprint_resumo', 'select', {
      data: null,
      error: new Error('relation "sprint_resumo" does not exist'),
    });
    renderHook(() => useDomainSprints(null));
    const data = (await (queryRegistration().queryFn as () => Promise<unknown>)()) as {
      sprints: unknown[];
      resumoPorSprint: Record<string, unknown>;
    };

    expect(data.sprints).toEqual([{ id: 'sprint-1' }]);
    expect(data.resumoPorSprint).toEqual({});
  });
});

describe('useDomainSprintMutations — mutation keys', () => {
  it('registra as mutation keys canônicas do domínio sprints', () => {
    renderHook(() => useDomainSprintMutations());
    const keys = reactQueryMocks.useMutation.mock.calls.map(([o]) => (o as { mutationKey: unknown }).mutationKey);
    expect(keys).toEqual([
      ['domain-sprints', 'create'],
      ['domain-sprints', 'update'],
      ['domain-sprints', 'delete'],
      ['domain-sprints', 'update-status'],
    ]);
  });
});

describe('useDomainSprintMutations — escritas', () => {
  it('createSprint: insere o payload na tabela sprints sem precheck', async () => {
    const payload = {
      name: 'Sprint',
      goal: null,
      start_date: '2026-07-01',
      end_date: '2026-07-31',
      project_id: null,
      status: 'planned',
      created_by: 'user-1',
    };
    renderHook(() => useDomainSprintMutations());
    await mutationRegistration('create').mutationFn(payload);

    expect(callsFor('sprints', 'insert')[0].args).toEqual([payload]);
    expect(rlsMocks.assertCanPerform).not.toHaveBeenCalled();
  });

  it('createSprint: propaga erro do insert', async () => {
    const error = new Error('falha ao criar sprint');
    setDbResult('sprints', 'insert', { data: null, error });
    renderHook(() => useDomainSprintMutations());
    await expect(mutationRegistration('create').mutationFn({} as never)).rejects.toBe(error);
  });

  it('updateSprint: faz precheck, envia payload sem o id e filtra pelo id', async () => {
    renderHook(() => useDomainSprintMutations());
    await mutationRegistration('update').mutationFn({
      id: 'sprint-1',
      name: 'Sprint atualizada',
      goal: 'Meta',
      start_date: '2026-07-01',
      end_date: '2026-07-31',
      project_id: 'project-1',
      status: 'active',
    });

    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('sprints', 'update', 'sprint-1');
    expect(callsFor('sprints', 'update')[0].args).toEqual([
      {
        name: 'Sprint atualizada',
        goal: 'Meta',
        start_date: '2026-07-01',
        end_date: '2026-07-31',
        project_id: 'project-1',
        status: 'active',
      },
    ]);
    expect(callsFor('sprints', 'eq')[0].args).toEqual(['id', 'sprint-1']);
  });

  it('updateSprint: propaga erro do update', async () => {
    const error = new Error('falha ao atualizar sprint');
    setDbResult('sprints', 'update', { data: null, error });
    renderHook(() => useDomainSprintMutations());
    await expect(
      mutationRegistration('update').mutationFn({ id: 'sprint-1' } as never),
    ).rejects.toBe(error);
  });

  it('updateSprint: propaga falha do precheck sem tocar no Supabase', async () => {
    const error = new Error('bloqueado pelo RLS');
    rlsMocks.assertCanPerform.mockRejectedValueOnce(error);
    renderHook(() => useDomainSprintMutations());
    await expect(
      mutationRegistration('update').mutationFn({ id: 'sprint-1' } as never),
    ).rejects.toBe(error);
    expect(callsFor('sprints', 'update')).toHaveLength(0);
  });

  it('deleteSprint: faz precheck e exclui filtrando pelo id', async () => {
    renderHook(() => useDomainSprintMutations());
    await mutationRegistration('delete').mutationFn('sprint-1');

    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('sprints', 'delete', 'sprint-1');
    expect(callsFor('sprints', 'delete')).toHaveLength(1);
    expect(callsFor('sprints', 'eq')[0].args).toEqual(['id', 'sprint-1']);
  });

  it('deleteSprint: propaga erro do delete', async () => {
    const error = new Error('falha ao excluir sprint');
    setDbResult('sprints', 'delete', { data: null, error });
    renderHook(() => useDomainSprintMutations());
    await expect(mutationRegistration('delete').mutationFn('sprint-1')).rejects.toBe(error);
  });

  it('updateSprintStatus: faz precheck e atualiza só status filtrando pelo id', async () => {
    renderHook(() => useDomainSprintMutations());
    await mutationRegistration('update-status').mutationFn({
      sprintId: 'sprint-1',
      status: 'completed',
    });

    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('sprints', 'update', 'sprint-1');
    expect(callsFor('sprints', 'update')[0].args).toEqual([{ status: 'completed' }]);
    expect(callsFor('sprints', 'eq')[0].args).toEqual(['id', 'sprint-1']);
  });
});
