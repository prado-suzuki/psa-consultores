/**
 * Golden-master de `useSetDashboardAccess`.
 *
 * Escrito junto com a tipagem das junções: a sincronia deixou de receber
 * `(table: string, column: string)` e passou a ramificar por tabela, então a
 * ORDEM das operações e a FORMA dos payloads mudaram de lugar no código sem
 * poder mudar de comportamento. É isso que este arquivo trava.
 *
 * O que está travado, e por que cada um importa:
 *   · quem sincroniza e quem é limpo, por `filter_type` — trocar os dois daria
 *     a um dashboard de cliente o acesso por cluster, que é ampliação de acesso;
 *   · a ordem select → delete → insert, porque um insert antes do delete
 *     violaria a unicidade da junção;
 *   · o payload do insert, coluna por coluna;
 *   · linha que já existe e continua desejada NÃO é apagada nem reinserida (era
 *     o ponto do `syncJunction`, e um "apaga tudo e reinsere" passaria em
 *     qualquer teste mais frouxo).
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import { useSetDashboardAccess } from '@/hooks/useDashboardAccess';
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
  for (const method of ['select', 'insert', 'delete', 'eq', 'in']) {
    chain[method] = vi.fn((...args: unknown[]) => {
      dbCalls.push({ table, method, args });
      if (['select', 'insert', 'delete'].includes(method)) operation = method;
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

/** A sequência de (tabela, método) na ordem exata em que o hook as chamou. */
function sequencia() {
  return dbCalls.map((c) => `${c.table}.${c.method}`);
}
function chamada(table: string, method: string) {
  return dbCalls.find((c) => c.table === table && c.method === method);
}

function mutationRegistrada() {
  const calls = reactQueryMocks.useMutation.mock.calls;
  return calls[calls.length - 1][0] as {
    mutationFn: (input: unknown) => Promise<unknown>;
    onSuccess: () => void;
  };
}

beforeEach(() => {
  dbCalls.length = 0;
  dbResults.clear();
  vi.clearAllMocks();
  (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation((table: string) =>
    makeSupabaseChain(table),
  );
});

describe('useSetDashboardAccess', () => {
  it('filter_type cluster: sincroniza a junção de cluster e LIMPA a de cliente', async () => {
    setDbResult('dashboard_cluster_access', 'select', { data: [], error: null });
    renderHook(() => useSetDashboardAccess());

    await mutationRegistrada().mutationFn({
      dashboardId: 'dash-1',
      filterType: 'cluster',
      clusterIds: ['c1'],
      clienteIds: ['ignorado'],
    });

    expect(sequencia()).toEqual([
      'dashboard_cluster_access.select',
      'dashboard_cluster_access.eq',
      'dashboard_cluster_access.insert',
      'dashboard_cliente_access.delete',
      'dashboard_cliente_access.eq',
    ]);
    expect(chamada('dashboard_cluster_access', 'insert')?.args[0]).toEqual([
      { dashboard_id: 'dash-1', cluster_id: 'c1', created_by: 'user-1' },
    ]);
    expect(chamada('dashboard_cliente_access', 'eq')?.args).toEqual(['dashboard_id', 'dash-1']);
  });

  it('filter_type cliente: sincroniza a junção de cliente e LIMPA a de cluster', async () => {
    setDbResult('dashboard_cliente_access', 'select', { data: [], error: null });
    renderHook(() => useSetDashboardAccess());

    await mutationRegistrada().mutationFn({
      dashboardId: 'dash-2',
      filterType: 'cliente',
      clusterIds: ['ignorado'],
      clienteIds: ['cli-9'],
    });

    expect(sequencia()).toEqual([
      'dashboard_cliente_access.select',
      'dashboard_cliente_access.eq',
      'dashboard_cliente_access.insert',
      'dashboard_cluster_access.delete',
      'dashboard_cluster_access.eq',
    ]);
    expect(chamada('dashboard_cliente_access', 'insert')?.args[0]).toEqual([
      { dashboard_id: 'dash-2', cliente_id: 'cli-9', created_by: 'user-1' },
    ]);
  });

  it('filter_type nenhum cai no ramo de cluster — é o `else`, não um terceiro caminho', async () => {
    setDbResult('dashboard_cluster_access', 'select', { data: [], error: null });
    renderHook(() => useSetDashboardAccess());

    await mutationRegistrada().mutationFn({
      dashboardId: 'dash-3',
      filterType: 'nenhum',
      clusterIds: [],
      clienteIds: [],
    });

    // Lista vazia: nada a apagar, nada a inserir — só a leitura e a limpeza da outra.
    expect(sequencia()).toEqual([
      'dashboard_cluster_access.select',
      'dashboard_cluster_access.eq',
      'dashboard_cliente_access.delete',
      'dashboard_cliente_access.eq',
    ]);
  });

  it('apaga só o que saiu, insere só o que entrou, e preserva o que ficou', async () => {
    setDbResult('dashboard_cluster_access', 'select', {
      data: [
        { id: 'linha-fica', cluster_id: 'c-fica' },
        { id: 'linha-sai', cluster_id: 'c-sai' },
      ],
      error: null,
    });
    renderHook(() => useSetDashboardAccess());

    await mutationRegistrada().mutationFn({
      dashboardId: 'dash-4',
      filterType: 'cluster',
      clusterIds: ['c-fica', 'c-entra'],
      clienteIds: [],
    });

    // O delete vai por ID DA LINHA, não pelo alvo.
    expect(chamada('dashboard_cluster_access', 'in')?.args).toEqual(['id', ['linha-sai']]);
    // `c-fica` não é reinserido.
    expect(chamada('dashboard_cluster_access', 'insert')?.args[0]).toEqual([
      { dashboard_id: 'dash-4', cluster_id: 'c-entra', created_by: 'user-1' },
    ]);
    // E o delete acontece ANTES do insert.
    const seq = sequencia();
    expect(seq.indexOf('dashboard_cluster_access.delete')).toBeLessThan(
      seq.indexOf('dashboard_cluster_access.insert'),
    );
  });

  it('erro na leitura da junção sobe, e nada é apagado', async () => {
    setDbResult('dashboard_cluster_access', 'select', {
      data: null,
      error: { message: 'permission denied' },
    });
    renderHook(() => useSetDashboardAccess());

    await expect(
      mutationRegistrada().mutationFn({
        dashboardId: 'dash-5',
        filterType: 'cluster',
        clusterIds: ['c1'],
        clienteIds: [],
      }),
    ).rejects.toMatchObject({ message: 'permission denied' });

    expect(sequencia()).toEqual([
      'dashboard_cluster_access.select',
      'dashboard_cluster_access.eq',
    ]);
  });
});
