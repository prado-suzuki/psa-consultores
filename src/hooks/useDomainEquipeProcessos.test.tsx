import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(),
  fetchQuery: vi.fn(),
  setQueryData: vi.fn(),
  assertCanPerform: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: mocks.useQueryClient,
}));
vi.mock('@/hooks/useRlsPrecheck', () => ({ assertCanPerform: mocks.assertCanPerform }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

import { useEquipeProcessosMutations } from '@/hooks/useDomainEquipeProcessosMutations';
import {
  equipeProcessosQueryKeys,
  useEquipeProcessosCatalogClientsQuery,
  useEquipeProcessosImperativeQueries,
  useEquipeProcessosProjectsQuery,
  useEquipeProcessosQuery,
} from '@/hooks/useDomainEquipeProcessosQueries';
import { supabase } from '@/integrations/supabase/client';

interface Registration {
  queryKey?: readonly unknown[];
  mutationKey?: readonly unknown[];
  queryFn?: () => Promise<unknown>;
  mutationFn?: (input: never) => Promise<unknown>;
  staleTime?: number;
  gcTime?: number;
  retry?: boolean;
  networkMode?: string;
  refetchOnMount?: string;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
}

interface DbResult {
  data?: unknown;
  error?: unknown;
  count?: number | null;
}
interface DbCall {
  table: string;
  method: string;
  args: unknown[];
}
const calls: DbCall[] = [];
const results = new Map<string, DbResult>();

function setResult(table: string, operation: string, result: DbResult) {
  results.set(`${table}:${operation}`, result);
}

function chainFor(table: string) {
  let operation = 'select';
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'limit', 'single']) {
    chain[method] = vi.fn((...args: unknown[]) => {
      calls.push({ table, method, args });
      if (['select', 'insert', 'update', 'delete'].includes(method)) operation = method;
      return chain;
    });
  }
  chain.maybeSingle = vi.fn(() => {
    calls.push({ table, method: 'maybeSingle', args: [] });
    return Promise.resolve(results.get(`${table}:${operation}`) ?? { data: null, error: null });
  });
  chain.then = (resolve: (result: DbResult) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(results.get(`${table}:${operation}`) ?? { data: [], error: null }).then(
      resolve,
      reject,
    );
  return chain;
}

function registrations(source: ReturnType<typeof vi.fn>): Registration[] {
  return source.mock.calls.map(([options]) => options as Registration);
}

function mutation(action: string): Registration {
  const found = registrations(mocks.useMutation).find(
    ({ mutationKey }) => mutationKey?.[1] === action,
  );
  if (!found) throw new Error(`Mutation ${action} não registrada`);
  return found;
}

function tableCalls(table: string, method?: string) {
  return calls.filter((call) => call.table === table && (!method || call.method === method));
}

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  results.clear();
  mocks.useQueryClient.mockReturnValue({
    fetchQuery: mocks.fetchQuery,
    setQueryData: mocks.setQueryData,
  });
  mocks.fetchQuery.mockImplementation(async (options: Registration) => options.queryFn?.());
  mocks.assertCanPerform.mockResolvedValue(undefined);
  vi.mocked(supabase.from).mockImplementation((table: string) => chainFor(table) as never);
});

