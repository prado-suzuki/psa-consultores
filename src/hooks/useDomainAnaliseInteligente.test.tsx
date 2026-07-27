import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnaliseInteligenteFilters } from '@/lib/analiseInteligente';

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn((options: unknown) => options),
  refetch: vi.fn(),
  removeChannel: vi.fn(),
  invoke: vi.fn(),
  channel: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
}));

interface Call {
  table: string;
  method: string;
  args: unknown[];
}

interface QueryOptions {
  queryKey: readonly unknown[];
  queryFn: () => Promise<unknown>;
  staleTime: number;
  gcTime: number;
  retry: boolean;
  networkMode: string;
  refetchOnMount: string;
  refetchOnWindowFocus: boolean;
  refetchOnReconnect: boolean;
}

interface MutationOptions {
  mutationKey: readonly unknown[];
  retry: boolean;
  mutationFn: (filters: AnaliseInteligenteFilters) => Promise<unknown>;
}

const calls: Call[] = [];
const results = new Map<string, { data: unknown; error: unknown }>();
const realtimeHandlers: Array<() => void> = [];
const channelObject = {
  on: vi.fn(),
  subscribe: vi.fn(),
};

function chainFor(table: string) {
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'order', 'limit', 'eq', 'range']) {
    chain[method] = vi.fn((...args: unknown[]) => {
      calls.push({ table, method, args });
      return chain;
    });
  }
  chain.then = (resolve: (result: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve(results.get(table) ?? { data: [], error: null }).then(resolve);
  return chain;
}

const supabaseMock = {
  from: mocks.from,
  channel: mocks.channel,
  removeChannel: mocks.removeChannel,
  functions: { invoke: mocks.invoke },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mocks.from,
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
    functions: { invoke: mocks.invoke },
  },
}));

import { useDomainAnaliseInteligenteAnalysis } from '@/hooks/useDomainAnaliseInteligenteAnalysis';
import { useDomainAnaliseInteligenteData } from '@/hooks/useDomainAnaliseInteligenteData';

function queryOptions(): QueryOptions {
  const options = mocks.useQuery.mock.calls.at(-1)?.[0] as QueryOptions | undefined;
  if (!options) throw new Error('query não registrada');
  return options;
}

function mutationOptions(): MutationOptions {
  const options = mocks.useMutation.mock.calls.at(-1)?.[0] as MutationOptions | undefined;
  if (!options) throw new Error('mutation não registrada');
  return options;
}

function callsFor(table: string, method: string) {
  return calls
    .filter((call) => call.table === table && call.method === method)
    .map(({ args }) => args);
}

const filters: AnaliseInteligenteFilters = {
  startDate: '2026-07-01',
  endDate: '2026-07-31',
  sprintFilter: 's1',
  projectFilter: '__ALL__',
  processFilter: 'p1',
  clusterFilter: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  results.clear();
  realtimeHandlers.length = 0;
  mocks.from.mockImplementation((table: string) => chainFor(table));
  mocks.useQuery.mockImplementation((options: unknown) => ({
    data: undefined,
    isFetching: true,
    error: null,
    refetch: mocks.refetch,
    options,
  }));
  channelObject.on.mockImplementation((_type: string, _filter: unknown, callback: () => void) => {
    realtimeHandlers.push(callback);
    return channelObject;
  });
  channelObject.subscribe.mockReturnValue(channelObject);
  mocks.channel.mockReturnValue(channelObject);
});

