import type { SelicTaxa } from '@/hooks/useSelicData';

/**
 * Aplica a correção monetária Selic sobre um valor.
 * Recebe diretamente o fator acumulado (vlr_acumulado_dec) já retornado pela API.
 * A verificação de carência (360 dias) deve ser feita ANTES de chamar esta função.
 */
export function applySelicCorrection(
  valor: number,
  vlrAcumuladoDec: number
): { valorCorrigido: number; fator: number } {
  return {
    valorCorrigido: valor * vlrAcumuladoDec,
    fator: vlrAcumuladoDec,
  };
}

/**
 * Verifica se o PER ainda está no período de carência (360 dias).
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
 * Calcula a data fim para a API Selic (dt_solicitada + 360 dias).
 * @returns Data no formato YYYY-MM-DD
 */
export function getSelicEndDate(dtSolicitada: string): string {
  const dt = new Date(dtSolicitada + 'T00:00:00');
  dt.setDate(dt.getDate() + 360);
  return dt.toISOString().split('T')[0];
}