describe('queries de equipe/processos', () => {
  it('registra keys e todas as opções exatas das consultas principais', () => {
    renderHook(() => {
      useEquipeProcessosQuery('user-1');
      useEquipeProcessosCatalogClientsQuery('user-1');
      useEquipeProcessosProjectsQuery('user-1');
    });

    const registered = registrations(mocks.useQuery);
    expect(registered.map(({ queryKey }) => queryKey)).toEqual([
      ['domain-equipe-processos', 'processes', 'user-1'],
      ['domain-equipe-processos', 'catalog-clients', 'user-1'],
      ['domain-equipe-processos', 'projects', 'user-1'],
    ]);
    expect(
      registered.every(
        (item) =>
          item.staleTime === 0 &&
          item.gcTime === 0 &&
          item.retry === false &&
          item.networkMode === 'always' &&
          item.refetchOnMount === 'always' &&
          item.refetchOnWindowFocus === false &&
          item.refetchOnReconnect === false,
      ),
    ).toBe(true);
    expect(equipeProcessosQueryKeys.details(undefined, 'p')).toEqual([
      'domain-equipe-processos',
      'details',
      null,
      'p',
    ]);
  });

  it('seleciona relações exatas de processos e converte project_processes em linked_projects', async () => {
    setResult('processes', 'select', {
      data: [
        {
          id: 'p',
          name: 'Processo',
          stage: 'mapping',
          project_processes: [
            {
              id: 'l',
              impact_type: 'support',
              project: { id: 'project-1', name: 'Projeto' },
            },
          ],
        },
      ],
      error: null,
    });
    renderHook(() => useEquipeProcessosQuery('u'));

    const data = await registrations(mocks.useQuery)[0].queryFn?.();
    const select = String(tableCalls('processes', 'select')[0].args[0]).replace(/\s+/g, ' ').trim();
    expect(select).toBe(
      '*, catalog_client:catalog_clients!client_id(id, name, responsible, color, is_active), equipe:estrutura_equipes!processes_equipe_id_fkey(id, name, area:estrutura_areas!estrutura_equipes_area_id_fkey(id, name)), project_processes( id, impact_type, project:projects(id, name) )',
    );
    expect(tableCalls('processes', 'order')[0].args).toEqual(['name']);
    expect(data).toEqual([
      expect.objectContaining({
        id: 'p',
        linked_projects: [{ id: 'project-1', name: 'Projeto', impact_type: 'support' }],
      }),
    ]);
  });

  it('usa selects, filtros e ordenações exatos nos catálogos', async () => {
    renderHook(() => {
      useEquipeProcessosCatalogClientsQuery('u');
      useEquipeProcessosProjectsQuery('u');
    });
    const registered = registrations(mocks.useQuery);
    await registered[0].queryFn?.();
    await registered[1].queryFn?.();

    expect(tableCalls('catalog_clients').map(({ method, args }) => [method, args])).toEqual([
      ['select', ['id, name, responsible, color, is_active']],
      ['eq', ['is_active', true]],
      ['order', ['name']],
    ]);
    expect(tableCalls('projects').map(({ method, args }) => [method, args])).toEqual([
      ['select', ['id, name']],
      ['eq', ['status', 'active']],
      ['order', ['name']],
    ]);
  });

  it('detalhes consultam relações e count exatos, mas suprimem erro do count', async () => {
    setResult('process_stages', 'select', { data: [{ id: 'stage-1' }], error: null });
    setResult('project_processes', 'select', { data: [{ id: 'link-1' }], error: null });
    setResult('sprint_deliverables', 'select', {
      count: 3,
      data: null,
      error: new Error('erro de count ignorado'),
    });
    const { result } = renderHook(() => useEquipeProcessosImperativeQueries('user-1'));

    await expect(result.current.fetchProcessDetails('process-1')).resolves.toEqual({
      stages: [{ id: 'stage-1' }],
      projectProcesses: [{ id: 'link-1' }],
      taskCount: 3,
    });
    expect(mocks.fetchQuery.mock.calls[0][0]).toMatchObject({
      queryKey: ['domain-equipe-processos', 'details', 'user-1', 'process-1'],
      staleTime: 0,
      gcTime: 0,
      retry: false,
      networkMode: 'always',
    });
    expect(tableCalls('process_stages').map(({ method, args }) => [method, args])).toEqual([
      ['select', ['*']],
      ['eq', ['process_id', 'process-1']],
      ['order', ['stage_order']],
    ]);
    expect(tableCalls('project_processes').map(({ method, args }) => [method, args])).toEqual([
      ['select', ['*, projects:project_id (id, name)']],
      ['eq', ['process_id', 'process-1']],
    ]);
    expect(tableCalls('sprint_deliverables').map(({ method, args }) => [method, args])).toEqual([
      ['select', ['id', { count: 'exact', head: true }]],
      ['eq', ['process_id', 'process-1']],
    ]);
  });
});

