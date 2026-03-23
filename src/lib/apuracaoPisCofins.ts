/* ══════════════════════════════════════════════════════════════
 *  Motor de cálculo puro — Apuração PIS/COFINS
 *  Funções sem side-effects. Nenhuma dependência de React.
 *  ⚠️  Lógica de negócio validada — NÃO alterar fórmulas.
 * ══════════════════════════════════════════════════════════════ */

import type {
  ItemCredito,
  RateioReceitas,
  ApuracaoInput,
  SaldoCarryforward,
  ResultadoApuracao,
  RateioResultado,
  ResultadoPeriodo,
  BaseDebito,
  BaseCredito,
  TotaisApuracao,
} from '@/types/pisCofins';

// ── Predicados de classificação por CST ──

export const isItemReceita = (i: ItemCredito): boolean => {
  const n = parseInt(i.cst_pis, 10);
  return !isNaN(n) && n >= 1 && n <= 10;
};

export const isItemSuspenso = (i: ItemCredito): boolean => {
  const n = parseInt(i.cst_pis, 10);
  return !isNaN(n) && n >= 4 && n <= 9;
};

export const isItemOutrasSaidas = (i: ItemCredito): boolean =>
  ['49', '99'].includes(i.cst_pis);

export const isItemCredito = (i: ItemCredito): boolean => {
  const n = parseInt(i.cst_pis, 10);
  return !isNaN(n) && n >= 50 && n <= 66 && i.aliq_pis > 0;
};

export const isItemIsencaoCredito = (i: ItemCredito): boolean => {
  const n = parseInt(i.cst_pis, 10);
  return (
    (!isNaN(n) && n >= 70 && n <= 98) ||
    (!isNaN(n) && n >= 50 && n <= 66 && i.aliq_pis === 0)
  );
};

// ── Seção 1 — Débitos ──

export function calcReceitaPorConta(itens: ItemCredito[]) {
  return itens
    .filter(isItemReceita)
    .reduce((acc, item) => {
      const key = item.cod_cta;
      acc[key] = {
        cod_cta: item.cod_cta,
        descricao_conta: item.descricao_conta,
        valor: (acc[key]?.valor ?? 0) + item.vlr_efd,
      };
      return acc;
    }, {} as Record<string, { cod_cta: string; descricao_conta: string; valor: number }>);
}

export const receitaBrutaTotal = (itens: ItemCredito[]): number =>
  itens.filter(isItemReceita).reduce((sum, i) => sum + i.vlr_efd, 0);

export const exclusaoSuspensao = (itens: ItemCredito[]): number =>
  itens.filter(isItemSuspenso).reduce((sum, i) => sum + i.vlr_efd, 0);

export function calcBaseDebito(itens: ItemCredito[]): BaseDebito {
  const receitaBruta = receitaBrutaTotal(itens);
  const exclusoes = exclusaoSuspensao(itens);
  const baseDiferenciada = 0; // receitas financeiras
  const baseNormal = receitaBruta - exclusoes - baseDiferenciada;
  return { baseNormal, baseDiferenciada, baseTotal: baseNormal + baseDiferenciada };
}

// ── Seção 2 — Créditos ──

export function calcCreditoPorConta(itens: ItemCredito[]) {
  return itens
    .filter(isItemCredito)
    .reduce((acc, item) => {
      const key = item.cod_cta;
      acc[key] = {
        cod_cta: item.cod_cta,
        descricao_conta: item.descricao_conta,
        valor: (acc[key]?.valor ?? 0) + item.vlr_efd,
      };
      return acc;
    }, {} as Record<string, { cod_cta: string; descricao_conta: string; valor: number }>);
}

export function calcBaseCredito(itens: ItemCredito[]): BaseCredito {
  const baseNormal = itens.filter(isItemCredito).reduce((sum, i) => sum + i.vlr_efd, 0);
  const basePresumido = 0;
  return { baseNormal, basePresumido, baseTotal: baseNormal + basePresumido };
}

// ── Seção 3 — Cálculo dos Valores de Crédito ──

export const COFINS_POR_PIS: Record<number, number> = {
  1.65: 7.60,
  1.2375: 5.70,
  0.65: 4.00,
};

