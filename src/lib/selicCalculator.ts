import type { SelicTaxa } from '@/hooks/useSelicData';

/**
 * Aplica a correção monetária Selic sobre um valor.
 * `vlrAcumuladoDec` = SELIC acumulada do mês da dt_solicitada até o último mês
 * cadastrado no banco da API (valor lido da linha `data_atualizacao = mês(dt_solicitada)`).
 * +0,01 = parcela fixa do mês corrente (regra RFB: usa-se 1% enquanto a SELIC
 * do mês não é divulgada).
 * A verificação de carência (1 ano após a solicitação) deve ser feita ANTES
 * de chamar esta função.
 */
export function applySelicCorrection(
  valor: number,
  vlrAcumuladoDec: number
): { valorCorrigido: number; fator: number } {
  const fator = Math.max(0, vlrAcumuladoDec) + 0.01;
  return {
    valorCorrigido: valor * (1 + fator),
    fator,
  };
}

/**
 * Verifica se o PER ainda está no período de carência (1 ano calendário) em
 * relação à data atual. Regra RFB: o crédito só passa a ser atualizado pela
 * SELIC após completar 1 ano da data de envio do PER.
 */
export function isWithinGracePeriod(dtSolicitada: string): boolean {
  const fim = new Date(dtSolicitada + 'T00:00:00');
  fim.setFullYear(fim.getFullYear() + 1);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return fim > hoje;
}

/**
 * Verifica se o PER ainda estava no período de carência (1 ano calendário)
 * em uma data específica. Usado para calcular o rateio Atualizado/Original
 * na data de envio de uma DCOMP/ressarcimento.
 */
export function isWithinGracePeriodAt(dtSolicitada: string, dtReferencia: string): boolean {
  const fim = new Date(dtSolicitada + 'T00:00:00');
  fim.setFullYear(fim.getFullYear() + 1);

  const ref = new Date(dtReferencia + 'T00:00:00');
  ref.setHours(0, 0, 0, 0);

  return fim > ref;
}
