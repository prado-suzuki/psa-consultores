export interface EfdcXmlCte {
  CHV_CTE: string;
  NR_CTE: number;
  VLR_CTE: number;
}

export interface EfdcXmlLote {
  ID_CONTRIBUINTE: string;
  CNPJ_EMIT: string;
  NOME_EMIT: string;
  MOD: string;
  SERIE: string;
  CFOP: string;
  DT_LOTE: string;
  INTERVALO: string;
  VLR_LOTE: number;
  SUM_LOTE: number;
  CTES: EfdcXmlCte[];
}
