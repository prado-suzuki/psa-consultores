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

const functionsInvoke = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/hooks/useRlsPrecheck', () => rlsMocks);
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), functions: { invoke: functionsInvoke } },
}));

import {
  useDomainAdminUsuarios,
  type CreateAdminUsuarioInput,
} from '@/hooks/useDomainAdminUsuarios';
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

const noopOptions = {
  onCreateUserSuccess: vi.fn(),
  onCreateUserError: vi.fn(),
  onAddRoleSuccess: vi.fn(),
  onAddRoleError: vi.fn(),
  onRemoveRoleSuccess: vi.fn(),
  onRemoveRoleError: vi.fn(),
};

function renderDomain() {
  return renderHook(() => useDomainAdminUsuarios(noopOptions));
}

function queryRegistration() {
  return reactQueryMocks.useQuery.mock.calls[0][0] as {
    queryKey: readonly unknown[];
    queryFn: () => Promise<unknown>;
  };
}

// Ordem de registro: createUser, addRole, removeRole
function mutationRegistrations() {
  return reactQueryMocks.useMutation.mock.calls.map(
    ([o]) => o as { mutationFn: (input: unknown) => Promise<unknown> }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  rlsMocks.assertCanPerform.mockResolvedValue(undefined);
  functionsInvoke.mockResolvedValue({ data: { id: 'novo' }, error: null });
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
});

describe('useDomainAdminUsuarios — query de usuários com papéis', () => {
  it('registra a query key canônica', () => {
    renderDomain();
    expect(queryRegistration().queryKey).toEqual(['admin-all-users']);
  });

  it('seleciona perfis ordenados e agrega os papéis por usuário', async () => {
    setDbResult('profiles', 'select', {
      data: [
        { id: 'u1', first_name: 'Ana', last_name: 'A', email: 'ana@x.com' },
        { id: 'u2', first_name: 'Bruno', last_name: 'B', email: 'bruno@x.com' },
      ],
      error: null,
    });
    setDbResult('user_roles', 'select', {
      data: [
        { user_id: 'u1', role: 'admin' },
        { user_id: 'u1', role: 'lider' },
        { user_id: 'u2', role: 'team_member' },
      ],
      error: null,
    });
    renderDomain();

    const result = await queryRegistration().queryFn();

    expect(callsFor('profiles', 'select')[0].args).toEqual(['id, first_name, last_name, email']);
    expect(callsFor('profiles', 'order')[0].args).toEqual(['first_name']);
    expect(callsFor('user_roles', 'select')[0].args).toEqual(['user_id, role']);
    expect(result).toEqual([
      { id: 'u1', first_name: 'Ana', last_name: 'A', email: 'ana@x.com', roles: ['admin', 'lider'] },
      { id: 'u2', first_name: 'Bruno', last_name: 'B', email: 'bruno@x.com', roles: ['team_member'] },
    ]);
  });

  it('propaga erro ao buscar perfis', async () => {
    const error = new Error('falha perfis');
    setDbResult('profiles', 'select', { data: null, error });
    renderDomain();

    await expect(queryRegistration().queryFn()).rejects.toBe(error);
  });

  it('propaga erro ao buscar papéis', async () => {
    const error = new Error('falha papéis');
    setDbResult('profiles', 'select', { data: [], error: null });
    setDbResult('user_roles', 'select', { data: null, error });
    renderDomain();

    await expect(queryRegistration().queryFn()).rejects.toBe(error);
  });
});

describe('useDomainAdminUsuarios — mutation createUser', () => {
  it('invoca a edge function create-team-member com o corpo mapeado', async () => {
    const input: CreateAdminUsuarioInput = {
      email: 'novo@x.com',
      password: 'segredo',
      firstName: 'Novo',
      lastName: 'Usuário',
      roles: ['team_member'],
    };
    renderDomain();

    await mutationRegistrations()[0].mutationFn(input);

    expect(functionsInvoke).toHaveBeenCalledWith('create-team-member', {
      body: {
        email: 'novo@x.com',
        password: 'segredo',
        firstName: 'Novo',
        lastName: 'Usuário',
        roles: ['team_member'],
      },
    });
  });

  it('propaga erro da edge function', async () => {
    const error = new Error('falha function');
    functionsInvoke.mockResolvedValueOnce({ data: null, error });
    renderDomain();

    await expect(
      mutationRegistrations()[0].mutationFn({
        email: 'x',
        password: 'y',
        firstName: 'A',
        lastName: 'B',
        roles: [],
      })
    ).rejects.toBe(error);
  });
});

describe('useDomainAdminUsuarios — mutation addRole', () => {
  it('insere o papel vinculado ao usuário', async () => {
    renderDomain();

    await mutationRegistrations()[1].mutationFn({ userId: 'u1', role: 'admin' });

    expect(callsFor('user_roles', 'insert')[0].args).toEqual([{ user_id: 'u1', role: 'admin' }]);
  });

  it('propaga erro do insert', async () => {
    const error = new Error('falha insert');
    setDbResult('user_roles', 'insert', { data: null, error });
    renderDomain();

    await expect(
      mutationRegistrations()[1].mutationFn({ userId: 'u1', role: 'admin' })
    ).rejects.toBe(error);
  });
});

describe('useDomainAdminUsuarios — mutation removeRole', () => {
  it('faz precheck com o id real e exclui filtrando por user_id e role', async () => {
    setDbResult('user_roles', 'select', { data: { id: 'role-1' }, error: null });
    renderDomain();

    await mutationRegistrations()[2].mutationFn({ userId: 'u1', role: 'admin' });

    expect(callsFor('user_roles', 'select')[0].args).toEqual(['id']);
    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('user_roles', 'delete', 'role-1');
    expect(callsFor('user_roles', 'delete')).toHaveLength(1);
    const deleteFilters = dbCalls
      .filter((c) => c.table === 'user_roles' && c.method === 'eq')
      .map((c) => c.args);
    // dois pares de eq: um do sample (select) e um do delete
    expect(deleteFilters).toEqual([
      ['user_id', 'u1'],
      ['role', 'admin'],
      ['user_id', 'u1'],
      ['role', 'admin'],
    ]);
  });

  it('não faz precheck quando não encontra o vínculo mas ainda executa o delete', async () => {
    setDbResult('user_roles', 'select', { data: null, error: null });
    renderDomain();

    await mutationRegistrations()[2].mutationFn({ userId: 'u1', role: 'admin' });

    expect(rlsMocks.assertCanPerform).not.toHaveBeenCalled();
    expect(callsFor('user_roles', 'delete')).toHaveLength(1);
  });

  it('propaga erro do delete', async () => {
    const error = new Error('falha delete');
    setDbResult('user_roles', 'select', { data: { id: 'role-1' }, error: null });
    setDbResult('user_roles', 'delete', { data: null, error });
    renderDomain();

    await expect(
      mutationRegistrations()[2].mutationFn({ userId: 'u1', role: 'admin' })
    ).rejects.toBe(error);
  });
});
