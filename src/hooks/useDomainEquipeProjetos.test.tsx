import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
}));

const rlsMocks = vi.hoisted(() => ({
  assertCanPerform: vi.fn<() => Promise<void>>(),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/hooks/useRlsPrecheck', () => rlsMocks);
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import { currentAmbiente } from '@/config/api';
import {
  useEquipeProjetoMutations,
  useEquipeProjetoProcessMutations,
} from '@/hooks/useDomainEquipeProjetosMutations';
import {
  equipeProjetosQueryKeys,
  useEquipeProjetoBacklogQuery,
  useEquipeProjetoProcessesQuery,
  useEquipeProjetosCatalogClientsQuery,
  useEquipeProjetosExternalClientsQuery,
  useEquipeProjetosQuery,
  useEquipeProjetosTeamMembersQuery,
} from '@/hooks/useDomainEquipeProjetosQueries';
import { supabase } from '@/integrations/supabase/client';

interface QueryRegistration<T = unknown> {
  queryKey: readonly unknown[];
  queryFn: () => Promise<T>;
  enabled?: boolean;
  networkMode?: string;
  retry?: boolean;
  staleTime?: number;
  gcTime?: number;
}

interface MutationRegistration {
  mutationKey: readonly unknown[];
  mutationFn: (input: unknown) => Promise<unknown>;
  networkMode?: string;
  retry?: boolean;
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

const dbCalls: DbCall[] = [];
const dbResults = new Map<string, DbResult>();

function resultKey(table: string, operation: string) {
  return `${table}:${operation}`;
}

function setDbResult(table: string, operation: string, result: DbResult) {
  dbResults.set(resultKey(table, operation), result);
}

function makeSupabaseChain(table: string) {
  let operation = 'select';
  const chain: Record<string, unknown> = {};

  for (const method of [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'filter',
    'is',
    'neq',
    'order',
  ]) {
    chain[method] = vi.fn((...args: unknown[]) => {
      dbCalls.push({ table, method, args });
      if (['select', 'insert', 'update', 'delete'].includes(method)) operation = method;
      return chain;
    });
  }

  chain.then = (
    onFulfilled: (result: DbResult) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) =>
    Promise.resolve(dbResults.get(resultKey(table, operation)) ?? { data: [], error: null }).then(
      onFulfilled,
      onRejected,
    );

  return chain;
}

function queryRegistrations<T = unknown>() {
  return reactQueryMocks.useQuery.mock.calls.map(([options]) => options as QueryRegistration<T>);
}

function latestQueryRegistration<T = unknown>() {
  const options = queryRegistrations<T>().at(-1);
  if (!options) throw new Error('Query não registrada no teste');
  return options;
}

function mutationRegistration(action: string) {
  const options = reactQueryMocks.useMutation.mock.calls
    .map(([registration]) => registration as MutationRegistration)
    .find((registration) => registration.mutationKey[1] === action);

  if (!options) throw new Error(`Mutation ${action} não registrada no teste`);
  return options;
}

function callsFor(table: string, method: string) {
  return dbCalls.filter((call) => call.table === table && call.method === method);
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  rlsMocks.assertCanPerform.mockResolvedValue(undefined);
  vi.mocked(supabase.from).mockImplementation((table: string) => makeSupabaseChain(table) as never);
});

describe('queries de equipe/projetos', () => {
  it('registra keys, enabled por projectId e política da consulta imperativa anterior', () => {
    renderHook(() => {
      useEquipeProjetosQuery('user-1');
      useEquipeProjetosCatalogClientsQuery('user-1');
      useEquipeProjetosExternalClientsQuery('user-1');
      useEquipeProjetosTeamMembersQuery('user-1');
      useEquipeProjetoBacklogQuery('user-1', undefined);
      useEquipeProjetoProcessesQuery('user-1', undefined);
    });

    const registrations = queryRegistrations();
    expect(registrations.map(({ queryKey }) => queryKey)).toEqual([
      ['domain-equipe-projetos', 'projects', 'user-1'],
      ['domain-equipe-projetos', 'catalog-clients', 'user-1'],
      ['domain-equipe-projetos', 'external-clients', 'user-1', currentAmbiente],
      ['domain-equipe-projetos', 'team-members', 'user-1'],
      ['domain-equipe-projetos', 'backlog', 'user-1', null],
      ['domain-equipe-projetos', 'processes', 'user-1', null],
    ]);
    expect(registrations[4].enabled).toBe(false);
    expect(registrations[5].enabled).toBe(false);
    expect(registrations.slice(0, 4).every(({ enabled }) => enabled === undefined)).toBe(true);
    expect(
      registrations.every(
        ({ networkMode, retry, staleTime, gcTime }) =>
          networkMode === 'always' && retry === false && staleTime === 0 && gcTime === 0,
      ),
    ).toBe(true);

    expect(equipeProjetosQueryKeys.backlog(undefined, 'project-1')).toEqual([
      'domain-equipe-projetos',
      'backlog',
      null,
      'project-1',
    ]);
    expect(equipeProjetosQueryKeys.processes(undefined, 'project-1')).toEqual([
      'domain-equipe-projetos',
      'processes',
      null,
      'project-1',
    ]);
  });

  it('filtra clientes ativos, não excluídos e do ambiente atual', async () => {
    renderHook(() => useEquipeProjetosExternalClientsQuery('user-1'));

    await latestQueryRegistration().queryFn();

    expect(callsFor('cliente', 'select')[0].args).toEqual(['id, nome']);
    expect(callsFor('cliente', 'eq').map(({ args }) => args)).toEqual([
      ['ativo', true],
      ['excluido', false],
      ['ambiente', currentAmbiente],
    ]);
    expect(callsFor('cliente', 'order')[0].args).toEqual(['nome']);
  });

  it('filtra clientes do catálogo por is_active', async () => {
    renderHook(() => useEquipeProjetosCatalogClientsQuery('user-1'));

    await latestQueryRegistration().queryFn();

    expect(callsFor('catalog_clients', 'eq')[0].args).toEqual(['is_active', true]);
  });

  it('habilita backlog com projectId e aplica todos os filtros críticos', async () => {
    renderHook(() => useEquipeProjetoBacklogQuery('user-1', 'project-1'));
    const registration = latestQueryRegistration();

    expect(registration.enabled).toBe(true);
    await registration.queryFn();

    expect(callsFor('sprint_backlog_items', 'filter')[0].args).toEqual([
      'project_id',
      'eq',
      'project-1',
    ]);
    expect(callsFor('sprint_backlog_items', 'is')[0].args).toEqual(['sprint_id', null]);
    expect(callsFor('sprint_backlog_items', 'neq')[0].args).toEqual(['status', 'moved_to_sprint']);
  });

  it('une processos diretos e N:N por id, mantendo impact_type do vínculo', async () => {
    const directA = {
      id: 'process-1',
      name: 'Direto substituído pelo vínculo',
      stage: 'backlog',
    };
    const directB = { id: 'process-2', name: 'Somente direto', stage: 'doing' };
    const linkedA = { id: 'process-1', name: 'Via vínculo', stage: 'done' };
    const linkedC = { id: 'process-3', name: 'Somente vínculo', stage: 'backlog' };
    setDbResult('processes', 'select', { data: [directA, directB], error: null });
    setDbResult('project_processes', 'select', {
      data: [
        { impact_type: 'critical', process: linkedA },
        { impact_type: 'support', process: linkedC },
        { impact_type: 'ignored', process: null },
      ],
      error: null,
    });

    renderHook(() => useEquipeProjetoProcessesQuery('user-1', 'project-1'));
    const registration = latestQueryRegistration<Array<Record<string, unknown>>>();
    const processes = await registration.queryFn();

    expect(registration.enabled).toBe(true);
    expect(callsFor('project_processes', 'eq')[0].args).toEqual(['project_id', 'project-1']);
    expect(callsFor('processes', 'eq')[0].args).toEqual(['project_id', 'project-1']);
    expect(processes).toEqual([
      { ...linkedA, impact_type: 'critical' },
      directB,
      { ...linkedC, impact_type: 'support' },
    ]);
  });

  it('propaga o mesmo erro retornado pela consulta', async () => {
    const error = new Error('falha ao consultar projetos');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    setDbResult('projects', 'select', { data: null, error });
    renderHook(() => useEquipeProjetosQuery('user-1'));

    await expect(latestQueryRegistration().queryFn()).rejects.toBe(error);
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching projects:', error);
    consoleSpy.mockRestore();
  });

  it('preserva o comportamento de profiles_safe que ignora error e retorna lista vazia', async () => {
    setDbResult('profiles_safe', 'select', {
      data: null,
      error: new Error('erro deliberadamente não inspecionado'),
    });
    renderHook(() => useEquipeProjetosTeamMembersQuery('user-1'));

    await expect(latestQueryRegistration().queryFn()).resolves.toEqual([]);
  });
});

describe('mutations de equipe/projetos', () => {
  it('registra as 9 mutation keys com networkMode always e retry desabilitado', () => {
    renderHook(() => {
      useEquipeProjetoMutations('user-1');
      useEquipeProjetoProcessMutations('user-1');
    });

    const registrations = reactQueryMocks.useMutation.mock.calls.map(
      ([options]) => options as MutationRegistration,
    );
    expect(registrations.map(({ mutationKey }) => mutationKey)).toEqual([
      ['domain-equipe-projetos', 'import-projects', 'user-1'],
      ['domain-equipe-projetos', 'create-project', 'user-1'],
      ['domain-equipe-projetos', 'update-project', 'user-1'],
      ['domain-equipe-projetos', 'delete-project', 'user-1'],
      ['domain-equipe-projetos', 'update-project-status', 'user-1'],
      ['domain-equipe-projetos', 'create-process', 'user-1'],
      ['domain-equipe-projetos', 'update-process', 'user-1'],
      ['domain-equipe-projetos', 'delete-process', 'user-1'],
      ['domain-equipe-projetos', 'update-process-stage', 'user-1'],
    ]);
    expect(
      registrations.every(({ networkMode, retry }) => networkMode === 'always' && retry === false),
    ).toBe(true);
  });

  it('import-projects insere o array sem precheck', async () => {
    const payload = [
      { name: 'Projeto A', status: 'active' },
      { name: 'Projeto B', status: 'active' },
    ];
    renderHook(() => useEquipeProjetoMutations('user-1'));

    await mutationRegistration('import-projects').mutationFn(payload);

    expect(callsFor('projects', 'insert')[0].args).toEqual([payload]);
    expect(rlsMocks.assertCanPerform).not.toHaveBeenCalled();
  });

  it('create-project insere o payload sem precheck', async () => {
    const payload = { name: 'Projeto', status: 'active', created_by: 'user-1' };
    renderHook(() => useEquipeProjetoMutations('user-1'));

    await mutationRegistration('create-project').mutationFn(payload);

    expect(callsFor('projects', 'insert')[0].args).toEqual([payload]);
    expect(rlsMocks.assertCanPerform).not.toHaveBeenCalled();
  });

  it('update-project faz precheck, envia payload e filtra pelo id', async () => {
    const payload = { name: 'Projeto atualizado', description: 'Nova descrição' };
    renderHook(() => useEquipeProjetoMutations('user-1'));

    await mutationRegistration('update-project').mutationFn({
      projectId: 'project-1',
      payload,
    });

    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('projects', 'update', 'project-1');
    expect(callsFor('projects', 'update')[0].args).toEqual([payload]);
    expect(callsFor('projects', 'eq')[0].args).toEqual(['id', 'project-1']);
  });

  it('delete-project faz precheck e filtra a exclusão pelo id', async () => {
    renderHook(() => useEquipeProjetoMutations('user-1'));

    await mutationRegistration('delete-project').mutationFn('project-1');

    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('projects', 'delete', 'project-1');
    expect(callsFor('projects', 'delete')).toHaveLength(1);
    expect(callsFor('projects', 'eq')[0].args).toEqual(['id', 'project-1']);
  });

  it('update-project-status faz precheck, atualiza só status e preserva supressão do erro', async () => {
    setDbResult('projects', 'update', {
      data: null,
      error: new Error('erro atualmente não propagado'),
    });
    renderHook(() => useEquipeProjetoMutations('user-1'));

    await expect(
      mutationRegistration('update-project-status').mutationFn({
        projectId: 'project-1',
        status: 'completed',
      }),
    ).resolves.toBeUndefined();

    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('projects', 'update', 'project-1');
    expect(callsFor('projects', 'update')[0].args).toEqual([{ status: 'completed' }]);
    expect(callsFor('projects', 'eq')[0].args).toEqual(['id', 'project-1']);
  });

  it('create-process insere o payload sem precheck', async () => {
    const payload = {
      name: 'Processo',
      project_id: 'project-1',
      stage: 'backlog',
    };
    renderHook(() => useEquipeProjetoProcessMutations('user-1'));

    await mutationRegistration('create-process').mutationFn(payload);

    expect(callsFor('processes', 'insert')[0].args).toEqual([payload]);
    expect(rlsMocks.assertCanPerform).not.toHaveBeenCalled();
  });

  it('update-process faz precheck, envia payload e filtra pelo id', async () => {
    const payload = { name: 'Processo atualizado', stage: 'doing' };
    renderHook(() => useEquipeProjetoProcessMutations('user-1'));

    await mutationRegistration('update-process').mutationFn({
      processId: 'process-1',
      payload,
    });

    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('processes', 'update', 'process-1');
    expect(callsFor('processes', 'update')[0].args).toEqual([payload]);
    expect(callsFor('processes', 'eq')[0].args).toEqual(['id', 'process-1']);
  });

  it('delete-process faz precheck e filtra a exclusão pelo id', async () => {
    renderHook(() => useEquipeProjetoProcessMutations('user-1'));

    await mutationRegistration('delete-process').mutationFn('process-1');

    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('processes', 'delete', 'process-1');
    expect(callsFor('processes', 'delete')).toHaveLength(1);
    expect(callsFor('processes', 'eq')[0].args).toEqual(['id', 'process-1']);
  });

  it('update-process-stage faz precheck, atualiza só stage e preserva supressão do erro', async () => {
    setDbResult('processes', 'update', {
      data: null,
      error: new Error('erro atualmente não propagado'),
    });
    renderHook(() => useEquipeProjetoProcessMutations('user-1'));

    await expect(
      mutationRegistration('update-process-stage').mutationFn({
        processId: 'process-1',
        stage: 'done',
      }),
    ).resolves.toBeUndefined();

    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('processes', 'update', 'process-1');
    expect(callsFor('processes', 'update')[0].args).toEqual([{ stage: 'done' }]);
    expect(callsFor('processes', 'eq')[0].args).toEqual(['id', 'process-1']);
  });

  it('propaga a mesma falha do Supabase nas mutations que inspecionam error', async () => {
    const error = new Error('falha ao criar projeto');
    setDbResult('projects', 'insert', { data: null, error });
    renderHook(() => useEquipeProjetoMutations('user-1'));

    await expect(
      mutationRegistration('create-project').mutationFn({ name: 'Projeto' }),
    ).rejects.toBe(error);
  });

  it('propaga falha do precheck e não inicia a escrita', async () => {
    const error = new Error('operação bloqueada pelo RLS');
    rlsMocks.assertCanPerform.mockRejectedValueOnce(error);
    renderHook(() => useEquipeProjetoMutations('user-1'));

    await expect(
      mutationRegistration('update-project').mutationFn({
        projectId: 'project-1',
        payload: { name: 'Não deve gravar' },
      }),
    ).rejects.toBe(error);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
