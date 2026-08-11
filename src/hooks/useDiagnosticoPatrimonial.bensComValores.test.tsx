import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// B9 — a lista de bens lê o valor DERIVADO. O TypeScript não olha para dentro da
// string do select, e um nome de relação errado vira 400 do PostgREST que
// derruba a tela inteira: este arquivo trava o select pedido e o formato da
// linha devolvida. A regra de derivação em si tem teste próprio
// (src/lib/osg/valoresDoBem.test.ts).

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/hooks/useAuditLog', () => ({ useAuditLog: () => ({ logAction: vi.fn() }) }));

import { useBensByCliente } from '@/hooks/useDiagnosticoPatrimonial';
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
  vi.mocked(supabase.from).mockImplementation(() => makeSupabaseChain() as never);
});

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
      vlr_contabil: 800_000, vlr_mercado: 1_300_000, origem: 'matriculas', matriculas: 2,
    });
    expect(quotas.valores).toEqual({
      vlr_contabil: 12.5, vlr_mercado: 30, origem: 'bem', matriculas: 0,
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
