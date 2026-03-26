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

// ── A170 (NFSe) ──

export interface NfseItem {
  xServ: string;
  vServ: number;
}

export interface A170ItemEfd {
  num_item: number;
  descr_item: string;
  vl_item: number;
  cod_ncm: string | null;
  cst_pis: string;
  vl_bc_pis: number;
  aliq_pis: number;
  vl_pis: number;
  cst_cofins: string;
  vl_bc_cofins: number;
  aliq_cofins: number;
  vl_cofins: number;
  cod_cta: string;
  descricao_conta: string;
  nfse_itens: NfseItem[];
}

export interface NotaA170 {
  chv_nfse: string | null;
  dt_doc: string;
  tipo_relacao: 'SEM_NFSE' | '1:1' | 'CONSOLIDADO';
  itens_efd: A170ItemEfd[];
}

export interface A170Response {
  id_contribuinte: string;
  periodo: { dt_ini: string; dt_fin: string };
  notas: NotaA170[];
}

export interface FlatA170Item extends A170ItemEfd {
  chv_nfse: string | null;
  dt_doc: string;
  tipo_relacao: 'SEM_NFSE' | '1:1' | 'CONSOLIDADO';
}

// ── D100 (CTe) ──

export interface CteItem {
  xServ: string;
  vPrest: number;
}

export interface D100ItemEfd {
  num_item: number;
  descr_item: string;
  vl_item: number;
  cnpj_efd: string;
  simples: string;
  cst_pis: string;
  aliq_pis: number;
  vl_pis: number;
  cst_cofins: string;
  aliq_cofins: number;
  vl_cofins: number;
  cte_itens: CteItem[];
}

export interface NotaD100 {
  chv_cte: string;
  dt_doc: string;
  tipo_relacao: 'SEM_CTE' | '1:1' | 'CONSOLIDADO';
  itens_efd: D100ItemEfd[];
}

export interface D100Response {
  id_contribuinte: string;
  periodo: { dt_ini: string; dt_fin: string };
  notas: NotaD100[];
}

export interface FlatD100Item extends D100ItemEfd {
  chv_cte: string;
  dt_doc: string;
  tipo_relacao: 'SEM_CTE' | '1:1' | 'CONSOLIDADO';
}

// ── F100 (Outros) ──

export interface F100Item {
  id_contribuinte: string;
  cpf_cnpj: string;
  tipo_pessoa: string;
  nome: string;
  dt_oper: string;
  simples: string;
  vl_oper: number;
  cst_pis: string;
  aliq_pis: number;
  vl_pis: number;
  cst_cofins: string;
  aliq_cofins: number;
  vl_cofins: number;
}

export interface F100Response {
  id_contribuinte: string;
  periodo: { dt_ini: string; dt_fin: string };
  itens: F100Item[];
}
