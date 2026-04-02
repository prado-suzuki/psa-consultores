/* ══════════════════════════════════════════════════════════════
 *  Tipagens centralizadas — Correções SPED (C170, A170, D100, F100)
 * ══════════════════════════════════════════════════════════════ */

// ── NfeItem (sub-item XML dentro de itens_efd) ──

export interface NfeItem {
  nItem: number;
  cProd: string;
  xProd: string;
  ncm: string;
  vProd: number;
}

// ── 0200 (Cadastro de Itens) ──

export interface Item0200 {
  uuid: string;
  ID_ARQUIVO: string;
  ID_PAI: string;
  NUM_LINHA: number;
  REG: string;
  COD_ITEM: string;
  DESCR_ITEM: string;
  COD_BARRA: string;
  COD_ANT_ITEM: string;
  UNID_INV: string;
  TIPO_ITEM: string;
  COD_NCM: string;
  EX_IPI: string;
  COD_GEN: string;
  COD_LST: string;
  ALIQ_ICMS: number;
}

// ── C170 (NFe / NFCe) — ItemEfd com campos UPPER_CASE da API ──

export interface ItemEfd {
  uuid: string;
  ID_ARQUIVO: string;
  ID_PAI: string;
  NUM_LINHA: number;
  REG: string;
  NUM_ITEM: number;
  COD_ITEM: string;
  DESCR_COMPL: string;
  QTD: number;
  UNID: string;
  VL_ITEM: number;
  VL_DESC: number;
  IND_MOV: string;
  CST_ICMS: number;
  CFOP: string;
  COD_NAT: string;
  VL_BC_ICMS: number;
  ALIQ_ICMS: number;
  VL_ICMS: number;
  VL_BC_ICMS_ST: number;
  ALIQ_ST: number;
  VL_ICMS_ST: number;
  IND_APUR: string;
  CST_IPI: string;
  COD_ENQ: string;
  VL_BC_IPI: number;
  ALIQ_IPI: number;
  VL_IPI: number;
  CST_PIS: number;
  VL_BC_PIS: number;
  ALIQ_PIS: number;
  QUANT_BC_PIS: number;
  ALIQ_PIS_QUANT: number;
  VL_PIS: number;
  CST_COFINS: number;
  VL_BC_COFINS: number;
  ALIQ_COFINS: number;
  QUANT_BC_COFINS: number;
  ALIQ_COFINS_QUANT: number;
  VL_COFINS: number;
  COD_CTA: string;
}

// ── Wrapper: cada entrada em itens_efd agora tem c170, 0200 e nfe_itens ──

export interface ItemEfdEntry {
  c170: ItemEfd;
  "0200": Item0200 | null;
  nfe_itens: NfeItem[];
}

export interface NotaRevisao {
  chv_nfe: string;
  dt_doc: string;
  tipo_relacao: 'SEM_NFE' | '1:1' | 'CONSOLIDADO';
  itens_efd: ItemEfdEntry[];
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
  nfe_itens: NfeItem[];
  // Campos do registro 0200
  DESCR_ITEM_0200: string | null;
  COD_NCM: string | null;
  TIPO_ITEM: string | null;
}

/** C170 row with original snapshot for editing */
export interface C170Item extends FlatItemEfd {
  ID_CONTRIBUINTE: string;
  _originalSnapshot: ItemEfd;
}

// ── A170 (NFSe) — flat array from API ──

export interface A170Snapshot {
  uuid: string;
  ID_ARQUIVO: string;
  ID_PAI: string;
  NUM_LINHA: number;
  REG: string;
  NUM_ITEM: number;
  COD_ITEM: string;
  DESCR_COMPL: string;
  VL_ITEM: number;
  VL_DESC: number;
  NAT_BC_CRED: string;
  IND_ORIG_CRED: string;
  CST_PIS: number;
  VL_BC_PIS: number;
  ALIQ_PIS: number;
  VL_PIS: number;
  CST_COFINS: number;
  VL_BC_COFINS: number;
  ALIQ_COFINS: number;
  VL_COFINS: number;
  COD_CTA: string;
  COD_CCUS: string;
  ID_CONTRIBUINTE: string;
  CHV_NFSE: string | null;
  DT_DOC: string;
  DESCRICAO_CONTA: string;
}

export interface CampoAlteradoEfd {
  campo: string;
  de: string | null;
  para: string | null;
}

export interface A170Item extends A170Snapshot {
  DESCR_ITEM_0200?: string | null;
  COD_NCM?: string | null;
  TIPO_ITEM?: string | null;
  _originalSnapshot: A170Snapshot;
}

export interface A170ResponseEntry {
  ID_CONTRIBUINTE?: string;
  CHV_NFSE: string | null;
  DT_DOC: string;
  descricao_conta?: string | null;
  DESCRICAO_CONTA?: string | null;
  A170: A170Snapshot | string;
  "0200": Item0200 | string | null;
}

export type A170Response = Record<string, A170ResponseEntry[]>;

// ── D100 (CTe) — flat array from API ──

export interface D100Item {
  uuid: string;
  ID_ARQUIVO: string;
  NUM_LINHA: number;
  REG: string;
  IND_OPER: string;
  IND_EMIT: string;
  COD_PART: string;
  COD_MOD: string;
  COD_SIT: number;
  SER: string;
  SUB: string;
  NUM_DOC: string;
  CHV_CTE: string;
  DT_DOC: string;
  DT_A_P: string;
  TP_CTE: number;
  CHV_CTE_REF: string;
  VL_DOC: number;
  VL_DESC: number;
  IND_FRT: string;
  VL_SERV: number;
  VL_BC_ICMS: number;
  VL_ICMS: number;
  VL_NT: number;
  COD_INF: string;
  COD_CTA: string;
  ID_PAI: string;
  ID_CONTRIBUINTE: string;
  CNPJ_EFD: string;
  SIMPLES: string;
  CST_PIS: number;
  ALIQ_PIS: number;
  VL_PIS: number;
  CST_COFINS: number;
  ALIQ_COFINS: number;
  VL_COFINS: number;
}

// ── F100 (Outros) — nested structure from API ──

export interface RegF100 {
  uuid: string;
  ID_ARQUIVO: string;
  NUM_LINHA: number;
  REG: string;
  IND_OPER: string;
  COD_PART: string;
  COD_ITEM: string;
  DT_OPER: string;
  VL_OPER: number;
  CST_PIS: number;
  VL_BC_PIS: number;
  ALIQ_PIS: number;
  VL_PIS: number;
  CST_COFINS: number;
  VL_BC_COFINS: number;
  ALIQ_COFINS: number;
  VL_COFINS: number;
  NAT_BC_CRED: string;
  IND_ORIG_CRED: string;
  COD_CTA: string;
  COD_CCUS: string;
  DESC_DOC_OPER: string;
  ID_PAI: string;
}

export interface Reg0150 {
  uuid: string;
  ID_ARQUIVO: string;
  ID_PAI: string;
  NUM_LINHA: number;
  REG: string;
  COD_PART: string;
  NOME: string;
  COD_PAIS: string;
  CNPJ: string;
  CPF: string;
  IE: string;
  COD_MUN: string;
  SUFRAMA: string;
  END: string;
  NUM: string;
  COMPL: string;
  BAIRRO: string;
}

export interface F100Item {
  ID_CONTRIBUINTE: string;
  CPF_CNPJ: string;
  TIPO_PESSOA: string;
  SIMPLES: string;
  F100: RegF100;
  '0150': Reg0150;
}