export function aliqCofins(aliqPis: number): number {
  return COFINS_POR_PIS[aliqPis] ?? 0;
}

export function calcValoresCredito(itens: ItemCredito[]) {
  const elegiveis = itens.filter(isItemCredito);

  const creditoPis = elegiveis.reduce(
    (sum, i) => sum + i.vlr_efd * (i.aliq_pis / 100),
    0,
  );

  const creditoCofins = elegiveis.reduce(
    (sum, i) => sum + i.vlr_efd * (aliqCofins(i.aliq_pis) / 100),
    0,
  );

  return { creditoPis, creditoCofins };
}

// ── Seção 4 — Apuração do Valor Devido ──

export function calcApuracao(
  baseDebito: { baseNormal: number; baseDiferenciada: number },
  baseCredito: { baseTotal: number },
  anterior: SaldoCarryforward,
): ResultadoApuracao {
  const pisContribuicaoBruta =
    baseDebito.baseNormal * 0.0165 + baseDebito.baseDiferenciada * 0.0065;
  const cofinsContribuicaoBruta =
    baseDebito.baseNormal * 0.076 + baseDebito.baseDiferenciada * 0.04;

  const pisCreditoMes = baseCredito.baseTotal * 0.0165;
  const cofinsCreditoMes = baseCredito.baseTotal * 0.076;

  const pisDue = Math.max(0, pisContribuicaoBruta - pisCreditoMes - anterior.pis);
  const cofinsDue = Math.max(0, cofinsContribuicaoBruta - cofinsCreditoMes - anterior.cofins);

  const pisSaldoAcumulado =
    pisDue === 0 ? anterior.pis + pisCreditoMes - pisContribuicaoBruta : 0;
  const cofinsSaldoAcumulado =
    cofinsDue === 0 ? anterior.cofins + cofinsCreditoMes - cofinsContribuicaoBruta : 0;

  return {
    pisContribuicaoBruta,
    cofinsContribuicaoBruta,
    pisCreditoMes,
    cofinsCreditoMes,
    pisCreditoAnterior: anterior.pis,
    cofinsCreditoAnterior: anterior.cofins,
    pisDue,
    cofinsDue,
    pisSaldoAcumulado,
    cofinsSaldoAcumulado,
  };
}

export function calcTodosPeriodos(
  input: ApuracaoInput,
  saldoInicial: SaldoCarryforward = { pis: 0, cofins: 0 },
): ResultadoPeriodo[] {
  let saldoAnterior = saldoInicial;

  return input.periodos.map((periodo) => {
    const baseDebito = calcBaseDebito(periodo.itens_credito);
    const baseCredito = calcBaseCredito(periodo.itens_credito);
    const valoresCredito = calcValoresCredito(periodo.itens_credito);
    const resultado = calcApuracao(baseDebito, baseCredito, saldoAnterior);
    const rateio = calcRateio(
      periodo.rateio_receitas,
      valoresCredito.creditoPis,
      valoresCredito.creditoCofins,
    );

    saldoAnterior = {
      pis: resultado.pisSaldoAcumulado,
      cofins: resultado.cofinsSaldoAcumulado,
    };

    return {
      dt_ini: periodo.dt_ini,
      baseDebito,
      baseCredito,
      resultado,
      rateio,
      rateio_receitas: periodo.rateio_receitas,
    };
  });
}

// ── Seção 5 — Rateio por Tipo de Receita ──

export function calcRateio(
  rateio: RateioReceitas | null,
  creditoPisNormal: number,
  creditoCofinsNormal: number,
): RateioResultado | null {
  if (!rateio) return null;
  const total = rateio.rec_bru_total;

  const percTributado = total > 0 ? rateio.rec_bru_ncum_trib_mi / total : 0;
  const percNaoTrib = total > 0 ? rateio.rec_bru_ncum_nt_mi / total : 0;
  const percExportacao = total > 0 ? rateio.rec_bru_ncum_exp / total : 0;

  return {
    percTributado,
    percNaoTrib,
    percExportacao,
    pis101: creditoPisNormal * percTributado,
    pis201: creditoPisNormal * percNaoTrib,
    pis301: creditoPisNormal * percExportacao,
    cofins101: creditoCofinsNormal * percTributado,
    cofins201: creditoCofinsNormal * percNaoTrib,
    cofins301: creditoCofinsNormal * percExportacao,
  };
}

