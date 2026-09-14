import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// `matricula.vlr_contabil` deixou de ser campo digitado e virou CACHE da soma do
// que cada titular declarou (decisão 7 do plano de 14/09/2026). Cache só é
// seguro enquanto alguém o mantém, e quem o mantém são as mutações de
// titularidade: este arquivo trava o fio inteiro, que nenhum teste de função
// pura alcança — a conta em si tem teste próprio em
// src/lib/osg/integralizacaoDaMatricula.test.ts.
//
// O que está em jogo se o fio arrebentar: o relatório do DP, a calculadora de
// ITCMD e o mapeador continuam lendo a coluna da matrícula. Ela desatualizada é
// contrato saindo com o valor velho, sem nenhum aviso na tela.

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
  useDeleteTitularidade,
  useUpsertTitularidade,
  type TitularidadeRow,
} from '@/hooks/useDiagnosticoPatrimonial';
import { supabase } from '@/integrations/supabase/client';

interface Chamada {
  tabela: string;
  metodo: string;
  args: unknown[];
}

const chamadas: Chamada[] = [];
/** O que a leitura das titularidades devolve. Cada teste monta o seu. */
let titularidadesNoBanco: unknown[] = [];
/** A linha que o insert/update de titularidade devolve. */
let linhaGravada: unknown = null;
/** Liga a falha da leitura, para provar que ela não derruba a mutação. */
let leituraFalha = false;

function chain(tabela: string) {
  const alvo: Record<string, unknown> = {};
  const registrar = (metodo: string) => vi.fn((...args: unknown[]) => {
    chamadas.push({ tabela, metodo, args });
    return alvo;
  });
  for (const metodo of ['select', 'eq', 'update', 'insert', 'delete', 'order']) {
    alvo[metodo] = registrar(metodo);
  }
  alvo.single = vi.fn(() => Promise.resolve({ data: linhaGravada, error: null }));
  alvo.then = (onFulfilled: (r: { data: unknown; error: unknown }) => unknown) => {
    const leituraDeTitularidade =
      tabela === 'titularidade' && chamadas.some((c) => c.tabela === 'titularidade' && c.metodo === 'select');
    if (leituraDeTitularidade && leituraFalha) {
      return Promise.resolve({ data: null, error: { message: 'boom' } }).then(onFulfilled);
    }
    return Promise.resolve({
      data: leituraDeTitularidade ? titularidadesNoBanco : [{ id: 'tit-1' }],
      error: null,
    }).then(onFulfilled);
  };
  return alvo;
}

beforeEach(() => {
  vi.clearAllMocks();
  chamadas.length = 0;
  titularidadesNoBanco = [];
  linhaGravada = null;
  leituraFalha = false;
  reactQueryMocks.useQuery.mockImplementation((options: Record<string, unknown>) => ({ ...options, data: undefined }));
  reactQueryMocks.useQueryClient.mockReturnValue({ invalidateQueries });
  vi.mocked(supabase.from).mockImplementation(((tabela: string) => chain(tabela)) as never);
});

/** O payload do último `update` feito na tabela `matricula`. */
const somaGravada = () =>
  chamadas.find((c) => c.tabela === 'matricula' && c.metodo === 'update')?.args[0] as
    | { vlr_contabil: number }
    | undefined;

const chavesInvalidadas = () =>
  invalidateQueries.mock.calls.map(([arg]) => (arg as { queryKey: unknown[] }).queryKey);

type MutationDeTitularidade = {
  mutationFn: (v: unknown) => Promise<unknown>;
  onSuccess: (r: never) => Promise<void>;
};

const TITULARIDADE_DA_MATRICULA = {
  id: 'tit-1', matricula_id: 'mat-1', bem_id: null, tipo: 'DIREITO',
  titular_pessoa_id: 'p-1', fracao: 50,
} as unknown as TitularidadeRow;

