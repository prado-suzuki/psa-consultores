import type { SelicTaxa } from '@/hooks/useSelicData';

/**
 * Filtra as taxas Selic pelo campo data_atualizacao dentro do intervalo informado.
 * @param taxas - Array completo de taxas Selic
 * @param dataInicio - Data início (YYYY-MM-DD) - baseada na dt_solicitada do PER
 * @param dataFim - Data fim (YYYY-MM-DD) - data de referência (geralmente hoje)
 */
export function filterTaxasByRange(
  taxas: SelicTaxa[],
  dataInicio: string,
  dataFim: string
): SelicTaxa[] {
  return taxas.filter((t) => {
    return t.data_atualizacao >= dataInicio && t.data_atualizacao <= dataFim;
  });
}

/**
 * Calcula o fator de correção monetária acumulado pela Selic.
 * Fórmula: Π (1 + taxa_decimal) para cada mês no range.
 */
export function calculateCorrectionFactor(taxasNoRange: SelicTaxa[]): number {
  if (taxasNoRange.length === 0) return 0;
  return taxasNoRange.reduce((acc, t) => acc + t.vlr_acumulado_dec, 0);
}

/**
 * Aplica a correção monetária Selic sobre um valor.
 */
export function applySelicCorrection(
  valor: number,
  taxas: SelicTaxa[],
  dataInicio: string,
  dataFim: string
): { valorCorrigido: number; fator: number; valorAcumulado: number } {
  const taxasRange = filterTaxasByRange(taxas, dataInicio, dataFim);
  const fator = calculateCorrectionFactor(taxasRange);
  const lastTaxa = taxasRange.length > 0 ? taxasRange[taxasRange.length - 1] : null;
  return {
    valorCorrigido: valor * fator,
    fator,
    valorAcumulado: lastTaxa ? lastTaxa.valor_acumulado : 0,
  };
}

/**
 * Calcula a correção Selic para múltiplos PERs e retorna os valores individuais + total.
 */
export function calculateBatchCorrection(
  itens: Array<{ id: string; valor: number; dataInicio: string }>,
  taxas: SelicTaxa[],
  dataFim: string
): {
  itens: Array<{ id: string; valorOriginal: number; valorCorrigido: number; fator: number; valorAcumulado: number }>;
  totalOriginal: number;
  totalCorrigido: number;
} {
  let totalOriginal = 0;
  let totalCorrigido = 0;

  const resultado = itens.map((item) => {
    const { valorCorrigido, fator, valorAcumulado } = applySelicCorrection(
      item.valor,
      taxas,
      item.dataInicio,
      dataFim
    );
    totalOriginal += item.valor;
    totalCorrigido += valorCorrigido;
    return {
      id: item.id,
      valorOriginal: item.valor,
      valorCorrigido,
      fator,
      valorAcumulado,
    };
  });

  return { itens: resultado, totalOriginal, totalCorrigido };
}
