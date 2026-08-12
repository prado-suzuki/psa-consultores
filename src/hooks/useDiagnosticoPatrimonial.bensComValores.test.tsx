import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// B9 — a lista de bens lê o valor DERIVADO. O TypeScript não olha para dentro da
// string do select, e um nome de relação errado vira 400 do PostgREST que
// derruba a tela inteira: este arquivo trava o select pedido e o formato da
// linha devolvida. A regra de derivação em si tem teste próprio
// (src/lib/osg/valoresDoBem.test.ts).
//
// Trava também a COERÊNCIA do cache: como a lista passou a depender de
// `matricula`, toda mutação de matrícula precisa derrubá-la, senão a linha e o
// rodapé "Total contábil" mostram o número velho por até 60s (staleTime) e, na
// prática, até um reload.

const invalidateQueries = vi.hoisted(() => vi.fn());
const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/hooks/useAuditLog', () => ({ useAuditLog: () => ({ logAction: vi.fn() }) }));

import {
  useBensByCliente,
  useDeleteMatricula,
  useSetMatriculaBem,
  useUpsertMatricula,
  type MatriculaRow,
} from '@/hooks/useDiagnosticoPatrimonial';
import { supabase } from '@/integrations/supabase/client';

interface DbCall {
  method: string;
  args: unknown[];
}

const dbCalls: DbCall[] = [];
const linhas: unknown[] = [];

function makeSupabaseChain() {
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order']) {
    chain[method] = vi.fn((...args: unknown[]) => {
      dbCalls.push({ method, args });
      return chain;
    });
  }
  chain.then = (onFulfilled: (r: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve({ data: linhas, error: null }).then(onFulfilled);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  linhas.length = 0;
  reactQueryMocks.useQuery.mockImplementation((options: Record<string, unknown>) => ({
    ...options,
    data: undefined,
    isFetching: false,
  }));
  reactQueryMocks.useQueryClient.mockReturnValue({ invalidateQueries });
  vi.mocked(supabase.from).mockImplementation(() => makeSupabaseChain() as never);
});

/** As chaves invalidadas por uma mutação, na ordem em que foram pedidas. */
const chavesInvalidadas = () =>
  invalidateQueries.mock.calls.map(([arg]) => (arg as { queryKey: unknown[] }).queryKey);

async function rodarQuery() {
  renderHook(() => useBensByCliente('cliente-1'));
  const registro = reactQueryMocks.useQuery.mock.calls
    .map(([o]) => o as Record<string, unknown>)
    .find((q) => JSON.stringify(q.queryKey) === JSON.stringify(['bens-by-cliente', 'cliente-1']));
  if (!registro) throw new Error('Query de bens não registrada');
  return (await (registro.queryFn as () => Promise<unknown[]>)()) as Array<Record<string, unknown>>;
}

// Cenário do aceite (B9), fora do caso MMS: uma fazenda desmembrada em DUAS
// matrículas e uma participação societária sem matrícula nenhuma.
const FAZENDA_DUAS_MATRICULAS = {
  id: 'bem-1', cliente_id: 'cliente-1', referencia_dp: 'IR-01', denominacao: 'Fazenda Boa Vista',
  tipo_bem: 'IR', vlr_contabil: null, vlr_mercado: null,
  matricula: [
    { vlr_contabil: 558_413.55, vlr_mercado: 900_000 },
    { vlr_contabil: 241_586.45, vlr_mercado: 400_000 },
  ],
};

const QUOTAS_SEM_MATRICULA = {
  id: 'bem-2', cliente_id: 'cliente-1', referencia_dp: 'PS-01', denominacao: 'Quotas Alfa',
  tipo_bem: 'PS', vlr_contabil: 12.5, vlr_mercado: 30,
  matricula: [],
};

describe('useBensByCliente — valores derivados', () => {
  it('pede as colunas de valor da matrícula embutida, sem perder o recorte do cliente', async () => {
    await rodarQuery();
    expect(dbCalls).toContainEqual({
      method: 'select',
      args: ['*, matricula ( vlr_contabil, vlr_mercado )'],
    });
    expect(dbCalls).toContainEqual({ method: 'eq', args: ['cliente_id', 'cliente-1'] });
  });

  it('devolve a soma das matrículas no bem que as tem e o digitado no que não tem', async () => {
    linhas.push(FAZENDA_DUAS_MATRICULAS, QUOTAS_SEM_MATRICULA);
    const [fazenda, quotas] = await rodarQuery();

    expect(fazenda.valores).toEqual({
      contabil: { valor: 800_000, comValor: 2 },
      mercado: { valor: 1_300_000, comValor: 2 },
      origem: 'matriculas',
      matriculas: 2,
    });
    expect(quotas.valores).toEqual({
      contabil: { valor: 12.5, comValor: 0 },
      mercado: { valor: 30, comValor: 0 },
      origem: 'bem',
      matriculas: 0,
    });
  });

  it('não devolve o array de matrículas como se fosse coluna do bem', async () => {
    linhas.push(FAZENDA_DUAS_MATRICULAS);
    const [fazenda] = await rodarQuery();
    expect(fazenda).not.toHaveProperty('matricula');
    // A coluna legada continua na linha, intocada: quem grava não a copia.
    expect(fazenda.vlr_contabil).toBeNull();
  });
});

// A matrícula gravada é o valor do bem na lista. Estes testes seguram o caminho
// que reabre o B9 sem tocar em nenhuma linha da tela: mutar a matrícula e deixar
// a lista de bens no cache antigo.
describe('coerência da lista de bens com as mutações de matrícula', () => {
  const matricula = {
    id: 'mat-1', bem_id: 'bem-1', numero: '9.617', vlr_contabil: 558_413.55,
  } as unknown as MatriculaRow;

  it('editar a matrícula (onde o valor é digitado) derruba a lista de bens', async () => {
    const { result } = renderHook(() => useUpsertMatricula());
    await (result.current as unknown as {
      onSuccess: (r: { row: MatriculaRow; original: MatriculaRow | null }) => Promise<void>;
    }).onSuccess({ row: matricula, original: matricula });

    expect(chavesInvalidadas()).toContainEqual(['bens-by-cliente']);
  });

  it('excluir a matrícula devolve o bem ao valor dele, e a lista precisa saber', async () => {
    const { result } = renderHook(() => useDeleteMatricula());
    await (result.current as unknown as {
      onSuccess: (m: MatriculaRow) => Promise<void>;
    }).onSuccess(matricula);

    expect(chavesInvalidadas()).toContainEqual(['bens-by-cliente']);
  });

  it('vincular/desvincular move o valor de um bem para o outro', async () => {
    const { result } = renderHook(() => useSetMatriculaBem());
    await (result.current as unknown as {
      onSuccess: (r: {
        row: MatriculaRow; previousBemId: string | null; bemId: string | null;
      }) => Promise<void>;
    }).onSuccess({ row: matricula, previousBemId: 'bem-1', bemId: 'bem-2' });

    expect(chavesInvalidadas()).toContainEqual(['bens-by-cliente']);
    // Sem o cliente na chave de propósito: `MatriculaRow` não carrega
    // `cliente_id`, e o React Query casa a chave por prefixo.
    expect(chavesInvalidadas()).not.toContainEqual(['bens-by-cliente', 'cliente-1']);
  });
});