describe('useDomainAnaliseInteligenteData', () => {
  it('registra a query com key e opções exatas e expõe o fallback vazio', () => {
    const { result } = renderHook(() => useDomainAnaliseInteligenteData());

    expect(queryOptions()).toMatchObject({
      queryKey: ['domain-analise-inteligente', 'aggregate-data'],
      staleTime: 0,
      gcTime: 0,
      retry: false,
      networkMode: 'always',
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });
    expect(result.current).toEqual({
      data: {
        sprints: [],
        projects: [],
        processes: [],
        deliverables: [],
        dailys: [],
        improvements: [],
      },
      isFetching: true,
      error: null,
    });
  });

  it('faz exatamente seis leituras com projeções, ordenações, limite e filtro esperados', async () => {
    renderHook(() => useDomainAnaliseInteligenteData());
    await queryOptions().queryFn();

    expect(supabaseMock.from.mock.calls.map(([table]) => table)).toEqual([
      'sprints',
      'projects',
      'processes',
      'sprint_deliverables',
      'daily_standups',
      'process_improvements',
    ]);
    expect(callsFor('sprints', 'select')).toEqual([
      ['id, name, project_id, start_date, end_date, status'],
    ]);
    expect(callsFor('sprints', 'order')).toEqual([['start_date', { ascending: false }]]);
    expect(callsFor('projects', 'select')).toEqual([['id, name, cluster_id']]);
    expect(callsFor('projects', 'order')).toEqual([['name']]);
    expect(callsFor('processes', 'select')).toEqual([['id, name, area, project_id']]);
    expect(callsFor('processes', 'order')).toEqual([['name']]);
    // Entregáveis vêm paginados: a tabela inteira passa do limite de linhas do PostgREST e a fatia
    // truncava as métricas. Uma única página aqui porque o mock devolve menos que o tamanho dela.
    expect(callsFor('sprint_deliverables', 'select')).toEqual([
      [
        'id, sprint_id, project_id, process_id, status, due_date, estimated_hours, parent_id, completed_at, created_at, assigned_to',
        { count: 'exact' },
      ],
    ]);
    expect(callsFor('sprint_deliverables', 'order')).toEqual([['id', { ascending: true }]]);
    expect(callsFor('sprint_deliverables', 'range')).toEqual([[0, 499]]);
    expect(callsFor('daily_standups', 'select')).toEqual([
      ['id, date, sprint_id, project_id, process_id, blockers, user_id'],
    ]);
    expect(callsFor('daily_standups', 'order')).toEqual([['date', { ascending: false }]]);
    expect(callsFor('daily_standups', 'limit')).toEqual([[800]]);
    expect(callsFor('process_improvements', 'select')).toEqual([
      ['sprint_deliverable_id, cost_saved_monthly, time_saved_hours, evaluation_status'],
    ]);
    expect(callsFor('process_improvements', 'eq')).toEqual([['evaluation_status', 'completed']]);
  });

  it('mapeia dados e preserva a supressão de erros individuais das seis respostas', async () => {
    results.set('sprints', { data: [{ id: 's1' }], error: new Error('ignorado') });
    results.set('projects', { data: null, error: new Error('ignorado') });
    results.set('processes', { data: [{ id: 'proc1' }], error: null });
    results.set('sprint_deliverables', { data: [{ id: 'd1' }], error: null });
    results.set('daily_standups', { data: [{ id: 'daily1' }], error: null });
    results.set('process_improvements', { data: [{ sprint_deliverable_id: 'd1' }], error: null });
    renderHook(() => useDomainAnaliseInteligenteData());

    await expect(queryOptions().queryFn()).resolves.toEqual({
      sprints: [{ id: 's1' }],
      projects: [],
      processes: [{ id: 'proc1' }],
      deliverables: [{ id: 'd1' }],
      dailys: [{ id: 'daily1' }],
      improvements: [{ sprint_deliverable_id: 'd1' }],
    });
  });

  it('registra três tabelas realtime, refaz a consulta em cada evento e remove o canal no cleanup', () => {
    const { unmount } = renderHook(() => useDomainAnaliseInteligenteData());

    expect(mocks.channel).toHaveBeenCalledWith('analise-inteligente-realtime');
    expect(channelObject.on.mock.calls.map(([, registration]) => registration)).toEqual([
      { event: '*', schema: 'public', table: 'daily_standups' },
      { event: '*', schema: 'public', table: 'sprints' },
      { event: '*', schema: 'public', table: 'sprint_deliverables' },
    ]);
    expect(channelObject.subscribe).toHaveBeenCalledOnce();
    realtimeHandlers.forEach((callback) => callback());
    expect(mocks.refetch).toHaveBeenCalledTimes(3);

    unmount();
    expect(mocks.removeChannel).toHaveBeenCalledWith(channelObject);
  });
});

describe('useDomainAnaliseInteligenteAnalysis', () => {
  it('registra mutation sem retry e envia o body normalizado à Edge Function', async () => {
    const analise = { sintese_executiva: 'ok' };
    mocks.invoke.mockResolvedValue({ data: { analise }, error: null });
    renderHook(() => useDomainAnaliseInteligenteAnalysis());

    expect(mutationOptions()).toMatchObject({
      mutationKey: ['domain-analise-inteligente', 'analysis'],
      retry: false,
    });
    await expect(mutationOptions().mutationFn(filters)).resolves.toBe(analise);
    expect(mocks.invoke).toHaveBeenCalledWith('analise-inteligente-sprints', {
      body: {
        start_date: '2026-07-01',
        end_date: '2026-07-31',
        sprint_id: 's1',
        project_id: null,
        process_id: 'p1',
        category: null,
      },
    });
  });

  it('propaga o erro de transporte e converte data.error em Error', async () => {
    renderHook(() => useDomainAnaliseInteligenteAnalysis());
    const transportError = new Error('edge indisponível');
    mocks.invoke.mockResolvedValueOnce({ data: null, error: transportError });
    await expect(mutationOptions().mutationFn(filters)).rejects.toBe(transportError);

    mocks.invoke.mockResolvedValueOnce({ data: { error: 'resposta inválida' }, error: null });
    await expect(mutationOptions().mutationFn(filters)).rejects.toThrow('resposta inválida');
  });
});
