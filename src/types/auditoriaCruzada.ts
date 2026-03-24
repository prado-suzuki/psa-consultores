export interface BalanceteEfdItem {
  dt_ini: string;
  cod_cta: string;
  descricao_conta: string;
  vlr_efd: number;
  credito: number;
  debito: number;
  saldo_periodo: number;
  saldo_atual: number;
}

export interface BalanceteEfdResponse {
  itens: BalanceteEfdItem[];
}
