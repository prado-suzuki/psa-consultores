/* ══════════════════════════════════════════════════════════════
 *  Tipagens centralizadas — Correções SPED (C170, A170, D100, F100)
 * ══════════════════════════════════════════════════════════════ */

// ── C170 (NFe / NFCe) — tipos existentes ──

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

/** Flattened row for table display (C170) */
export interface FlatItemEfd extends ItemEfd {
  chv_nfe: string;
  dt_doc: string;
  tipo_relacao: 'SEM_NFE' | '1:1' | 'CONSOLIDADO';
}

// ── A170 (NFSe) — flat array from API ──

export interface A170Item {
  ID_CONTRIBUINTE: string;
  CHV_NFSE: string | null;
  DT_DOC: string;
  DESCR_ITEM: string;
  VL_ITEM: number;
  CST_PIS: string;
  VL_BC_PIS: number;
  ALIQ_PIS: number;
  VL_PIS: number;
  CST_COFINS: string;
  VL_BC_COFINS: number;
  ALIQ_COFINS: number;
  VL_COFINS: number;
  COD_CTA: string;
  DESCRICAO_CONTA: string;
}

// ── D100 (CTe) — flat array from API ──

export interface D100Item {
  ID_CONTRIBUINTE: string;
  CNPJ_EFD: string;
  CHV_CTE: string;
  DT_DOC: string;
  SIMPLES: string;
  VL_DOC: number;
  CST_PIS: string;
  ALIQ_PIS: number;
  VL_PIS: number;
  CST_COFINS: string;
  ALIQ_COFINS: number;
  VL_COFINS: number;
}

// ── F100 (Outros) — flat array from API ──

export interface F100Item {
  ID_CONTRIBUINTE: string;
  CPF_CNPJ: string;
  TIPO_PESSOA: string;
  NOME: string;
  DT_OPER: string;
  SIMPLES: string;
  VL_OPER: number;
  CST_PIS: string;
  ALIQ_PIS: number;
  VL_PIS: number;
  CST_COFINS: string;
  ALIQ_COFINS: number;
  VL_COFINS: number;
}
