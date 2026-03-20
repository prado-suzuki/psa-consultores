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

export interface PisCofinsRateioReceitas {
  rec_bru_cum: number;
  ncum_exp: number;
  ncum_trib_mi: number;
  ncum_nt_mi: number;
  faturamento_bruto: number;
}

export interface PisCofsinPeriodo {
  dt_ini: string;
  itens_credito: PisCofinsItemCredito[];
  rateio_receitas: PisCofinsRateioReceitas | null;
}

export interface PisCofinsApuracaoResponse {
  periodos: PisCofsinPeriodo[];
}

export interface PisCofinsRow extends PisCofinsItemCredito {
  periodo: string;
  dt_ini: string;
  rateio_receitas: PisCofinsRateioReceitas | null;
}
