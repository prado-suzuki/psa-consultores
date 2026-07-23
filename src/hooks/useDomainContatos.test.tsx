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

import { useInserirContato, type InserirContatoInput } from '@/hooks/useDomainContatos';
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
    mutationKey: readonly unknown[];
    mutationFn: (input: unknown) => Promise<unknown>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
});

describe('useDomainContatos — useInserirContato', () => {
  it('registra a mutation key canônica', () => {
    renderHook(() => useInserirContato());
    expect(mutationRegistration().mutationKey).toEqual(['contatos', 'inserir-publico']);
  });

  it('insere o contato normalizando opcionais vazios em null e mensagem sempre null', async () => {
    const contato: InserirContatoInput = {
      nome_completo: 'Maria',
      email: 'maria@exemplo.com',
      telefone: '',
      empresa: '',
      servico_interesse: 'consultoria',
      porte_empresa: '',
      como_conheceu: '',
    };
    renderHook(() => useInserirContato());

    await mutationRegistration().mutationFn(contato);

    expect(callsFor('contatos', 'insert')[0].args).toEqual([
      {
        nome_completo: 'Maria',
        email: 'maria@exemplo.com',
        telefone: null,
        empresa: null,
        servico_interesse: 'consultoria',
        porte_empresa: null,
        como_conheceu: null,
        mensagem: null,
      },
    ]);
  });

  it('preserva os opcionais quando preenchidos', async () => {
    const contato: InserirContatoInput = {
      nome_completo: 'João',
      email: 'joao@exemplo.com',
      telefone: '11999999999',
      empresa: 'ACME',
      servico_interesse: 'tributário',
      porte_empresa: 'grande',
      como_conheceu: 'indicação',
    };
    renderHook(() => useInserirContato());

    await mutationRegistration().mutationFn(contato);

    expect(callsFor('contatos', 'insert')[0].args).toEqual([
      {
        nome_completo: 'João',
        email: 'joao@exemplo.com',
        telefone: '11999999999',
        empresa: 'ACME',
        servico_interesse: 'tributário',
        porte_empresa: 'grande',
        como_conheceu: 'indicação',
        mensagem: null,
      },
    ]);
  });

  it('propaga erro do insert', async () => {
    const error = new Error('falha no insert');
    setDbResult('contatos', 'insert', { data: null, error });
    renderHook(() => useInserirContato());

    await expect(mutationRegistration().mutationFn({})).rejects.toBe(error);
  });
});
