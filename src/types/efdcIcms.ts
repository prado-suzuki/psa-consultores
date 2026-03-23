export interface EfdcIcmsEfdSide {
  CNPJ: string;
  NOME: string;
  CFOP: number[];
  COD_CTA: (string | null)[];
  VL_DOC: number;
  DT_INI?: string;
  DT_FIN?: string;
}

export interface EfdcIcmsNota {
  CHV_NFE: string;
  EFD_ICMS: EfdcIcmsEfdSide;
  EFD_CONTRIB: EfdcIcmsEfdSide;
}

export interface EfdcIcmsResponse {
  ID_CONTRIBUINTE: string;
  NOTAS: EfdcIcmsNota[];
}