describe('a soma dos titulares mantém o cache de matricula.vlr_contabil', () => {
  it('salvar um titular relê a matrícula inteira e grava a SOMA, não o que foi digitado', async () => {
    linhaGravada = TITULARIDADE_DA_MATRICULA;
    titularidadesNoBanco = [
      { id: 'tit-1', titular_pessoa_id: 'p-1', tipo: 'DIREITO', fracao: 50, vlr_contabil: 60, vlr_integralizar: 50 },
      { id: 'tit-2', titular_pessoa_id: 'p-2', tipo: 'DIREITO', fracao: 50, vlr_contabil: 40, vlr_integralizar: 50 },
    ];
    const { result } = renderHook(() => useUpsertTitularidade());
    await (result.current as unknown as MutationDeTitularidade).mutationFn({
      values: { matricula_id: 'mat-1', titular_pessoa_id: 'p-1', tipo: 'DIREITO', vlr_contabil: 60 },
      original: TITULARIDADE_DA_MATRICULA,
    });

    expect(somaGravada()).toEqual({ vlr_contabil: 100 });
    expect(chamadas).toContainEqual({ tabela: 'matricula', metodo: 'eq', args: ['id', 'mat-1'] });
  });

  // As duas linhas da MESMA pessoa são a mesma titularidade: somar as duas
  // dobraria o valor do imóvel na primeira matrícula em que alguém tem posse de
  // fato e de direito, que é o cadastro que a casa mais faz.
  it('a linha de fato e a de direito da mesma pessoa contam UMA vez', async () => {
    linhaGravada = TITULARIDADE_DA_MATRICULA;
    titularidadesNoBanco = [
      { id: 'ft-1', titular_pessoa_id: 'p-1', tipo: 'FATO', fracao: 100, vlr_contabil: null, vlr_integralizar: null },
      { id: 'dt-1', titular_pessoa_id: 'p-1', tipo: 'DIREITO', fracao: 100, vlr_contabil: 250_000, vlr_integralizar: 250_000 },
    ];
    const { result } = renderHook(() => useUpsertTitularidade());
    await (result.current as unknown as MutationDeTitularidade).mutationFn({
      values: { matricula_id: 'mat-1', titular_pessoa_id: 'p-1', tipo: 'DIREITO' },
      original: TITULARIDADE_DA_MATRICULA,
    });

    expect(somaGravada()).toEqual({ vlr_contabil: 250_000 });
  });

  // Enquanto ninguém declarou, a coluna continua sendo o campo digitado no modal:
  // zerá-la apagaria o valor de todas as matrículas já cadastradas.
  it('nenhum titular com valor não toca na coluna da matrícula', async () => {
    linhaGravada = TITULARIDADE_DA_MATRICULA;
    titularidadesNoBanco = [
      { id: 'tit-1', titular_pessoa_id: 'p-1', tipo: 'DIREITO', fracao: 100, vlr_contabil: null, vlr_integralizar: null },
    ];
    const { result } = renderHook(() => useUpsertTitularidade());
    await (result.current as unknown as MutationDeTitularidade).mutationFn({
      values: { matricula_id: 'mat-1', titular_pessoa_id: 'p-1', tipo: 'DIREITO' },
      original: TITULARIDADE_DA_MATRICULA,
    });

    expect(somaGravada()).toBeUndefined();
  });

  it('titularidade ancorada em BEM não tem matrícula a sincronizar', async () => {
    const doBem = { ...TITULARIDADE_DA_MATRICULA, matricula_id: null, bem_id: 'bem-1' } as TitularidadeRow;
    linhaGravada = doBem;
    const { result } = renderHook(() => useUpsertTitularidade());
    await (result.current as unknown as MutationDeTitularidade).mutationFn({
      values: { bem_id: 'bem-1', titular_pessoa_id: 'p-1', tipo: 'DIREITO' },
      original: doBem,
    });

    expect(chamadas.some((c) => c.tabela === 'matricula')).toBe(false);
  });

  it('remover um titular recalcula a soma do que sobrou', async () => {
    titularidadesNoBanco = [
      { id: 'tit-2', titular_pessoa_id: 'p-2', tipo: 'DIREITO', fracao: 50, vlr_contabil: 40, vlr_integralizar: 40 },
    ];
    const { result } = renderHook(() => useDeleteTitularidade());
    await (result.current as unknown as MutationDeTitularidade).mutationFn(TITULARIDADE_DA_MATRICULA);

    expect(somaGravada()).toEqual({ vlr_contabil: 40 });
  });

  // A titularidade JÁ FOI GRAVADA quando o cache é recalculado: derrubar a
  // mutação aqui faria a tela anunciar falha sobre um dado que salvou.
  it('a falha do recálculo não derruba a gravação, e a tela é avisada', async () => {
    linhaGravada = TITULARIDADE_DA_MATRICULA;
    leituraFalha = true;
    const { result } = renderHook(() => useUpsertTitularidade());
    const salvo = await (result.current as unknown as MutationDeTitularidade).mutationFn({
      values: { matricula_id: 'mat-1', titular_pessoa_id: 'p-1', tipo: 'DIREITO' },
      original: TITULARIDADE_DA_MATRICULA,
    }) as { somaOk: boolean; row: TitularidadeRow };

    expect(salvo.row).toEqual(TITULARIDADE_DA_MATRICULA);
    expect(salvo.somaOk).toBe(false);
  });
});

describe('quem lê a soma precisa saber que ela mudou', () => {
  it('salvar um titular derruba as listas de matrícula e a de bens', async () => {
    const { result } = renderHook(() => useUpsertTitularidade());
    await (result.current as unknown as MutationDeTitularidade).onSuccess({
      row: TITULARIDADE_DA_MATRICULA, original: null, somaOk: true,
    } as never);

    const chaves = chavesInvalidadas();
    expect(chaves).toContainEqual(['titularidades-by-matricula', 'mat-1']);
    expect(chaves).toContainEqual(['matriculas-by-bem']);
    expect(chaves).toContainEqual(['matriculas-all']);
    expect(chaves).toContainEqual(['bens-by-cliente']);
  });

  it('remover um titular derruba as mesmas listas', async () => {
    const { result } = renderHook(() => useDeleteTitularidade());
    await (result.current as unknown as MutationDeTitularidade).onSuccess({
      titularidade: TITULARIDADE_DA_MATRICULA, somaOk: true,
    } as never);

    expect(chavesInvalidadas()).toContainEqual(['bens-by-cliente']);
    expect(chavesInvalidadas()).toContainEqual(['matriculas-all']);
  });
});
