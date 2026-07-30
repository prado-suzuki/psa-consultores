import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => ({ data: undefined, ...(options as object) })),
  // O hook importa `STALE_TIMES` de `@/lib/queryClient`, que instancia um
  // QueryClient no import — daí o construtor entrar no mock do módulo.
  QueryClient: class {},
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import {
  feedClientesQueryKey,
  useDomainFeedClientes,
} from '@/hooks/useDomainFeedClientes';
import { supabase } from '@/integrations/supabase/client';

interface DbCall {
  table: string;
  method: string;
  args: unknown[];
}

const dbCalls: DbCall[] = [];
const resultados = new Map<string, { data: unknown; error: unknown }>();

/** Encadeamento mínimo do client: registra as chamadas e resolve por tabela. */
function makeChain(table: string) {
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'in', 'eq']) {
    chain[method] = vi.fn((...args: unknown[]) => {
      dbCalls.push({ table, method, args });
      return chain;
    });
  }
  chain.then = (onFulfilled: (r: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(resultados.get(table) ?? { data: [], error: null }).then(
      onFulfilled,
      onRejected,
    );
  return chain;
}

function callsFor(table: string, method: string) {
  return dbCalls.filter((call) => call.table === table && call.method === method);
}

function registro() {
  const [options] = reactQueryMocks.useQuery.mock.calls.at(-1) as [
    {
      queryKey: readonly unknown[];
      queryFn: () => Promise<ReadonlyMap<string, string>>;
      enabled: boolean;
      staleTime: number;
    },
  ];
  return options;
}

beforeEach(() => {
  dbCalls.length = 0;
  resultados.clear();
  reactQueryMocks.useQuery.mockClear();
  vi.mocked(supabase.from).mockImplementation(
    (table: string) => makeChain(table) as unknown as ReturnType<typeof supabase.from>,
  );
});

describe('useDomainFeedClientes', () => {
  it('deduplica e ordena os ids na chave de cache', () => {
    renderHook(() => useDomainFeedClientes(['p2', 'p1', 'p2']));

    expect(registro().queryKey).toEqual(feedClientesQueryKey(['p1', 'p2']));
  });

  it('não consulta sem projeto na tela', () => {
    renderHook(() => useDomainFeedClientes([]));

    expect(registro().enabled).toBe(false);
  });

  it('resolve o nome do cliente por projeto em duas consultas', async () => {
    resultados.set('org_projects', {
      data: [
        { id: 'p1', external_client_id: 'cli1', ordem_servico_id: null },
        { id: 'p2', external_client_id: 'cli1', ordem_servico_id: null },
        { id: 'p3', external_client_id: null, ordem_servico_id: null },
      ],
      error: null,
    });
    resultados.set('cliente', { data: [{ id: 'cli1', nome: 'Frigorífico Vale' }], error: null });

    renderHook(() => useDomainFeedClientes(['p1', 'p2', 'p3']));
    const mapa = await registro().queryFn();

    expect([...mapa.entries()]).toEqual([
      ['p1', 'Frigorífico Vale'],
      ['p2', 'Frigorífico Vale'],
    ]);
    // Cliente repetido entre projetos entra uma vez só no `in`.
    expect(callsFor('cliente', 'in')[0].args).toEqual(['id', ['cli1']]);
    // Soft delete continua filtrado na leitura de cadastro (AGENTS.md).
    expect(callsFor('cliente', 'eq')[0].args).toEqual(['excluido', false]);
  });

  it('cai na ordem de serviço quando o projeto não tem cliente direto', async () => {
    resultados.set('org_projects', {
      data: [
        { id: 'p1', external_client_id: null, ordem_servico_id: 'os1' },
        { id: 'p2', external_client_id: null, ordem_servico_id: 'os1' },
        { id: 'p3', external_client_id: 'cli-direto', ordem_servico_id: 'os1' },
      ],
      error: null,
    });
    resultados.set('ordem_servico', { data: [{ id: 'os1', id_cliente: 'cli-os' }], error: null });
    resultados.set('cliente', {
      data: [
        { id: 'cli-os', nome: 'Fazenda Boa Vista' },
        { id: 'cli-direto', nome: 'Frigorífico Vale' },
      ],
      error: null,
    });

    renderHook(() => useDomainFeedClientes(['p1', 'p2', 'p3']));
    const mapa = await registro().queryFn();

    expect(mapa.get('p1')).toBe('Fazenda Boa Vista');
    expect(mapa.get('p2')).toBe('Fazenda Boa Vista');
    // Cliente direto tem precedência sobre o da OS, como no painel de tarefas.
    expect(mapa.get('p3')).toBe('Frigorífico Vale');
    // Só as OS dos projetos sem cliente direto entram na consulta.
    expect(callsFor('ordem_servico', 'in')[0].args).toEqual(['id', ['os1']]);
  });

  it('não consulta OS nem cliente quando nenhum projeto tem vínculo', async () => {
    resultados.set('org_projects', {
      data: [{ id: 'p1', external_client_id: null, ordem_servico_id: null }],
      error: null,
    });

    renderHook(() => useDomainFeedClientes(['p1']));
    const mapa = await registro().queryFn();

    expect(mapa.size).toBe(0);
    expect(callsFor('ordem_servico', 'select')).toHaveLength(0);
    expect(callsFor('cliente', 'select')).toHaveLength(0);
  });

  it('deixa o projeto fora do mapa quando a RLS esconde o cliente', async () => {
    // Cliente vinculado que não volta na segunda consulta: sem nome, sem entrada
    // — o bloco do feed simplesmente não mostra cliente.
    resultados.set('org_projects', {
      data: [{ id: 'p1', external_client_id: 'invisivel', ordem_servico_id: null }],
      error: null,
    });
    resultados.set('cliente', { data: [], error: null });

    renderHook(() => useDomainFeedClientes(['p1']));

    expect((await registro().queryFn()).size).toBe(0);
  });

  it('propaga erro da consulta de projetos', async () => {
    resultados.set('org_projects', { data: null, error: { message: 'boom' } });

    renderHook(() => useDomainFeedClientes(['p1']));

    await expect(registro().queryFn()).rejects.toEqual({ message: 'boom' });
  });

  it('devolve mapa vazio enquanto a consulta não respondeu', () => {
    const { result } = renderHook(() => useDomainFeedClientes(['p1']));

    expect(result.current.clientePorProjeto.size).toBe(0);
  });
});
