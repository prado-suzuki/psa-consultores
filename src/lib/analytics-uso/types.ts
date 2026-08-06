/**
 * Contrato do dashboard nativo "Controle de uso e envio" (migracao do Looker
 * Studio). Estes tipos descrevem a resposta de tres endpoints do Cloud Run que
 * ainda NAO existem — por enquanto os payloads sao servidos dos fixtures em
 * `__fixtures__/`, gerados de producao por `scripts/dump-analytics-fixtures.ts`.
 *
 * O corte em tres saiu por FONTE, nao por dashboard nem por grafico:
 *   /filtros      -> as duas views, sem periodo (opcoes nao podem encolher com o filtro)
 *   /api-consumo  -> psa_analytics.VW_ANL_USO_API
 *   /arquivos     -> psa_analytics.VW_ANL_GERAL_ARQUIVOS
 *
 * Assim nenhuma agregacao e escrita duas vezes, e o dashboard gerencial (a
 * fazer) reaproveita os mesmos payloads em vez de exigir endpoints proprios.
 *
 * Convencoes:
 *   - taxas e `pct` sao razao 0..1; a formatacao para "%" e do componente
 *   - `mes` e 'YYYY-MM' e ja vem ordenado por data
 *   - datas soltas sao 'YYYY-MM-DD'
 *   - latencias em milissegundos
 */

// ── Filtros ────────────────────────────────────────────────────────────

export interface UsuarioOpcao {
  usuario: string;
  email: string | null;
  /** Conta de servico / ingestao automatica, nao uma pessoa. */
  automacao: boolean;
}

export interface AnalyticsUsoFiltrosResponse {
  periodo: {
    apiMin: string | null;
    apiMax: string | null;
    arquivosMin: string | null;
    arquivosMax: string | null;
  };
  ferramentas: string[];
  endpoints: string[];
  metodos: string[];
  tiposOperacao: string[];
  statusCodes: number[];
  usuariosApi: UsuarioOpcao[];
  usuariosArquivos: Array<{ usuario: string; automacao: boolean }>;
  tiposArquivo: string[];
  causasErro: string[];
  clientes: string[];
  /** IDs observados nas views. Os nomes ficam no front enquanto o BigQuery
   * não expõe a dimensão de estrutura organizacional. */
  clusters: string[];
}

// ── Uso da API ─────────────────────────────────────────────────────────

export interface PeriodoAplicado {
  inicio: string;
  fim: string;
}

export interface ApiTotais {
  chamadas: number;
  erros: number;
  taxaErro: number;
  /** 5xx = falha do servidor. 4xx = chamador (rota errada, payload invalido).
   *  Somados num `taxaErro` unico, um esconde o outro. */
  erros5xx: number;
  erros4xx: number;
  taxa5xx: number;
  latMediaMs: number;
  latP50Ms: number;
  /** Sobre TODO o trafego. O Looker calculava so sobre as chamadas com cliente
   *  resolvido (17% do total) e por isso reportava ~1/3 do valor real. */
  latP95Ms: number;
  endpointsAtivos: number;
  usuariosAtivos: number;
  diasAtivos: number;
}

export interface ApiPorMes {
  mes: string;
  chamadas: number;
  erros: number;
  taxaErro: number;
  latMediaMs: number;
  latP50Ms: number;
  latP95Ms: number;
}

export interface ApiPorStatus {
  statusCode: number;
  /** '2xx' | '4xx' | '5xx' … derivado do statusCode. */
  faixa: string;
  chamadas: number;
}

export interface ApiPorEndpoint {
  endpoint: string;
  ferramenta: string | null;
  chamadas: number;
  erros: number;
  taxaErro: number;
  /** 5xx = falha do servidor. 4xx = chamador (rota errada, payload invalido).
   *  Somados num `taxaErro` unico, um esconde o outro. */
  erros5xx: number;
  erros4xx: number;
  taxa5xx: number;
  latMediaMs: number;
  latP50Ms: number;
  latP95Ms: number;
}

