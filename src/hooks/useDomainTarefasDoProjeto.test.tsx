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
  tarefasDoProjetoQueryKey,
  useDomainTarefasDoProjeto,
  type TarefaParaEscolha,
} from '@/hooks/useDomainTarefasDoProjeto';
import { supabase } from '@/integrations/supabase/client';

interface DbCall {
  method: string;
  args: unknown[];
}

const dbCalls: DbCall[] = [];
let resultado: { data: unknown; error: unknown } = { data: [], error: null };

/** Encadeamento mínimo do client: registra as chamadas e resolve no fim. */
function makeChain() {
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq']) {
    chain[method] = vi.fn((...args: unknown[]) => {
      dbCalls.push({ method, args });
      return chain;
    });
  }
  chain.order = vi.fn((...args: unknown[]) => {
    dbCalls.push({ method: 'order', args });
    return Promise.resolve(resultado);
  });
  return chain;
}

function registro() {
  const [options] = reactQueryMocks.useQuery.mock.calls.at(-1) as [
    {
      queryKey: readonly unknown[];
      queryFn: () => Promise<TarefaParaEscolha[]>;
      enabled: boolean;
      staleTime: number;
    },
  ];
  return options;
}

beforeEach(() => {
  dbCalls.length = 0;
  resultado = { data: [], error: null };
  reactQueryMocks.useQuery.mockClear();
  vi.mocked(supabase.from).mockImplementation(
    () => makeChain() as unknown as ReturnType<typeof supabase.from>,
  );
});

describe('useDomainTarefasDoProjeto', () => {
  it('não consulta enquanto não há projeto escolhido', () => {
    renderHook(() => useDomainTarefasDoProjeto(null));

    expect(registro().enabled).toBe(false);
    expect(registro().queryKey).toEqual(tarefasDoProjetoQueryKey(null));
  });

  it('pede só as três colunas da escolha, do projeto pedido, mais recente primeiro', async () => {
    resultado = {
      data: [{ id: 't1', title: 'Apurar PIS', status: 'in_progress' }],
      error: null,
    };

    renderHook(() => useDomainTarefasDoProjeto('p1'));
    const tarefas = await registro().queryFn();

    expect(tarefas).toEqual([{ id: 't1', title: 'Apurar PIS', status: 'in_progress' }]);
    expect(dbCalls).toEqual([
      { method: 'select', args: ['id, title, status'] },
      { method: 'eq', args: ['project_id', 'p1'] },
      { method: 'order', args: ['created_at', { ascending: false }] },
    ]);
    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('org_tasks');
  });

  it('propaga erro da consulta', async () => {
    resultado = { data: null, error: { message: 'boom' } };

    renderHook(() => useDomainTarefasDoProjeto('p1'));

    await expect(registro().queryFn()).rejects.toEqual({ message: 'boom' });
  });

  it('devolve lista vazia enquanto a consulta não respondeu', () => {
    const { result } = renderHook(() => useDomainTarefasDoProjeto('p1'));

    expect(result.current.tarefas).toEqual([]);
  });
});
