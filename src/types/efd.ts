// Tipos para EFD Contribuições

// Estrutura do EFD_CONTRIBUICOES_N1.json (Lista/Resumo)
export interface EFDArquivo {
  id_arquivo: string;
  identificacao: {
    DT_INI: string;
    DT_FIN: string;
    NOME: string;
    TIPO_ESCRIT: string; // "0" = Original, "1" = Retificadora
  };
  totais: {
    pis_devido: number;
    cofins_devido: number;
  };
}

export interface BlocoRegistro {
  codigo: string;
  descricao: string;
}

export interface EFDOverview {
  cnpj: string;
  blocos_disponiveis: Record<string, BlocoRegistro[]>; // ex: "0": [...], "C": [...]
  arquivos: EFDArquivo[];
}

// Estrutura do EFD_CONTRIBUICOES_N2.json (Detalhes)
export interface EFDPaginacao {
  total_registros: number;
  page: number;
}

export interface EFDDetail {
  id_arquivo: string;
  registro: string; // ex: "REG_C100"
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