export interface ApiPorFerramenta {
  ferramenta: string;
  chamadas: number;
  erros: number;
  taxaErro: number;
  /** 5xx = falha do servidor. 4xx = chamador (rota errada, payload invalido).
   *  Somados num `taxaErro` unico, um esconde o outro. */
  erros5xx: number;
  erros4xx: number;
  taxa5xx: number;
  latMediaMs: number;
  latP50Ms: number;
  latP95Ms: number;
  usuarios: number;
}

export interface ApiPorTipoOperacao {
  tipoOperacao: string;
  chamadas: number;
  erros: number;
}

export interface ApiPorMetodo {
  metodo: string;
  chamadas: number;
  erros: number;
}

export interface ApiPorUsuario {
  usuario: string;
  email: string | null;
  /** Ação aberta por natureza: consultar dado, extrair arquivo, sincronizar. */
  acoesConsulta: number;
  acoesDownload: number;
  acoesSincronizacao: number;
  clusterId: string | null;
  /** Filtrar por este campo no componente — nao vem excluido do payload. */
  automacao: boolean;
  chamadas: number;
  erros: number;
  latMediaMs: number;
  diasAtivos: number;
  ferramentasUsadas: number;
}

export interface GerencialApiPorMes {
  mes: string;
  /** Pessoas, nunca contas de serviço. */
  usuariosAtivos: number;
  /** Primeiro uso observado na série histórica disponível. */
  usuariosNovos: number;
  /** Pessoas ativas neste mês que também estiveram ativas no mês anterior. */
  usuariosRetidos: number;
  usuariosBaseRetencao: number;
  /** Nulo no primeiro mes, porque ainda nao existe base anterior comparavel. */
  taxaRetencao: number | null;
  chamadas: number;
  chamadasPorUsuario: number;
  ferramentasAtivas: number;
  taxaSucesso: number;
}

export interface GerencialApiPorClusterMes extends GerencialApiPorMes {
  clusterId: string | null;
}

export interface GerencialApiPorFerramenta {
  ferramenta: string;
  usuariosAtivos: number;
  chamadas: number;
  coberturaUsuarios: number;
  taxaSucesso: number;
}

export interface GerencialApiPorClusterFerramenta extends GerencialApiPorFerramenta {
  clusterId: string | null;
}

export interface GerencialApiPorCluster {
  clusterId: string | null;
  usuariosAtivos: number;
  usuariosNovos: number;
  chamadas: number;
  chamadasPorUsuario: number;
  ferramentasAtivas: number;
  taxaSucesso: number;
}

export interface ApiGerencial {
  /** Início da série disponível; o primeiro mês é baseline, não adoção confiável. */
  inicioHistorico: string | null;
  porMes: GerencialApiPorMes[];
  porClusterMes: GerencialApiPorClusterMes[];
  porFerramenta: GerencialApiPorFerramenta[];
  porClusterFerramenta: GerencialApiPorClusterFerramenta[];
  porCluster: GerencialApiPorCluster[];
}

export interface AnalyticsUsoApiResponse {
  periodo: PeriodoAplicado;
  totais: ApiTotais;
  porMes: ApiPorMes[];
  porStatus: ApiPorStatus[];
  porEndpoint: ApiPorEndpoint[];
  porFerramenta: ApiPorFerramenta[];
  porTipoOperacao: ApiPorTipoOperacao[];
  porMetodo: ApiPorMetodo[];
  porUsuario: ApiPorUsuario[];
  gerencial: ApiGerencial;
}

// ── Envio de arquivos ──────────────────────────────────────────────────

