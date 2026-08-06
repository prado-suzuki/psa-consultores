import { describe, expect, it } from 'vitest';
import type {
  AnalyticsArquivosResponse,
  AnalyticsUsoApiResponse,
  ArquivosGerencialPorMes,
  GerencialApiPorMes,
} from './types';
import {
  filtrarMesesFechados,
  mesEstaParcial,
  montarAtividadePessoas,
  resumirGerencial,
  rotuloCluster,
} from './metricas';

const mesApi = (mes: string, usuariosAtivos: number): GerencialApiPorMes => ({
  mes,
  usuariosAtivos,
  usuariosNovos: 1,
  usuariosRetidos: Math.max(0, usuariosAtivos - 1),
  usuariosBaseRetencao: usuariosAtivos,
  taxaRetencao: usuariosAtivos > 0 ? (usuariosAtivos - 1) / usuariosAtivos : 0,
  chamadas: usuariosAtivos * 10,
  chamadasPorUsuario: usuariosAtivos > 0 ? 10 : 0,
  ferramentasAtivas: 3,
  taxaSucesso: 0.98,
});

const mesArquivos = (mes: string): ArquivosGerencialPorMes => ({
  mes,
  enviados: 90,
  erros: 10,
  taxaErro: 0.1,
  usuariosAtivosHumanos: 4,
  enviadosAutomacao: 60,
  participacaoAutomacao: 2 / 3,
  falhasNaoClassificadas: 2,
});

const usoApiFixture = (): AnalyticsUsoApiResponse => ({
  periodo: { inicio: '2026-01-01', fim: '2026-08-06' },
  totais: {
    chamadas: 100,
    erros: 2,
    erros5xx: 1,
    erros4xx: 1,
    taxaErro: 0.02,
    taxa5xx: 0.01,
    latMediaMs: 400,
    latP50Ms: 250,
    latP95Ms: 900,
    endpointsAtivos: 5,
    usuariosAtivos: 8,
    diasAtivos: 20,
  },
  porMes: [],
  porStatus: [],
  porEndpoint: [],
  porFerramenta: [],
  porTipoOperacao: [],
  porMetodo: [],
  porUsuario: [],
  gerencial: {
    inicioHistorico: '2026-01-12',
    porMes: [mesApi('2026-06', 6), mesApi('2026-07', 8), mesApi('2026-08', 3)],
    porClusterMes: [
      { ...mesApi('2026-07', 5), clusterId: 'cluster-tax' },
      { ...mesApi('2026-07', 3), clusterId: 'cluster-osg' },
      { ...mesApi('2026-08', 2), clusterId: 'cluster-osg' },
    ],
    porFerramenta: [
      {
        ferramenta: 'Consulta XML',
        usuariosAtivos: 6,
        chamadas: 80,
        coberturaUsuarios: 0.75,
        taxaSucesso: 0.99,
      },
    ],
    porClusterFerramenta: [
      {
        clusterId: 'cluster-osg',
        ferramenta: 'Consulta XML',
        usuariosAtivos: 3,
        chamadas: 30,
        coberturaUsuarios: 1,
        taxaSucesso: 1,
      },
    ],
    porCluster: [
      {
        clusterId: 'cluster-osg',
        usuariosAtivos: 3,
        usuariosNovos: 1,
        chamadas: 30,
        chamadasPorUsuario: 10,
        ferramentasAtivas: 1,
        taxaSucesso: 1,
      },
    ],
  },
});

const arquivosFixture = (): AnalyticsArquivosResponse => ({
  periodo: { inicio: '2026-01-01', fim: '2026-08-06' },
  totais: {
    enviados: 90,
    erros: 10,
    naoEntraram: 6,
    reenvios: 4,
    arquivosAusentesDistintos: 5,
    taxaErro: 0.1,
    arquivosDistintosComErro: 8,
    pastasComErro: 2,
    usuariosAtivos: 4,
    registrosSemDataIngestao: 900,
    registrosTotaisNaView: 1000,
    automacaoEnviados: 0,
    automacaoErros: 0,
  },
  porMes: [],
  porTipo: [],
  porCausa: [],
  porUsuario: [],
  porPasta: [],
  porCliente: [],
  gerencial: {
    porMes: [mesArquivos('2026-07'), mesArquivos('2026-08')],
    porClusterMes: [
      { ...mesArquivos('2026-07'), clusterId: 'cluster-osg' },
      { ...mesArquivos('2026-08'), clusterId: 'cluster-osg' },
    ],
    porCluster: [{ ...mesArquivos('2026-07'), clusterId: 'cluster-osg' }],
  },
});