describe('mutations de equipe/processos', () => {
  it('registra as cinco keys e as opções de mutation', () => {
    renderHook(() => useEquipeProcessosMutations(undefined));
    const registered = registrations(mocks.useMutation);
    expect(registered.map(({ mutationKey }) => mutationKey)).toEqual([
      ['domain-equipe-processos', 'import', null],
      ['domain-equipe-processos', 'update', null],
      ['domain-equipe-processos', 'delete', null],
      ['domain-equipe-processos', 'add-project-link', null],
      ['domain-equipe-processos', 'remove-project-link', null],
    ]);
    expect(
      registered.every(({ retry, networkMode }) => retry === false && networkMode === 'always'),
    ).toBe(true);
  });

  it('imports e novos vínculos inserem payload exato sem precheck', async () => {
    renderHook(() => useEquipeProcessosMutations('u'));
    const imported = [{ name: 'A', stage: 'discovery' }];
    await mutation('import').mutationFn?.(imported as never);
    await mutation('add-project-link').mutationFn?.({
      processId: 'p',
      projectId: 'project-1',
      impactType: 'principal',
    } as never);

    expect(tableCalls('processes', 'insert')[0].args).toEqual([imported]);
    expect(tableCalls('project_processes', 'insert')[0].args).toEqual([
      {
        process_id: 'p',
        project_id: 'project-1',
        impact_type: 'principal',
      },
    ]);
    expect(mocks.assertCanPerform).not.toHaveBeenCalled();
  });

  it('update e remoção de vínculo fazem precheck antes do payload filtrado por id', async () => {
    renderHook(() => useEquipeProcessosMutations('u'));
    await mutation('update').mutationFn?.({ processId: 'p', payload: { name: 'Novo' } } as never);
    await mutation('remove-project-link').mutationFn?.('link-1' as never);

    expect(mocks.assertCanPerform.mock.calls).toEqual([
      ['processes', 'update', 'p'],
      ['project_processes', 'delete', 'link-1'],
    ]);
    expect(tableCalls('processes').map(({ method, args }) => [method, args])).toEqual([
      ['update', [{ name: 'Novo' }]],
      ['eq', ['id', 'p']],
    ]);
    expect(tableCalls('project_processes').map(({ method, args }) => [method, args])).toEqual([
      ['delete', []],
      ['eq', ['id', 'link-1']],
    ]);
  });

  it('cascade delete mantém ordem exata, prechecks das amostras e ignora erros dos filhos', async () => {
    setResult('process_stages', 'select', { data: { id: 'stage-1' }, error: null });
    setResult('process_stages', 'delete', { error: new Error('filho stage ignorado') });
    setResult('project_processes', 'select', { data: { id: 'link-1' }, error: null });
    setResult('project_processes', 'delete', { error: new Error('filho link ignorado') });
    setResult('processes', 'delete', { error: null });
    renderHook(() => useEquipeProcessosMutations('u'));

    await expect(mutation('delete').mutationFn?.('process-1' as never)).resolves.toBeUndefined();

    expect(calls.map(({ table, method, args }) => [table, method, args])).toEqual([
      ['process_stages', 'select', ['id']],
      ['process_stages', 'eq', ['process_id', 'process-1']],
      ['process_stages', 'limit', [1]],
      ['process_stages', 'maybeSingle', []],
      ['process_stages', 'delete', []],
      ['process_stages', 'eq', ['process_id', 'process-1']],
      ['project_processes', 'select', ['id']],
      ['project_processes', 'eq', ['process_id', 'process-1']],
      ['project_processes', 'limit', [1]],
      ['project_processes', 'maybeSingle', []],
      ['project_processes', 'delete', []],
      ['project_processes', 'eq', ['process_id', 'process-1']],
      ['processes', 'delete', []],
      ['processes', 'eq', ['id', 'process-1']],
    ]);
    expect(mocks.assertCanPerform.mock.calls).toEqual([
      ['process_stages', 'delete', 'stage-1'],
      ['project_processes', 'delete', 'link-1'],
      ['processes', 'delete', 'process-1'],
    ]);
  });

  it('não inicia update/remove quando o precheck falha', async () => {
    const error = new Error('bloqueado');
    mocks.assertCanPerform.mockRejectedValue(error);
    renderHook(() => useEquipeProcessosMutations('u'));

    await expect(
      mutation('update').mutationFn?.({ processId: 'p', payload: {} } as never),
    ).rejects.toBe(error);
    await expect(mutation('remove-project-link').mutationFn?.('l' as never)).rejects.toBe(error);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
