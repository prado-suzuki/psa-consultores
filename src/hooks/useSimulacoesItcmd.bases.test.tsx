import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * As duas bases na leitura: a integral nas colunas de sempre, a reduzida nas `_alternativa`. Na simulação
 * antiga, o percentual da simulação diz em que base estão as colunas de sempre.
 */

const mocks = vi.hoisted(() => ({ linhas: [] as unknown[] }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ order: async () => ({ data: mocks.linhas, error: null }) }),
      }),
    }),
  },
}));

import {
  apuracaoNaBase, totalDaCadeia, useSimulacoesItcmd, type SimulacaoSalva,
} from '@/hooks/useSimulacoesItcmd';

const valores = (base: [string, string, string], imposto: [string, string, string]) => ({
  vlr_base_contabil: base[0], vlr_base_itr: base[1], vlr_base_mercado: base[2],
  vlr_imposto_contabil: imposto[0], vlr_imposto_itr: imposto[1], vlr_imposto_mercado: imposto[2],
});

const alternativa = (base: [string, string, string], imposto: [string, string, string]) => ({
  pct_base_alternativa: '70.00',
  vlr_base_alternativa_contabil: base[0],
  vlr_base_alternativa_itr: base[1],
  vlr_base_alternativa_mercado: base[2],
  vlr_imposto_alternativo_contabil: imposto[0],
  vlr_imposto_alternativo_itr: imposto[1],
  vlr_imposto_alternativo_mercado: imposto[2],
});

/** Uma linha de `itcd_simulacao` como o PostgREST devolve, com as filhas embutidas. */
const linha = (campos: Record<string, unknown> = {}) => ({
  id: 'S1', versao: 1, empresa_pessoa_id: 'HOLDING', nome: null, status: 'gerada',
  competencia: '2026-09', vlr_upf: '263.78', quotas_total: 1000,
  created_at: '2026-09-24T12:00:00Z', observacao: null, origem_simulacao_id: null,
  vlr_acervo_contabil: '1000.00', vlr_acervo_itr: '900.00', vlr_acervo_mercado: '1100.00',
  com_reserva: true, pct_base_reserva: '100.00', pct_base_instituicao: '100.00',
  itcd_simulacao_doador: [], itcd_simulacao_donatario: [], itcd_simulacao_usufruto: [],
  itcd_simulacao_gia: [{
    doador_pessoa_id: 'D', donatario_pessoa_id: 'G', quotas_recebidas: 400, pct_da_gia: '100.0000',
    ...valores(['100.00', '90.00', '110.00'], ['10.00', '9.00', '11.00']),
    ...alternativa(['70.00', '63.00', '77.00'], ['7.00', '6.30', '7.70']),
  }],
  itcd_simulacao_concessao: [
    { de_pessoa_id: 'G', para_pessoa_id: 'D', origem: 'reserva', quotas: 400,
      ...valores([null, null, null] as never, [null, null, null] as never), pct_base_alternativa: null },
    { de_pessoa_id: 'G', para_pessoa_id: 'D', origem: 'instituicao', quotas: 50,
      ...valores(['5.00', '4.50', '5.50'], ['1.00', '0.50', '1.50']),
      ...alternativa(['3.50', '3.15', '3.85'], ['0.20', '0.10', '0.30']) },
  ],
  ...campos,
});

const ler = async (): Promise<SimulacaoSalva> => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const molde = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useSimulacoesItcmd('C1'), { wrapper: molde });
  await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));
  if (result.current.error) throw result.current.error;
  return result.current.data![0];
};

beforeEach(() => {
  mocks.linhas = [linha()];
});

