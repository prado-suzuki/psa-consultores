export interface ApuracaoFiltros {
  inicio?: string;
  fim?: string;
  ufs: string[];
  anexos: string[];
}

export interface CalculadoraFiltrosResponse {
  ufs: string[];
  anexos: string[];
  periodo: { min: string | null; max: string | null };
}

export interface AgregadoTotais {
  faturamento: number;
  tributoAntes: number;
  tributoDepois: number;
  tributoDepoisIbsCbs: number;
  tributoDepoisIcmsMonof: number;
  cargaAntesPct: number;
  cargaDepoisPct: number;
  deltaPp: number;
  qtdNotas: number;
  qtdItens: number;
  aliqNominalMediaTributada: number;
  faturamentoTributado: number;
}

export interface QuebraSegmento {
  faturamento: number;
  tributoAntes: number;
  tributoDepois: number;
  qtdItens: number;
  qtdNFs: number;
}

export interface QuebraNatureza {
  exportacao: QuebraSegmento;
  interno: QuebraSegmento;
  monofasico: QuebraSegmento;
  plurifasico: QuebraSegmento;
}

export interface ComposicaoTributosAntes {
  vICMS: number;
  vICMSST: number;
  vIPI: number;
  vPIS: number;
  vPIS_ST: number;
  vCOFINS: number;
  vCOFINS_ST: number;
}

export interface AgregadoMes {
  mes: string;
  faturamento: number;
  tributoAntes: number;
  tributoDepois: number;
}

export interface CalculadoraResumoResponse {
  totais: AgregadoTotais;
  composicaoAntes: ComposicaoTributosAntes;
  porMes: AgregadoMes[];
  quebra: QuebraNatureza;
}

export interface AgregadoAnexo {
  anexo: string;
  faturamento: number;
  tributoAntes: number;
  tributoDepois: number;
  aliqMedia: number;
  reducaoMedia: number;
  cargaPct: number;
  qtdItens: number;
  qtdNFs: number;
}

export interface CalculadoraPorAnexoResponse {
  faturamentoTotal: number;
  porAnexo: AgregadoAnexo[];
}

export interface AgregadoProduto {
  ncm: string;
  xProdExemplo: string;
  produtosDistintos: number;
  anexo: string;
  qtd: number;
  faturamento: number;
  aliqIbsCbs: number;
  tributoAntes: number;
  tributoDepois: number;
  deltaRs: number;
  deltaPp: number;
  qtdNFs: number;
  monofasico: "todos" | "alguns" | "nenhum";
  exportacao: "todos" | "alguns" | "nenhum";
}

export interface CalculadoraPorProdutoResponse {
  porProduto: AgregadoProduto[];
}
