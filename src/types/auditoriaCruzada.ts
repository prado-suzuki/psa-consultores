export interface BalanceteEfdItem {
  dt_ini: string;
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

export interface BalanceteEfdResponse {
  itens: BalanceteEfdItem[];
}
