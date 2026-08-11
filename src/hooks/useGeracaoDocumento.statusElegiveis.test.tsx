import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// B3 — o filtro de status da geração não pode ser literal. Este arquivo trava só
// isso: a query pergunta pelo CONJUNTO nomeado em `@/lib/osg/statusIntegralizacao`,
// de modo que incluir um status (p.ex. 'Integralizado', pendente de decisão do
// time) seja mudar uma linha daquele módulo, sem editar query nenhuma.
// (As colunas pedidas por estas queries têm cobertura em useGeracaoDocumento.test.tsx.)

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/hooks/useQualificacaoDasPartes', () => ({
  usePessoasByCliente: () => ({ data: [], isFetching: false }),
}));
vi.mock('@/hooks/useDiagnosticoPatrimonial', () => ({
  useBensByCliente: () => ({ data: [], isFetching: false }),
  useCartorios: () => ({ data: [], isFetching: false }),
}));

import { useIntegralizacoesAprovadas } from '@/hooks/useGeracaoDocumento';
import { supabase } from '@/integrations/supabase/client';
import { STATUS_ELEGIVEIS_PARA_INTEGRALIZACAO } from '@/lib/osg/statusIntegralizacao';

interface DbCall {
  method: string;
  args: unknown[];
}

const dbCalls: DbCall[] = [];
const linhasDeBem: unknown[] = [];

function makeSupabaseChain() {
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'in', 'order']) {
    chain[method] = vi.fn((...args: unknown[]) => {
      dbCalls.push({ method, args });
      return chain;
    });
  }
  chain.then = (onFulfilled: (r: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve({ data: linhasDeBem, error: null }).then(onFulfilled);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  linhasDeBem.length = 0;
  reactQueryMocks.useQuery.mockImplementation((options: Record<string, unknown>) => ({
    ...options,
    data: undefined,
    isFetching: false,
  }));
  vi.mocked(supabase.from).mockImplementation(() => makeSupabaseChain() as never);
});

async function rodarQuery() {
  renderHook(() => useIntegralizacoesAprovadas('empresa-1'));
  const registro = reactQueryMocks.useQuery.mock.calls
    .map(([o]) => o as Record<string, unknown>)
    .find((q) => JSON.stringify(q.queryKey) === JSON.stringify(['integralizacoes-geracao', 'empresa-1']));
  if (!registro) throw new Error('Query de integralizações não registrada');
  return (await (registro.queryFn as () => Promise<unknown[]>)()) as Array<{ numero: string | null }>;
}

// Cenário do aceite, fora do caso MMS (cujos bens eram 'Aprovado'/'Integralizado'):
// uma alteração contratual cujo imóvel foi aprovado em 2ª instância.
const BEM_APROVADO_2A_INSTANCIA = {
  id: 'bem-9', denominacao: 'Chácara São Roque', vlr_contabil: null, ccir_codigo: null,
  tipo_bem: 'IR', inscricao_municipal: null,
  endereco_logradouro: null, endereco_numero: null, endereco_complemento: null,
  endereco_bairro: null, endereco_cep: null, area_construida_m2: null,
  matricula: [
    {
      id: 'mat-9', numero: '9.617', livro: '2', folha: '1',
      municipio_imovel: 'Lucas do Rio Verde', uf_imovel: 'MT',
      area_documento: 284.861, area_unidade: 'ha', vlr_contabil: 558_413.55,
      confrontacoes_texto: null, descricao_psa_completa: null,
      tipo_bem: 'IR', tipo_exploracao_posse: null,
      cartorio: { nome_completo: 'Cartório de 1º Ofício', comarca: 'Lucas do Rio Verde', uf: 'MT' },
      titularidade: [],
      impedimento: [],
    },
  ],
};

describe('useIntegralizacoesAprovadas — status elegíveis', () => {
  it('filtra pelo conjunto nomeado, não por um literal na query', async () => {
    await rodarQuery();
    const filtroDeStatus = dbCalls.find(
      (c) => c.method === 'in' && c.args[0] === 'status_integralizacao',
    );
    expect(filtroDeStatus).toBeDefined();
    expect(filtroDeStatus!.args[1]).toEqual([...STATUS_ELEGIVEIS_PARA_INTEGRALIZACAO]);
    // O `.eq` literal de antes deixava de fora todo bem que não fosse 'Aprovado'.
    expect(dbCalls.some((c) => c.method === 'eq' && c.args[0] === 'status_integralizacao')).toBe(false);
    // O recorte por empresa de destino continua sendo `.eq`.
    expect(dbCalls).toContainEqual({
      method: 'eq',
      args: ['empresa_destino_pessoa_id', 'empresa-1'],
    });
  });

  it('leva ao documento a matrícula do bem aprovado em 2ª instância', async () => {
    expect(STATUS_ELEGIVEIS_PARA_INTEGRALIZACAO).toContain('Aprovado para 2ª Instancia');
    linhasDeBem.push(BEM_APROVADO_2A_INSTANCIA);
    const matriculas = await rodarQuery();
    expect(matriculas.map((m) => m.numero)).toEqual(['9.617']);
  });
});
