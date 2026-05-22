import type { SelicTaxa } from '@/hooks/useSelicData';

/**
 * Aplica a correção monetária SELIC sobre um valor.
 * `fator` é calculado pelos hooks (useSelicTaxaAt/useSelicDataPerPer) seguindo
 * a regra RFB: carência de 1 ano sem SELIC, depois soma das taxas mensais dos
 * meses CHEIOS entre (fim-carência + 1 mês) e (mês anterior à referência),
 * mais 1% fixo do mês de referência.
 */
export function applySelicCorrection(
  valor: number,
  fator: number
): { valorCorrigido: number; fator: number } {
  const f = Math.max(0, fator);
  return {
    valorCorrigido: valor * (1 + f),
    fator: f,
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
 * em uma data específica.
 */
export function isWithinGracePeriodAt(dtSolicitada: string, dtReferencia: string): boolean {
  const fim = new Date(dtSolicitada + 'T00:00:00');
  fim.setFullYear(fim.getFullYear() + 1);

  const ref = new Date(dtReferencia + 'T00:00:00');
  ref.setHours(0, 0, 0, 0);

  return fim > ref;
}

/**
 * Mês (YYYY-MM) imediatamente após o fim da carência (1º mês candidato para
 * acumulação de SELIC).
 */
export function getStartAccumulationMonth(dtSolicitada: string): string {
  const fim = new Date(dtSolicitada + 'T00:00:00');
  fim.setFullYear(fim.getFullYear() + 1);
  // Mês seguinte ao mês em que a carência venceu.
  fim.setDate(1);
  fim.setMonth(fim.getMonth() + 1);
  return `${fim.getFullYear()}-${String(fim.getMonth() + 1).padStart(2, '0')}`;
}

/** Próximo mês no formato YYYY-MM. */
export function nextMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  const newM = m === 12 ? 1 : m + 1;
  const newY = m === 12 ? y + 1 : y;
  return `${newY}-${String(newM).padStart(2, '0')}`;
}

/** Mês anterior no formato YYYY-MM. */
export function prevMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  const newM = m === 1 ? 12 : m - 1;
  const newY = m === 1 ? y - 1 : y;
  return `${newY}-${String(newM).padStart(2, '0')}`;
}

/**
 * Calcula o fator SELIC para um PER entre dt_solicitada e dt_referência,
 * dado um índice das taxas mensais por mês (`data_atualizacao` no formato YYYY-MM).
 *
 * Regra:
 * - Carência: 1 ano da dt_solicitada → fator 0 enquanto dt_referência < fim-carência.
 * - Acumulado: soma de valor_decimal dos meses CHEIOS entre (fim-carência + 1) e
 *   (mês anterior à referência).
 *   - O índice é por data_atualizacao; rate aplicada ao mês X está em data_atualizacao = (X-1).
 *   - Logo, para sumarizar meses [startAccMonth..endAccMonth], iteramos
 *     data_atualizacao de prevMonth(startAccMonth) até prevMonth(endAccMonth).
 * - + 1% do mês de referência (fixo, regra RFB: SELIC do mês corrente não é divulgada).
 *
 * Lança erro se faltar a linha da API para qualquer mês necessário (sem fallback).
 */
export function computeSelicFator(
  dtSolicitada: string,
  dtReferencia: string,
  ratesByMonth: Record<string, number>, // chave: data_atualizacao YYYY-MM, valor: valor_decimal
): { fator: number; acumulado: number; mesesContabilizados: string[] } {
  if (isWithinGracePeriodAt(dtSolicitada, dtReferencia)) {
    return { fator: 0, acumulado: 0, mesesContabilizados: [] };
  }

  const startAccMonth = getStartAccumulationMonth(dtSolicitada);
  const refMonth = dtReferencia.substring(0, 7);
  const endAccMonth = prevMonth(refMonth);

  const mesesContabilizados: string[] = [];
  let acumulado = 0;

  if (startAccMonth <= endAccMonth) {
    // Iterar de data_atualizacao = prevMonth(startAccMonth) até prevMonth(endAccMonth)
    let dataAtual = prevMonth(startAccMonth);
    const dataAtualFim = prevMonth(endAccMonth);
    while (dataAtual <= dataAtualFim) {
      const rate = ratesByMonth[dataAtual];
      if (rate === undefined) {
        throw new Error(
          `API SELIC sem linha para data_atualizacao=${dataAtual} ` +
            `(mês de aplicação ${nextMonth(dataAtual)}). Ambiente provavelmente defasado.`,
        );
      }
      acumulado += rate;
      mesesContabilizados.push(nextMonth(dataAtual));
      dataAtual = nextMonth(dataAtual);
    }
  }

  return { fator: acumulado + 0.01, acumulado, mesesContabilizados };
}

/** Tipo auxiliar — alguns componentes ainda esperam a forma SelicTaxa. */
export type { SelicTaxa };