describe('as duas bases, lidas do que foi gravado', () => {
  it('a integral nas colunas de sempre, a de 70% nas alternativas — na doação e na instituição', async () => {
    const s = await ler();
    expect(Object.keys(s.gias[0].porBase).sort()).toEqual(['100', '70']);
    expect(s.gias[0].porBase[100]!.impostoPorCenario.contabil).toBe('10.00');
    expect(s.gias[0].porBase[70]!.impostoPorCenario.contabil).toBe('7.00');

    const [reserva, instituicao] = s.concessoes;
    expect(reserva.porBase).toEqual({});
    expect(instituicao.porBase[100]!.basePorCenario.contabil).toBe('5.00');
    expect(instituicao.porBase[70]!.basePorCenario.contabil).toBe('3.50');

    // Os totais somam o que foi gravado, base por base.
    expect(s.doacaoPorBase[100]).toEqual({ contabil: '10.00', itr: '9.00', mercado: '11.00' });
    expect(s.doacaoPorBase[70]).toEqual({ contabil: '7.00', itr: '6.30', mercado: '7.70' });
    expect(s.totalPorBase[100]).toEqual({ contabil: '11.00', itr: '9.50', mercado: '12.50' });
    expect(s.totalPorBase[70]).toEqual({ contabil: '7.20', itr: '6.40', mercado: '8.00' });
  });

  it('SEM RESERVA a doação só existe em 100%, e vale nas duas visualizações', async () => {
    mocks.linhas = [linha({
      com_reserva: false,
      itcd_simulacao_gia: [{
        doador_pessoa_id: 'D', donatario_pessoa_id: 'G', quotas_recebidas: 400,
        pct_da_gia: '100.0000', pct_base_alternativa: null,
        ...valores(['100.00', '90.00', '110.00'], ['10.00', '9.00', '11.00']),
      }],
      itcd_simulacao_concessao: [],
    })];
    const s = await ler();
    expect(Object.keys(s.gias[0].porBase)).toEqual(['100']);
    // Não é falta: a redução de 70% é do usufruto, e aqui não há usufruto.
    expect(s.doacaoPorBase[70]).toEqual(s.doacaoPorBase[100]);
    expect(s.totalPorBase[70]).toEqual(s.totalPorBase[100]);
  });

  it('simulação gravada ANTES de 24/09/2026 tem uma base só: a do percentual da simulação', async () => {
    // Simulação antiga: a instituição gravada só em 70%.
    mocks.linhas = [linha({
      pct_base_instituicao: '70.00',
      itcd_simulacao_concessao: [{
        de_pessoa_id: 'G', para_pessoa_id: 'D', origem: 'instituicao', quotas: 50,
        pct_base_alternativa: null,
        ...valores(['3.50', '3.15', '3.85'], ['0.20', '0.10', '0.30']),
      }],
    })];
    const s = await ler();
    const inst = s.concessoes[0];
    expect(Object.keys(inst.porBase)).toEqual(['70']);
    // Pedida a integral, a leitura devolve a que existe e diz qual é — a tela marca
    // "gravada só em 70%" em vez de mostrar traço onde há número.
    expect(apuracaoNaBase(inst.porBase, '100')).toMatchObject({ base: '70' });
    expect(s.totalPorBase[100].contabil).toBe('10.20');
  });

  it('percentual gravado fora de 100% e 70% é erro, não chute', async () => {
    mocks.linhas = [linha({ pct_base_reserva: '85.00' })];
    await expect(ler()).rejects.toThrow(/fora de 100% e 70%/);
  });

  it('a cadeia soma cada ato na base em que está sendo vista', async () => {
    const s = await ler();
    const outro: SimulacaoSalva = { ...s, id: 'S0' };
    expect(totalDaCadeia([outro, s], 'contabil', () => '100')).toBe('22.00');
    expect(totalDaCadeia([outro, s], 'contabil', () => '70')).toBe('14.40');
    // O ato anterior em 100% e o aberto em 70%: 11,00 + 7,20.
    expect(totalDaCadeia([outro, s], 'contabil', (x) => (x.id === 'S0' ? '100' : '70'))).toBe('18.20');
  });
});
