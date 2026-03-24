export interface NfeItem {
  nItem: number;
  cProd: string;
  xProd: string;
  ncm: string;
  vProd: number;
}

export interface ItemEfd {
  num_item: number;
  descr_item: string;
  vl_item: number;
  cod_ncm: string | null;
  cst_pis: string;
  aliq_pis: number;
  vl_pis: number;
  cst_cofins: string;
  aliq_cofins: number;
  vl_cofins: number;
  cod_cta: string;
  nfe_itens: NfeItem[];
}

export interface NotaRevisao {
  chv_nfe: string;
  dt_doc: string;
  tipo_relacao: 'SEM_NFE' | '1:1' | 'CONSOLIDADO';
  itens_efd: ItemEfd[];
}

export interface CorrecoesSpedResponse {
  id_contribuinte: string;
  periodo: { dt_ini: string; dt_fin: string };
  notas: NotaRevisao[];
}

/** Flattened row for table display */
export interface FlatItemEfd extends ItemEfd {
  chv_nfe: string;
  dt_doc: string;
  tipo_relacao: 'SEM_NFE' | '1:1' | 'CONSOLIDADO';
}
