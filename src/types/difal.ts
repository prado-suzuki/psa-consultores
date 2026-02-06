// Tipos para a ferramenta DIFAL Inteligente

// Tipos de decisão válidos
export type TipoDecisao = 'REGRA_SELECIONADA' | 'SEM_ST' | 'ISENTO' | 'NAO_APLICAVEL';

// Item da resposta da API agrupada (novo endpoint)
export interface DifalApiGroupedItem {
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
export interface DifalApiGroupedResponse {
  items: DifalApiGroupedItem[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
  qtd_validados: number;
  qtd_pendentes: number;
}

// Item agrupado para a tabela (formato usado na UI)
export interface DifalGroupedItem {
  groupKey: string;           // "nome|codigo|ncm"
  xProd: string;
  cod_produto: string;
  cod_ncm: string;
  id_contribuinte: string;
  
  // Dados do item
  cfop: string;
  cst_icms: string | null;
  aliq_icms: number | null;
  pRedBC: number | null;
  
  // Agregações
  count: number;
  totalValue: number;
  nfesCount: number;
  
  // Status
  status: 'validado' | 'pendente';
  classificacao?: ClassificacaoExistente | null;
}

// Regra ICMS-ST retornada pela API
export interface RegraICMSST {
  id: string;
  tipo_st: string;
  aliquota_st: number;
  percentual_reducao: number | null;
  base_legal: string;
}

// Resposta da API de regras NCM
export interface NCMRegraInfo {
  descricao: string;
  regras: RegraICMSST[];
}

export interface NCMRegrasResponse {
  [ncm: string]: NCMRegraInfo;
}

// Classificação existente
export interface ClassificacaoExistente {
  decisao: TipoDecisao;
  id_icms_st: string | null;
  aliquota_st: number | null;
  percentual_reducao: number | null;
  classificado_em: string;
  classificado_por: string;
}

// Mapa de classificações (resposta da API)
export interface ClassificacoesBuscarResponse {
  [chave: string]: ClassificacaoExistente | null;
}

// Payload para buscar classificações
export interface ClassificacaoBuscarItem {
  id_contribuinte: string;
  cod_produto: string;
  cod_ncm: string;
}

export interface ClassificacoesBuscarPayload {
  itens: ClassificacaoBuscarItem[];
}

// Payload para sincronizar decisões
export interface SyncDecisao {
  id_contribuinte: string;
  cod_produto: string;
  cod_ncm: string;
  decisao: TipoDecisao;
  id_icms_st: string | null;
}

export interface SyncPayload {
  sessao_id?: string;
  decisoes: SyncDecisao[];
}

export interface SyncResponse {
  sucesso: boolean;
  total_processado: number;
  total_inserido: number;
  total_atualizado: number;
  erros: string[];
}

// Payload para buscar regras NCM
export interface NCMRegrasPayload {
  ncms: string[];
  uf: string;
}
