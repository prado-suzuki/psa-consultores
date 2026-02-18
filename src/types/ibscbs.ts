// Tipos para a ferramenta Calculadora de IBS e CBS

// Tipos de decisão válidos
export type IbsCbsTipoDecisao = 'REGRA_SELECIONADA' | 'SEM_ST' | 'ISENTO' | 'NAO_APLICAVEL';

// Item da resposta da API agrupada
export interface IbsCbsApiGroupedItem {
  cProd: string;
  xProd: string;
  NCM: string;
  CFOP: string;
  CST: string | null;
  tot_itens: number;
  tot_nfes: number;
  vlr_total: number;
  aliq_prod: number | null;
  pRedBC: number | null;
}

// Resposta paginada da API agrupada
export interface IbsCbsApiGroupedResponse {
  items: IbsCbsApiGroupedItem[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
  qtd_validados: number;
  qtd_pendentes: number;
}

// Item agrupado para a tabela (formato usado na UI)
export interface IbsCbsGroupedItem {
  groupKey: string;
  xProd: string;
  cod_produto: string;
  cod_ncm: string;
  id_contribuinte: string;
  cfop: string;
  cst_icms: string | null;
  aliq_icms: number | null;
  pRedBC: number | null;
  count: number;
  totalValue: number;
  nfesCount: number;
  status: 'validado' | 'pendente';
  classificacao?: IbsCbsClassificacaoExistente | null;
}

// Regra ICMS-ST retornada pela API
export interface IbsCbsRegraICMSST {
  id: string;
  tipo_st: string;
  aliquota_st: number;
  percentual_reducao: number | null;
  base_legal: string;
  convenio: string | null;
  anexo: string | null;
}

// Resposta da API de regras NCM
export interface IbsCbsNCMRegraInfo {
  descricao: string;
  regras: IbsCbsRegraICMSST[];
}

export interface IbsCbsNCMRegrasResponse {
  [ncm: string]: IbsCbsNCMRegraInfo;
}

// Classificação existente
export interface IbsCbsClassificacaoExistente {
  decisao: IbsCbsTipoDecisao;
  id_icms_st: string | null;
  aliquota_st: number | null;
  percentual_reducao: number | null;
  classificado_em: string;
  classificado_por: string;
}

// Mapa de classificações (resposta da API)
export interface IbsCbsClassificacoesBuscarResponse {
  [chave: string]: IbsCbsClassificacaoExistente | null;
}

// Payload para buscar classificações
export interface IbsCbsClassificacaoBuscarItem {
  id_contribuinte: string;
  cod_produto: string;
  cod_ncm: string;
}

export interface IbsCbsClassificacoesBuscarPayload {
  itens: IbsCbsClassificacaoBuscarItem[];
}

// Payload para sincronizar decisões
export interface IbsCbsSyncDecisao {
  id_contribuinte: string;
  cod_produto: string;
  cod_ncm: string;
  cod_produto_svc: string;
  cod_ncm_nbs: string;
  decisao: IbsCbsTipoDecisao;
  id_icms_st: string | null;
}

export interface IbsCbsSyncPayload {
  sessao_id?: string;
  decisoes: IbsCbsSyncDecisao[];
}

export interface IbsCbsSyncResponse {
  sucesso: boolean;
  total_processado: number;
  total_inserido: number;
  total_atualizado: number;
  erros: string[];
}

// Payload para buscar regras NCM
export interface IbsCbsNCMRegrasPayload {
  ncms: string[];
  uf: string;
}
