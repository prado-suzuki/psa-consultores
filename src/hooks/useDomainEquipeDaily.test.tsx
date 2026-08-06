import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import { useDomainEquipeDaily } from '@/hooks/useDomainEquipeDaily';
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
    'gte',
    'lte',
    'lt',
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
function mutationRegistration(index: number) {
  return reactQueryMocks.useMutation.mock.calls[index][0] as {
    mutationFn: (input: unknown) => Promise<unknown>;
  };
}

const baseFilters = {
  startDate: '2026-07-01',
  endDate: '2026-07-31',
  person: 'all',
  sprint: 'all',
};

function render(overrides: Partial<Parameters<typeof useDomainEquipeDaily>[0]> = {}) {
  return renderHook(() =>
    useDomainEquipeDaily({
      userId: 'user-1',
      today: '2026-07-20',
      membersLoaded: true,
      filters: baseFilters,
      ...overrides,
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
});

describe('useDomainEquipeDaily — queries', () => {
  it('registra as query keys canônicas com userId e filtros', () => {
    render();
    const keys = queryRegistrations().map((r) => r.queryKey);
    expect(keys).toEqual([
      ['domain-equipe-daily', 'team-members', 'user-1'],
      ['domain-equipe-daily', 'sprints', 'user-1'],
      ['domain-equipe-daily', 'projects', 'user-1'],
      ['domain-equipe-daily', 'processes', 'user-1'],
      ['domain-equipe-daily', 'standups', 'user-1', '2026-07-01', '2026-07-31', 'all', 'all'],
    ]);
  });

  it('desabilita as queries sem userId e standups sem membros carregados', () => {
    render({ userId: undefined, membersLoaded: false });
    const regs = queryRegistrations();
    // team-members, sprints, projects, processes → enabled !!userId === false
    expect(regs.slice(0, 4).every((r) => r.enabled === false)).toBe(true);
    // standups → !!userId && membersLoaded === false
    expect(regs[4].enabled).toBe(false);
  });

  it('team-members: filtra roles por team_member/admin e busca perfis pelos ids', async () => {
    setDbResult('user_roles', 'select', {
      data: [{ user_id: 'u-a' }, { user_id: 'u-b' }],
      error: null,
    });
    setDbResult('daily_standups', 'select', { data: [{ user_id: 'u-c' }], error: null });
    render();
    await (queryRegistrations()[0].queryFn as () => Promise<unknown>)();

    expect(callsFor('user_roles', 'in')[0].args).toEqual(['role', ['team_member', 'admin']]);
    expect(callsFor('profiles_safe', 'in')[0].args).toEqual(['id', ['u-a', 'u-b']]);
    // segunda passagem: perfis extras dos autores de standups
    expect(callsFor('profiles_safe', 'in')[1].args).toEqual(['id', ['u-c']]);
  });

  it('sprints/projects/processes: selecionam e ordenam corretamente', async () => {
    render();
    await (queryRegistrations()[1].queryFn as () => Promise<unknown>)();
    await (queryRegistrations()[2].queryFn as () => Promise<unknown>)();
    await (queryRegistrations()[3].queryFn as () => Promise<unknown>)();

    // status/start_date alimentam a sugestão da sprint ativa mais atual.
    expect(callsFor('sprints', 'select')[0].args).toEqual(['id, name, project_id, status, start_date']);
    expect(callsFor('sprints', 'order')[0].args).toEqual(['start_date', { ascending: false }]);
    expect(callsFor('projects', 'select')[0].args).toEqual(['id, name, cluster_id']);
    expect(callsFor('projects', 'order')[0].args).toEqual(['name', { ascending: true }]);
    expect(callsFor('processes', 'select')[0].args).toEqual(['id, name, project_id']);
    expect(callsFor('processes', 'order')[0].args).toEqual(['name', { ascending: true }]);
  });

  it('standups (sem filtros pessoa/sprint): busca meu standup por user_id+date e lista por intervalo', async () => {
    render();
    await (queryRegistrations()[4].queryFn as () => Promise<unknown>)();

    // meu standup do dia
    const eqCalls = callsFor('daily_standups', 'eq').map((c) => c.args);
    expect(eqCalls).toContainEqual(['user_id', 'user-1']);
    expect(eqCalls).toContainEqual(['date', '2026-07-20']);
    expect(callsFor('daily_standups', 'maybeSingle')).toHaveLength(1);

    // intervalo aplicado
    expect(callsFor('daily_standups', 'gte')[0].args).toEqual(['date', '2026-07-01']);
    expect(callsFor('daily_standups', 'lte')[0].args).toEqual(['date', '2026-07-31']);
    // sprint='all' e person='all' → não filtra por sprint_id nem por user_id na lista
    expect(eqCalls).not.toContainEqual(['sprint_id', 'all']);
  });

  it('standups: aplica eq de sprint_id e user_id quando filtros são específicos', async () => {
    render({
      filters: { ...baseFilters, sprint: 'sprint-9', person: 'user-42' },
    });
    await (queryRegistrations()[4].queryFn as () => Promise<unknown>)();

    const eqCalls = callsFor('daily_standups', 'eq').map((c) => c.args);
    expect(eqCalls).toContainEqual(['sprint_id', 'sprint-9']);
    expect(eqCalls).toContainEqual(['user_id', 'user-42']);
  });

  it('standups: retorna cedo sem userId sem tocar no supabase', async () => {
    render({ userId: undefined });
    const result = await (queryRegistrations()[4].queryFn as () => Promise<unknown>)();
    expect(result).toEqual({});
    expect(callsFor('daily_standups', 'select')).toHaveLength(0);
  });
});

describe('useDomainEquipeDaily — mutations', () => {
  it('updateDailyStandup envia payload e filtra pelo id', async () => {
    const payload = { will_do_today: 'x' };
    render();
    await mutationRegistration(0).mutationFn({ standupId: 'st-1', payload });

    expect(callsFor('daily_standups', 'update')[0].args).toEqual([payload]);
    expect(callsFor('daily_standups', 'eq')[0].args).toEqual(['id', 'st-1']);
  });

  it('insertDailyStandup insere o payload', async () => {
    const payload = { user_id: 'user-1', date: '2026-07-20', will_do_today: 'y' };
    render();
    await mutationRegistration(1).mutationFn(payload);

    expect(callsFor('daily_standups', 'insert')[0].args).toEqual([payload]);
  });

  it('deleteDailyStandup filtra a exclusão pelo id', async () => {
    render();
    await mutationRegistration(2).mutationFn('st-1');

    expect(callsFor('daily_standups', 'delete')).toHaveLength(1);
    expect(callsFor('daily_standups', 'eq')[0].args).toEqual(['id', 'st-1']);
  });

  it('copyFromYesterday busca último standup anterior à data, do usuário', async () => {
    render();
    await mutationRegistration(3).mutationFn({ copyUserId: 'user-1', copyDate: '2026-07-20' });

    expect(callsFor('daily_standups', 'select')[0].args).toEqual(['will_do_today, date']);
    expect(callsFor('daily_standups', 'eq')[0].args).toEqual(['user_id', 'user-1']);
    expect(callsFor('daily_standups', 'lt')[0].args).toEqual(['date', '2026-07-20']);
    expect(callsFor('daily_standups', 'order')[0].args).toEqual(['date', { ascending: false }]);
    expect(callsFor('daily_standups', 'limit')[0].args).toEqual([1]);
  });

  it('propaga erro do update', async () => {
    const error = new Error('boom');
    setDbResult('daily_standups', 'update', { data: null, error });
    render();
    await expect(
      mutationRegistration(0).mutationFn({ standupId: 'st-1', payload: {} }),
    ).rejects.toBe(error);
  });
});
