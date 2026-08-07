import type {
  AnalyticsArquivosResponse,
  AnalyticsGerencialResponse,
  AnalyticsUsoApiResponse,
  ApiPorUsuario,
} from './types';
import { compararPeriodo, maximo, recortarSerie, somar } from './periodo';
import { mesEstaParcial } from './metricas';

export type ApiUsuarioViewModel = ApiPorUsuario & { taxaErro: number };

export function calcularMediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const ordenados = valores.slice().sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 0 ? (ordenados[meio - 1] + ordenados[meio]) / 2 : ordenados[meio];
}

function compararMetricaAditiva<T extends { mes: string }>(
  serie: T[],
  valor: (item: T) => number,
  mesesRecorte: number,
  fimPeriodo: string | undefined,
) {
  const comparacao = compararPeriodo(serie, valor, mesesRecorte);
  const ultimoMes = serie.at(-1)?.mes;
  if (mesesRecorte > 0 && fimPeriodo && ultimoMes && mesEstaParcial(ultimoMes, fimPeriodo)) {
    return { ...comparacao, anterior: null, pct: null, rotulo: 'mês atual em curso' };
  }
  return comparacao;
}

export function prepararSaudeApiViewModel(
  dados: AnalyticsUsoApiResponse | undefined,
  mesesRecorte: number,
) {
  const totaisBrutos = dados?.totais;
  const serieCompleta = dados?.porMes ?? [];
  const recorteAtivo = mesesRecorte > 0;
  const porMes = recortarSerie(serieCompleta, mesesRecorte).serie;
  const porStatus = dados?.porStatus ?? [];
  const porEndpoint = dados?.porEndpoint ?? [];
  const chamadas = somar(porMes, (item) => item.chamadas);
  const erros = somar(porMes, (item) => item.erros);

  return {
    totais: !dados
      ? undefined
      : recorteAtivo
        ? {
            ...totaisBrutos,
            chamadas,
            erros,
            taxaErro: chamadas > 0 ? erros / chamadas : 0,
            // Não é o p95 consolidado: é o pior p95 mensal disponível no fixture.
            latP95Ms: maximo(porMes, (item) => item.latP95Ms),
          }
        : totaisBrutos,
    serieCompleta,
    porMes,
    porStatus,
    porEndpoint,
    recorteAtivo,
    comparacaoChamadas: compararMetricaAditiva(
      serieCompleta,
      (item) => item.chamadas,
      mesesRecorte,
      dados?.periodo.fim,
    ),
    maxChamadas: porEndpoint.reduce((maior, item) => Math.max(maior, item.chamadas), 0),
    max5xx: porEndpoint.reduce((maior, item) => Math.max(maior, item.erros5xx), 0),
    max4xx: porEndpoint.reduce((maior, item) => Math.max(maior, item.erros4xx), 0),
    resumoStatus: porStatus
      .slice(0, 6)
      .map((item) => `${item.statusCode}: ${item.chamadas.toLocaleString('pt-BR')}`)
      .join(' · '),
  };
}

export function prepararUsoApiViewModel(
  dados: AnalyticsUsoApiResponse | undefined,
  mesesRecorte: number,
) {
  const totaisBrutos = dados?.totais;
  const serieCompleta = dados?.porMes ?? [];
  const recorteAtivo = mesesRecorte > 0;
  const porMes = recortarSerie(serieCompleta, mesesRecorte).serie;
  const porFerramenta = (dados?.porFerramenta ?? [])
    .slice()
    .sort((a, b) => b.chamadas - a.chamadas);
  const todosUsuarios = dados?.porUsuario ?? [];
  const usuarios: ApiUsuarioViewModel[] = todosUsuarios
    .filter((item) => !item.automacao)
    .map((item) => ({
      ...item,
      taxaErro: item.chamadas > 0 ? item.erros / item.chamadas : 0,
    }));

  return {
    totais: !dados
      ? undefined
      : recorteAtivo
        ? { ...totaisBrutos, chamadas: somar(porMes, (item) => item.chamadas) }
        : totaisBrutos,
    serieCompleta,
    porMes,
    porFerramenta,
    porTipoOperacao: dados?.porTipoOperacao ?? [],
    usuarios,
    chamadasAutomacao: todosUsuarios
      .filter((item) => item.automacao)
      .reduce((total, item) => total + item.chamadas, 0),
    medianaRequisicoes: calcularMediana(usuarios.map((item) => item.chamadas)),
    mediaRequisicoes: usuarios.length
      ? Math.round(usuarios.reduce((total, item) => total + item.chamadas, 0) / usuarios.length)
      : 0,
    comparacaoChamadas: compararMetricaAditiva(
      serieCompleta,
      (item) => item.chamadas,
      mesesRecorte,
      dados?.periodo.fim,
    ),
    picoMes: porMes.reduce<(typeof porMes)[number] | null>(
      (maior, item) => (!maior || item.chamadas > maior.chamadas ? item : maior),
      null,
    ),
    maxUsuario: usuarios.reduce((maior, item) => Math.max(maior, item.chamadas), 0),
  };
}

export function prepararArquivosViewModel(
  dados: AnalyticsArquivosResponse | undefined,
  mesesRecorte: number,
) {
  const totaisBrutos = dados?.totais;
  const serieCompleta = dados?.porMes ?? [];
  const recorteAtivo = mesesRecorte > 0;
  const porMes = recortarSerie(serieCompleta, mesesRecorte).serie;
  const porCliente = dados?.porCliente ?? [];
  const usuarios = dados?.porUsuario ?? [];

  return {
    totais: !dados
      ? undefined
      : recorteAtivo
        ? {
            ...totaisBrutos,
            enviados: somar(porMes, (item) => item.enviados),
            naoEntraram: somar(porMes, (item) => item.naoEntraram),
            reenvios: somar(porMes, (item) => item.reenvios),
          }
        : totaisBrutos,
    serieCompleta,
    porMes,
    porCausa: dados?.porCausa ?? [],
    porCliente,
    usuarios,
    maxEnviados: usuarios.reduce((maior, item) => Math.max(maior, item.enviados), 0),
    maxRejeitado: porCliente.reduce((maior, item) => Math.max(maior, item.naoEntraram), 0),
    comparacaoEnviados: compararMetricaAditiva(
      serieCompleta,
      (item) => item.enviados,
      mesesRecorte,
      dados?.periodo.fim,
    ),
    comparacaoRejeitados: compararMetricaAditiva(
      serieCompleta,
      (item) => item.naoEntraram,
      mesesRecorte,
      dados?.periodo.fim,
    ),
  };
}

export function prepararGerencialViewModel(dados: AnalyticsGerencialResponse | undefined) {
  const serie = dados?.porMes ?? [];
  const atividadePessoas = dados?.porPessoa ?? [];
  const ferramentasComUso = dados?.porFerramenta ?? [];
  const apiMes = serie.at(-1) ?? null;
  const mesReferenciaParcial = apiMes
    ? mesEstaParcial(apiMes.mes, dados?.periodo.fim ?? '')
    : false;

  return {
    totais: dados?.totais,
    apiMes,
    mesReferenciaParcial,
    atividadePessoas,
    pessoas: atividadePessoas.map((item) => item.usuario),
    serie,
    ferramentas: ferramentasComUso
      .slice()
      .sort((a, b) => b.usuariosAtivos - a.usuariosAtivos)
      .slice(0, 5),
  };
}
