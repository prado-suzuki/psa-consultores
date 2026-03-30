/* ══════════════════════════════════════════════════════════════
 *  Tipagens centralizadas — Apuração PIS/COFINS
 *  Fonte única de verdade para hooks, lib e UI.
 * ══════════════════════════════════════════════════════════════ */

// ── Nó hierárquico (árvore de contas do balancete) ──

export interface ContaNode {
  plano_conta: string;
  cod_cta: string;
  descricao_conta: string;
  vlr_efd: number;
  credito: number;
  debito: number;
  saldo_periodo: number;
  saldo_atual: number;
  lancamentos: PisCofinsItemCredito[];
  children: ContaNode[];
}

// ── Item de crédito (linha da EFD) ──

export interface PisCofinsItemCredito {
  cst_pis: string;
  aliq_pis: number;
  cod_cta: string;
  descricao_conta: string;
  bloco_efd: string;
  vlr_efd: number;
  credito: number;
  debito: number;
  saldo_periodo: number;
  saldo_atual: number;
}

/** Alias para compatibilidade com o motor de cálculo */
export type ItemCredito = PisCofinsItemCredito;

// ── Rateio de receitas ──

export interface PisCofinsRateioReceitas {
  rec_bru_cum: number;
  rec_bru_ncum_exp: number;
  rec_bru_ncum_nt_mi: number;
  rec_bru_ncum_trib_mi: number;
  rec_bru_total: number;
}

export type RateioReceitas = PisCofinsRateioReceitas;

// ── Período retornado pela API ──

export interface PisCofsinPeriodo {
  dt_ini: string;
  itens_credito: PisCofinsItemCredito[];
  contas?: ContaNode[];
  rateio_receitas: PisCofinsRateioReceitas | null;
}

export type Periodo = PisCofsinPeriodo;

// ── Resposta da API (input para cálculos) ──

export interface PisCofinsApuracaoResponse {
  periodos: PisCofsinPeriodo[];
  metadata?: { id_contribuinte: string; total_periodos: number };
}

export type ApuracaoInput = PisCofinsApuracaoResponse;

// ── Carryforward de saldos entre períodos ──

export interface SaldoCarryforward {
  pis: number;
  cofins: number;
}

// ── Resultado da apuração por período ──

export interface ResultadoApuracao {
  pisContribuicaoBruta: number;
  cofinsContribuicaoBruta: number;
  pisContribuicaoBrutaAliquotaReduzida: number;
  cofinsContribuicaoBrutaAliquotaReduzida: number;
  pisCreditoMes: number;
  cofinsCreditoMes: number;
  pisCreditoMesAliquotaReduzida: number;
  cofinsCreditoMesAliquotaReduzida: number;
  pisCreditoAnterior: number;
  cofinsCreditoAnterior: number;
  pisDue: number;
  cofinsDue: number;
  pisSaldoAcumulado: number;
  cofinsSaldoAcumulado: number;
}

// ── Resultado do rateio proporcional ──

export interface RateioResultado {
  percTributado: number;
  percNaoTrib: number;
  percExportacao: number;
  pis101: number;
  pis201: number;
  pis301: number;
  cofins101: number;
  cofins201: number;
  cofins301: number;
}

// ── Base de débito / crédito ──

export interface BaseDebito {
  baseNormal: number;
  baseDiferenciada: number;
  baseTotal: number;
}

export interface BaseCredito {
  baseNormal: number;
  basePresumido: number;
  baseTotal: number;
}

// ── Resultado consolidado de um período (retorno de calcTodosPeriodos) ──

export interface ResultadoPeriodo {
  dt_ini: string;
  baseDebito: BaseDebito;
  baseCredito: BaseCredito;
  resultado: ResultadoApuracao;
  rateio: RateioResultado | null;
  rateio_receitas: PisCofinsRateioReceitas | null;
}

// ── Totais acumulados ──

export interface TotaisApuracao {
  receitaBruta: number;
  baseCredito: number;
  pisContribuicaoBruta: number;
  pisContribuicaoBrutaAliquotaReduzida: number;
  pisCreditoMes: number;
  pisCreditoMesAliquotaReduzida: number;
  pisDue: number;
  cofinsContribuicaoBruta: number;
  cofinsContribuicaoBrutaAliquotaReduzida: number;
  cofinsCreditoMes: number;
  cofinsCreditoMesAliquotaReduzida: number;
  cofinsDue: number;
}

// ── Tipos para tabelas pivotadas (Geração 1 — mantidos) ──

export interface PisCofinsRow extends PisCofinsItemCredito {
  periodo: string;
  dt_ini: string;
  rateio_receitas: PisCofinsRateioReceitas | null;
}

export interface PivotRow {
  cst_pis: string;
  cod_cta: string;
  descricao_conta: string;
  bloco_efd: string;
  valores: Record<string, number>; // chave = "YYYY-MM", valor numérico
}

// ── Pivot genérico (Geração 2) ──

export interface PivotRowGeneric {
  key: string;
  cst_pis: string;
  cod_cta: string;
  descricao_conta: string;
  bloco_efd: string;
  total: number;
  [month: string]: string | number; // colunas dinâmicas "YYYY-MM"
}
