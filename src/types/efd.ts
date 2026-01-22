// Tipos para EFD Contribuições - Baseado na API Real

// Estrutura do arquivo EFD retornado pela API (campos em CAIXA ALTA)
export interface EFDArquivo {
  CNPJ: string;
  ID_ARQUIVO: string;
  COD_VER: string;
  TIPO_ESCRIT: number;        // 0 = Original, 1+ = Retificadora
  IND_SIT_ESP: string | null;
  NUM_REC_ANTERIOR: string | null;
  DT_INI: string;             // "2022-12-01"
  DT_FIN: string;             // "2022-12-31"
  NOME: string;
  UF: string;
  COD_MUN: string;
  SUFRAMA: string | null;
  IND_NAT_PJ: string;
  IND_ATIV: number;
  pis_devido: string;         // API retorna string
  cofins_devido: string;
  credito_pis: string;
  credito_cofins: string;
}

export interface BlocoRegistro {
  codigo: string;
  descricao: string;
}

// Resposta da API de Overview (lista de arquivos)
export interface EFDOverview {
  cnpj: string;
  blocos_disponiveis: Record<string, BlocoRegistro[]>; // ex: "0": [...], "C": [...]
  arquivos: EFDArquivo[];
}

// Estrutura de paginação da API
export interface EFDPaginacao {
  page: number;
  limit: number;
  total_registros: number;
  total_paginas: number;
}

// Resposta da API de Detalhes (registros de um arquivo)
export interface EFDDetail {
  registro: string;           // ex: "REG_C100"
  descricao: string;          // "Nota Fiscal (Mercadoria)"
  paginacao: EFDPaginacao;
  dados: Record<string, any>[]; // Registros dinâmicos
}

// Estado da UI
export type EFDViewMode = 'lista' | 'analise';

// Tipo para colunas dinâmicas
export interface EFDColumnConfig {
  id: string;
  label: string;
  group: string;
}
