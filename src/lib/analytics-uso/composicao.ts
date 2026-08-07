/**
 * Composições leves feitas sobre os dois payloads já agregados pelo BigQuery.
 * Nenhuma função deste módulo conhece transporte ou linhas brutas das views.
 */
import type {
  AnalyticsArquivosResponse,
  AnalyticsGerencialPorMes,
  AnalyticsGerencialPorPessoa,
  AnalyticsGerencialResponse,
  AnalyticsUsoApiResponse,
  AnalyticsUsoCatalogo,
  GerencialApiPorFerramenta,
} from '@/lib/analytics-uso/types';

function valoresUnicosOrdenados(valores: Array<string | null | undefined>): string[] {
  return [...new Set(valores.filter((valor): valor is string => Boolean(valor)))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );
}

/** Catálogo estável derivado das consultas-base, sem exigir uma terceira rota. */
export function montarCatalogoAnalytics(
  usoApi: AnalyticsUsoApiResponse,
  arquivos: AnalyticsArquivosResponse,
): AnalyticsUsoCatalogo {
  return {
    ferramentas: valoresUnicosOrdenados(
      usoApi.porFerramenta.map((item) => item.ferramenta),
    ),
    usuariosApi: usoApi.porUsuario
      .map(({ usuario, email, automacao }) => ({ usuario, email, automacao }))
      .sort((a, b) => a.usuario.localeCompare(b.usuario, 'pt-BR')),
    usuariosArquivos: arquivos.porUsuario
      .map(({ usuario, automacao }) => ({ usuario, automacao }))
      .sort((a, b) => a.usuario.localeCompare(b.usuario, 'pt-BR')),
    clusters: valoresUnicosOrdenados([
      ...usoApi.porUsuario.map((item) => item.clusterId),
      ...arquivos.porUsuario.map((item) => item.clusterId),
      ...usoApi.gerencial.porCluster.map((item) => item.clusterId),
      ...arquivos.gerencial.porCluster.map((item) => item.clusterId),
    ]),
  };
}

function montarPessoas(
  usoApi: AnalyticsUsoApiResponse,
  arquivos: AnalyticsArquivosResponse,
  clusterId?: string,
): AnalyticsGerencialPorPessoa[] {
  const pessoas = new Map<string, AnalyticsGerencialPorPessoa>();
  const obter = (usuario: string) => {
    const existente = pessoas.get(usuario);
    if (existente) return existente;
    const novo: AnalyticsGerencialPorPessoa = {
      usuario,
      acoesConsulta: 0,
      acoesDownload: 0,
      chamadas: 0,
      diasAtivos: 0,
      ferramentasUsadas: 0,
      documentosEnviados: 0,
    };
    pessoas.set(usuario, novo);
    return novo;
  };

  for (const item of usoApi.porUsuario) {
    if (item.automacao || (clusterId && item.clusterId !== clusterId)) continue;
    Object.assign(obter(item.usuario), {
      acoesConsulta: item.acoesConsulta,
      acoesDownload: item.acoesDownload,
      chamadas: item.chamadas,
      diasAtivos: item.diasAtivos,
      ferramentasUsadas: item.ferramentasUsadas,
    });
  }
  for (const item of arquivos.porUsuario) {
    if (item.automacao || (clusterId && item.clusterId !== clusterId)) continue;
    obter(item.usuario).documentosEnviados = item.enviados;
  }

  return [...pessoas.values()].sort((a, b) => a.usuario.localeCompare(b.usuario, 'pt-BR'));
}

function montarFerramentas(
  usoApi: AnalyticsUsoApiResponse,
  clusterId?: string,
): GerencialApiPorFerramenta[] {
  if (!clusterId) return usoApi.gerencial.porFerramenta;
  return usoApi.gerencial.porClusterFerramenta
    .filter((item) => item.clusterId === clusterId)
    .map(({ ferramenta, usuariosAtivos, chamadas, coberturaUsuarios, taxaSucesso }) => ({
      ferramenta,
      usuariosAtivos,
      chamadas,
      coberturaUsuarios,
      taxaSucesso,
    }));
}

function montarSerie(
  usoApi: AnalyticsUsoApiResponse,
  arquivos: AnalyticsArquivosResponse,
  clusterId?: string,
  inicio = usoApi.periodo.inicio,
  fim = usoApi.periodo.fim,
): AnalyticsGerencialPorMes[] {
  const api = clusterId
    ? usoApi.gerencial.porClusterMes.filter((item) => item.clusterId === clusterId)
    : usoApi.gerencial.porMes;
  const arquivosPorMes = clusterId
    ? arquivos.gerencial.porClusterMes.filter((item) => item.clusterId === clusterId)
    : arquivos.gerencial.porMes;
  const arquivosPorChave = new Map(arquivosPorMes.map((item) => [item.mes, item]));

  const mesInicial = inicio.slice(0, 7);
  const mesFinal = fim.slice(0, 7);
  return api
    .filter((item) => item.mes >= mesInicial && item.mes <= mesFinal)
    .map((item) => {
      const arquivosMes = arquivosPorChave.get(item.mes);
      return {
        mes: item.mes,
        usuariosAtivos: item.usuariosAtivos,
        usuariosNovos: item.usuariosNovos,
        usuariosRetidos: item.usuariosRetidos,
        usuariosBaseRetencao: item.usuariosBaseRetencao,
        taxaRetencao: item.taxaRetencao,
        chamadas: item.chamadas,
        chamadasPorUsuario: item.chamadasPorUsuario,
        ferramentasAtivas: item.ferramentasAtivas,
        taxaSucesso: item.taxaSucesso,
        arquivosEnviadosHumanos: arquivosMes
          ? Math.max(0, arquivosMes.enviados - arquivosMes.enviadosAutomacao)
          : 0,
      };
    });
}

/**
 * Une somente agregados prontos das duas fontes. Métricas de retenção, adoção,
 * latência e classificação continuam calculadas nas SQLs do backend.
 */
export function montarGerencialAnalytics(
  usoApi: AnalyticsUsoApiResponse,
  arquivos: AnalyticsArquivosResponse,
  clusterId?: string,
  usuario?: string,
  inicio = usoApi.periodo.inicio,
  fim = usoApi.periodo.fim,
): AnalyticsGerencialResponse {
  const porPessoa = montarPessoas(usoApi, arquivos, clusterId);
  const porMes = montarSerie(usoApi, arquivos, clusterId, inicio, fim);
  const porFerramenta = montarFerramentas(usoApi, clusterId);
  const totalAcoes = porMes.reduce(
    (total, item) => total + item.chamadas + item.arquivosEnviadosHumanos,
    0,
  );

  return {
    periodo: { inicio, fim },
    escopo: { clusterId: clusterId ?? null, usuario: usuario ?? null },
    totais: {
      pessoasAtivas: porPessoa.length,
      usuariosNovos: porMes.reduce((total, item) => total + item.usuariosNovos, 0),
      totalAcoes,
      acoesPorPessoa: porPessoa.length ? totalAcoes / porPessoa.length : 0,
      ferramentasUtilizadas: porFerramenta.filter((item) => item.usuariosAtivos > 0).length,
    },
    porMes,
    porFerramenta,
    porPessoa,
  };
}