// ── Totais acumulados ──

export function calcTotais(resultados: ResultadoPeriodo[]): TotaisApuracao {
  return resultados.reduce(
    (acc, r) => ({
      receitaBruta: acc.receitaBruta + r.baseDebito.baseNormal + r.baseDebito.baseDiferenciada,
      baseCredito: acc.baseCredito + r.baseCredito.baseTotal,
      pisContribuicaoBruta: acc.pisContribuicaoBruta + r.resultado.pisContribuicaoBruta,
      pisCreditoMes: acc.pisCreditoMes + r.resultado.pisCreditoMes,
      pisDue: acc.pisDue + r.resultado.pisDue,
      cofinsContribuicaoBruta: acc.cofinsContribuicaoBruta + r.resultado.cofinsContribuicaoBruta,
      cofinsCreditoMes: acc.cofinsCreditoMes + r.resultado.cofinsCreditoMes,
      cofinsDue: acc.cofinsDue + r.resultado.cofinsDue,
    }),
    {
      receitaBruta: 0,
      baseCredito: 0,
      pisContribuicaoBruta: 0,
      pisCreditoMes: 0,
      pisDue: 0,
      cofinsContribuicaoBruta: 0,
      cofinsCreditoMes: 0,
      cofinsDue: 0,
    },
  );
}

// ── Variante: Apuração pelo Balancete ──

export function valorBaseBalancete(item: ItemCredito, periodoFechado: boolean): number {
  return periodoFechado ? item.saldo_atual : item.saldo_periodo;
}

export function calcCreditoPorContaBalancete(
  itens: ItemCredito[],
  periodoFechado: boolean,
) {
  return itens
    .filter(isItemCredito)
    .reduce((acc, item) => {
      const key = item.cod_cta;
      const valor = valorBaseBalancete(item, periodoFechado);
      acc[key] = {
        cod_cta: item.cod_cta,
        descricao_conta: item.descricao_conta,
        valor: (acc[key]?.valor ?? 0) + valor,
      };
      return acc;
    }, {} as Record<string, { cod_cta: string; descricao_conta: string; valor: number }>);
}

export function calcBaseCreditoBalancete(
  itens: ItemCredito[],
  periodoFechado: boolean,
): BaseCredito {
  const baseNormal = itens
    .filter(isItemCredito)
    .reduce((sum, i) => sum + valorBaseBalancete(i, periodoFechado), 0);

  const basePresumido = 0;
  return { baseNormal, basePresumido, baseTotal: baseNormal + basePresumido };
}

export function calcValoresCreditoBalancete(
  itens: ItemCredito[],
  periodoFechado: boolean,
) {
  const elegiveis = itens.filter(isItemCredito);

  const creditoPis = elegiveis.reduce(
    (sum, i) => sum + valorBaseBalancete(i, periodoFechado) * (i.aliq_pis / 100),
    0,
  );

  const creditoCofins = elegiveis.reduce(
    (sum, i) => sum + valorBaseBalancete(i, periodoFechado) * (aliqCofins(i.aliq_pis) / 100),
    0,
  );

  return { creditoPis, creditoCofins };
}

export function calcTodosPeriodosBalancete(
  input: ApuracaoInput,
  periodoFechado: boolean,
  saldoInicial: SaldoCarryforward = { pis: 0, cofins: 0 },
): ResultadoPeriodo[] {
  let saldoAnterior = saldoInicial;

  return input.periodos.map((periodo) => {
    const baseDebito = calcBaseDebito(periodo.itens_credito);
    const baseCredito = calcBaseCreditoBalancete(periodo.itens_credito, periodoFechado);
    const resultado = calcApuracao(baseDebito, baseCredito, saldoAnterior);

    saldoAnterior = {
      pis: resultado.pisSaldoAcumulado,
      cofins: resultado.cofinsSaldoAcumulado,
    };

    return {
      dt_ini: periodo.dt_ini,
      baseDebito,
      baseCredito,
      resultado,
      rateio: null,
      rateio_receitas: null,
    };
  });
}
