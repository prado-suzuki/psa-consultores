// Tipos para a ferramenta DIFAL Inteligente

// Tipos de decisão válidos
export type TipoDecisao = 'REGRA_SELECIONADA' | 'SEM_ST' | 'ISENTO' | 'NAO_APLICAVEL';

// Item achatado da NFe
export interface DifalItem {
  // Identificadores únicos
  id_contribuinte: string;
  cod_produto: string;
  cod_ncm: string;
  
  // Dados do XML
  xProd: string;
  vProd: number;
  cfop: string;
  uf_emit: string;
  uf_dest: string;
  
  // Tributação entrada (ICMS)
  cst_icms: string | null;
  aliq_icms: number | null;
  
  // Referência à nota
  chave_nfe: string;
  nItem: number;
  
  // Status de classificação (preenchido após merge)
  status?: 'validado' | 'pendente';
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

// Item agrupado para a tabela (agregação por nome+codigo+ncm)
export interface DifalGroupedItem {
  groupKey: string;           // "nome|codigo|ncm"
  xProd: string;
  cod_produto: string;
  cod_ncm: string;
  id_contribuinte: string;
  
  // Dados do primeiro item (para exibição na tabela)
  uf_emit: string;
  uf_dest: string;
  cst_icms: string | null;
  aliq_icms: number | null;
  
  // Agregações (para o modal)
  count: number;
  totalValue: number;
  nfesCount: number;
  items: DifalItem[];
  
  // Status
  status: 'validado' | 'pendente';
  classificacao?: ClassificacaoExistente | null;
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

// Estrutura de produto dentro da NFe (simplificada)
export interface NFeProduto {
  nItem: number;
  cProd: string;
  xProd: string;
  NCM: string;
  CFOP: string;
  vProd: number;
  ICMS?: {
    CST?: string;
    pICMS?: number;
  };
}

// Estrutura simplificada da NFe
export interface NFeRecord {
  chave_nfe: string;
  emit: {
    UF: string;
    CNPJ?: string;
  };
  dest: {
    UF: string;
    CNPJ?: string;
  };
  produtos: NFeProduto[];
}
