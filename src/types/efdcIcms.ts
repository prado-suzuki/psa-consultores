export interface EfdcIcmsEfdSide {
  CNPJ: string;
  NOME: string;
  CFOP: number[];
  COD_CTA: (string | null)[];
  VL_DOC: number;
  DT_INI?: string;
  DT_FIN?: string;
}

export interface EfdcIcmsXmlSide {
  CFOP: number[];
  VL_DOC: number | null;
}

export interface EfdcIcmsNota {
  CHV_NFE: string;
  EFD_ICMS: EfdcIcmsEfdSide;
  EFD_CONTRIB: EfdcIcmsEfdSide;
  XML?: EfdcIcmsXmlSide;
}

export interface EfdcIcmsResponse {
  ID_CONTRIBUINTE: string;
  NOTAS: EfdcIcmsNota[];
}
