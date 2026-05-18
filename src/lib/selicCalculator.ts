import type { SelicTaxa } from '@/hooks/useSelicData';

/**
 * Aplica a correção monetária Selic sobre um valor.
 * A API devolve o acumulado SELIC até o mês ANTERIOR ao mês de referência.
 * Soma-se +1% (0.01) referente ao mês corrente, conforme regra RFB.
 * A verificação de carência (360 dias) deve ser feita ANTES de chamar esta função.
 */
export function applySelicCorrection(
  valor: number,
  vlrAcumuladoDec: number
): { valorCorrigido: number; fator: number } {
  const fator = vlrAcumuladoDec + 0.01;
  return {
    valorCorrigido: valor * (1 + fator),
    fator,
  };
}

/**
 * Verifica se o PER ainda está no período de carência (360 dias) em relação à data atual.
 * @param dtSolicitada - Data solicitada do PER (YYYY-MM-DD)
 * @returns true se ainda está em carência (data fim > hoje)
 */
export function isWithinGracePeriod(dtSolicitada: string): boolean {
  const dt = new Date(dtSolicitada + 'T00:00:00');
  dt.setDate(dt.getDate() + 360);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return dt > hoje;
}

/**
 * Verifica se o PER ainda estava no período de carência (360 dias) em uma data específica.
 * Usado para calcular o rateio Atualizado/Original na data de envio de uma DCOMP/ressarcimento.
 */
export function isWithinGracePeriodAt(dtSolicitada: string, dtReferencia: string): boolean {
  const fim = new Date(dtSolicitada + 'T00:00:00');
  fim.setDate(fim.getDate() + 360);

  const ref = new Date(dtReferencia + 'T00:00:00');
  ref.setHours(0, 0, 0, 0);

  return fim > ref;
}

/**
 * Calcula a data fim para a API Selic (dt_solicitada + 360 dias).
 * @returns Data no formato YYYY-MM-DD
 */
export function getSelicEndDate(dtSolicitada: string): string {
  const dt = new Date(dtSolicitada + 'T00:00:00');
  dt.setDate(dt.getDate() + 360);
  return dt.toISOString().split('T')[0];
}