export interface ArquivosTotais {
  enviados: number;
  erros: number;
  /** Falhas em que o documento NAO chegou a base — a perda de verdade. */
  naoEntraram: number;
  /** Falhas de documento que ja estava na base: reenvio sem efeito, nao perda. */
  reenvios: number;
  arquivosAusentesDistintos: number;
  taxaErro: number;
  arquivosDistintosComErro: number;
  pastasComErro: number;
  usuariosAtivos: number;
  /** Linhas da view sem `data_ingestao` — invisiveis a qualquer recorte por
   *  periodo. Exposto de proposito: sao 197.055 de 222.653 (88,5%). */
  registrosSemDataIngestao: number;
  registrosTotaisNaView: number;
  /** Volume da automacao, fora de todos os demais blocos. Fica aqui como
   *  contexto: sem isso o robo some do dashboard sem explicacao. */
  automacaoEnviados: number;
  automacaoErros: number;
}

export interface ArquivosPorMes {
  mes: string;
  enviados: number;
  naoEntraram: number;
  reenvios: number;
  erros: number;
  taxaErro: number;
}

export interface ArquivosPorTipo {
  tipoArquivo: string;
  enviados: number;
  erros: number;
  taxaErro: number;
}

export interface ArquivosPorCausa {
  causa: string;
  /** 'ausente' = documento nao entrou. 'reenvio' = ja estava na base. */
  impacto: 'ausente' | 'reenvio';
  erros: number;
  /** Erros > arquivosDistintos = mesmo arquivo tentado varias vezes. */
  arquivosDistintos: number;
  pct: number;
}

export interface ArquivosPorUsuario {
  usuario: string;
  clusterId: string | null;
  automacao: boolean;
  enviados: number;
  erros: number;
  naoEntraram: number;
  erroDuplicidade: number;
  erroNamespace: number;
  erroContribuinte: number;
  /** O unico bucket que representa erro atribuivel a pessoa. */
  erroNaoClassificado: number;
  arquivosDistintosComErro: number;
  ultimoErro: string | null;
}

export interface ArquivosPorPasta {
  pasta: string;
  cliente: string | null;
  erros: number;
  arquivosDistintos: number;
}

export interface ArquivosGerencialPorMes {
  mes: string;
  enviados: number;
  erros: number;
  taxaErro: number;
  usuariosAtivosHumanos: number;
  enviadosAutomacao: number;
  participacaoAutomacao: number;
  falhasNaoClassificadas: number;
}

export interface ArquivosGerencialPorClusterMes extends ArquivosGerencialPorMes {
  clusterId: string | null;
}

export interface ArquivosGerencialPorCluster extends Omit<ArquivosGerencialPorMes, 'mes'> {
  clusterId: string | null;
}

export interface ArquivosGerencial {
  porMes: ArquivosGerencialPorMes[];
  porClusterMes: ArquivosGerencialPorClusterMes[];
  porCluster: ArquivosGerencialPorCluster[];
}

export interface ArquivosPorCliente {
  cliente: string;
  enviados: number;
  naoEntraram: number;
  reenvios: number;
  erros: number;
  taxaErro: number;
  tiposArquivo: number;
}

export interface AnalyticsArquivosResponse {
  periodo: PeriodoAplicado;
  totais: ArquivosTotais;
  porMes: ArquivosPorMes[];
  porTipo: ArquivosPorTipo[];
  porCausa: ArquivosPorCausa[];
  porUsuario: ArquivosPorUsuario[];
  porPasta: ArquivosPorPasta[];
  porCliente: ArquivosPorCliente[];
  gerencial: ArquivosGerencial;
}

// ── Filtros aplicados pelo usuario ─────────────────────────────────────

export interface AnalyticsUsoFiltros {
  inicio: string;
  fim: string;
  /** Nome exato observado nas views. Quando presente, todos os blocos do
   *  payload sao recalculados para a mesma pessoa. */
  usuario?: string;
  /** Recorta a visao de API por ferramenta. Nao se aplica a ingestao de
   *  arquivos: aquela view nao tem esse eixo. */
  ferramenta?: string;
  /** Reservado para o dashboard gerencial: recorta pelo cluster do gestor.
   *  Ambas as views ja expoem `cluster_id`. */
  clusterId?: string;
}