describe('filtrarMesesFechados', () => {
  it('exclui o mês parcial do fim do período', () => {
    const serie = [mesApi('2026-07', 8), mesApi('2026-08', 3)];
    expect(filtrarMesesFechados(serie, '2026-08-06').map((item) => item.mes)).toEqual(['2026-07']);
  });

  it('mantém o mês quando o período termina no último dia', () => {
    expect(filtrarMesesFechados([mesApi('2026-07', 8)], '2026-07-31')).toHaveLength(1);
  });

  it('identifica explicitamente o mês parcial', () => {
    expect(mesEstaParcial('2026-08', '2026-08-06')).toBe(true);
    expect(mesEstaParcial('2026-07', '2026-07-31')).toBe(false);
  });
});

describe('resumirGerencial', () => {
  // Regra mudou por decisao de produto: excluir o mes corrente deixava o painel
  // com ate 30 dias de atraso. Agora ele entra e a parcialidade e declarada.
  it('usa o mês mais recente, inclusive o corrente, e sinaliza que está em curso', () => {
    const resumo = resumirGerencial(usoApiFixture(), arquivosFixture());
    expect(resumo.mesReferencia).toBe('2026-08');
    expect(resumo.mesReferenciaParcial).toBe(true);
    expect(resumo.apiMes?.usuariosAtivos).toBe(3);
    expect(resumo.serie.map((item) => item.mes)).toEqual(['2026-06', '2026-07', '2026-08']);
  });

  it('não marca parcial quando o período termina no último dia do mês', () => {
    const uso = usoApiFixture();
    uso.periodo = { inicio: '2026-01-01', fim: '2026-08-31' };
    expect(resumirGerencial(uso, arquivosFixture()).mesReferenciaParcial).toBe(false);
  });

  it('aplica o cluster também às séries e às ferramentas', () => {
    const resumo = resumirGerencial(usoApiFixture(), arquivosFixture(), 'cluster-osg');
    expect(resumo.apiMes?.usuariosAtivos).toBe(2);
    expect(resumo.serie).toHaveLength(2);
    expect(resumo.ferramentas[0]?.usuariosAtivos).toBe(3);
    expect(
      resumo.arquivosMes && 'clusterId' in resumo.arquivosMes ? resumo.arquivosMes.clusterId : null,
    ).toBe('cluster-osg');
  });
});

describe('rotuloCluster', () => {
  it('preserva nomes conhecidos e não exibe UUID inteiro no fallback', () => {
    expect(rotuloCluster('0523512c-f980-4236-8a7c-53e06c9c7a80')).toBe('PSA OSG');
    expect(rotuloCluster('cluster-desconhecido-123')).toBe('Cluster cluster-d');
    expect(rotuloCluster(null)).toBe('Sem vínculo');
  });
});

describe('montarAtividadePessoas', () => {
  it('une as duas fontes, aplica a unidade e ignora automações', () => {
    const uso = usoApiFixture();
    uso.porUsuario = [
      {
        usuario: 'Ana',
        email: null,
        clusterId: 'cluster-osg',
        automacao: false,
        chamadas: 12,
        acoesConsulta: 10,
        acoesDownload: 2,
        acoesSincronizacao: 0,
        erros: 0,
        latMediaMs: 100,
        diasAtivos: 3,
        ferramentasUsadas: 2,
      },
      {
        usuario: 'Zelia',
        email: null,
        clusterId: 'outro',
        automacao: false,
        chamadas: 8,
        acoesConsulta: 8,
        acoesDownload: 0,
        acoesSincronizacao: 0,
        erros: 0,
        latMediaMs: 100,
        diasAtivos: 2,
        ferramentasUsadas: 1,
      },
    ];
    const arquivos = arquivosFixture();
    arquivos.porUsuario = [
      {
        usuario: 'Ana',
        clusterId: 'cluster-osg',
        automacao: false,
        enviados: 30,
        erros: 0,
        naoEntraram: 0,
        erroDuplicidade: 0,
        erroNamespace: 0,
        erroContribuinte: 0,
        erroNaoClassificado: 0,
        arquivosDistintosComErro: 0,
        ultimoErro: null,
      },
    ];

    expect(montarAtividadePessoas(uso, arquivos, 'cluster-osg')).toEqual([
      {
        usuario: 'Ana',
        chamadas: 12,
        diasAtivos: 3,
        ferramentasUsadas: 2,
        acoesConsulta: 10,
        acoesDownload: 2,
        documentosEnviados: 30,
      },
    ]);
  });
});
