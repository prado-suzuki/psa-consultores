export interface BalanceteEfdItem {
  dt_ini: string;
  cod_cta: string;
  descricao_conta: string;
  desc_tipo: string;
  vlr_efd: number;
  credito: number;
  debito: number;
  saldo_periodo: number;
  saldo_atual: number;
}

export interface BalanceteEfdMetadata {
  id_contribuinte: string;
  total_itens: number;
  contas: string[];
}

export interface BalanceteEfdResponse {
  itens: BalanceteEfdItem[];
  metadata: BalanceteEfdMetadata;
}
