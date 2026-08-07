import { describe, expect, it } from 'vitest';
import {
  calcularMediana,
  prepararGerencialViewModel,
  prepararSaudeApiViewModel,
} from './viewModels';
import type { AnalyticsGerencialResponse, AnalyticsUsoApiResponse } from './types';

describe('calcularMediana', () => {
  it('usa o centro para uma quantidade ímpar', () => {
    expect(calcularMediana([20, 5, 10])).toBe(10);
  });

  it('faz a média dos dois valores centrais para uma quantidade par', () => {
    expect(calcularMediana([40, 10, 30, 20])).toBe(25);
  });
});

describe('prepararSaudeApiViewModel', () => {
  it('calcula taxa ponderada no recorte e usa o pior p95 mensal sem somá-lo', () => {
    const dados = {
      periodo: { inicio: '2026-01-01', fim: '2026-02-28' },
      totais: {
        chamadas: 300,
        erros: 30,
        taxaErro: 0.1,
        latP95Ms: 9_000,
      },
      porMes: [
        { mes: '2026-01', chamadas: 100, erros: 20, taxaErro: 0.2, latP95Ms: 8_000 },
        { mes: '2026-02', chamadas: 200, erros: 10, taxaErro: 0.05, latP95Ms: 9_000 },
      ],
      porStatus: [],
      porEndpoint: [],
    } as unknown as AnalyticsUsoApiResponse;

    const viewModel = prepararSaudeApiViewModel(dados, 1);

    expect(viewModel.totais).toMatchObject({
      chamadas: 200,
      erros: 10,
      taxaErro: 0.05,
      latP95Ms: 9_000,
    });
  });

  it('não compara um mês corrente parcial com um mês fechado', () => {
    const dados = {
      periodo: { inicio: '2026-07-01', fim: '2026-08-06' },
      totais: { chamadas: 130, erros: 0, taxaErro: 0, latP95Ms: 1_000 },
      porMes: [
        { mes: '2026-07', chamadas: 100, erros: 0, taxaErro: 0, latP95Ms: 1_000 },
        { mes: '2026-08', chamadas: 30, erros: 0, taxaErro: 0, latP95Ms: 900 },
      ],
      porStatus: [],
      porEndpoint: [],
    } as unknown as AnalyticsUsoApiResponse;

    expect(prepararSaudeApiViewModel(dados, 1).comparacaoChamadas).toMatchObject({
      atual: 30,
      anterior: null,
      pct: null,
      rotulo: 'mês atual em curso',
    });
  });
});

describe('prepararGerencialViewModel', () => {
  it('usa os KPIs consolidados da API sem recalculá-los pelas listas de detalhe', () => {
    const dados: AnalyticsGerencialResponse = {
      periodo: { inicio: '2026-06-01', fim: '2026-08-06' },
      escopo: { clusterId: null, usuario: null },
      totais: {
        pessoasAtivas: 27,
        usuariosNovos: 4,
        totalAcoes: 15_000,
        acoesPorPessoa: 555.56,
        ferramentasUtilizadas: 9,
      },
      porMes: [],
      porFerramenta: [],
      porPessoa: [],
    };

    const viewModel = prepararGerencialViewModel(dados);

    expect(viewModel.totais).toEqual(dados.totais);
  });
});
