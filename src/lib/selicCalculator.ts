import type { SelicTaxa } from '@/hooks/useSelicData';

/**
 * Filtra as taxas Selic pelo campo data_atualizacao dentro do intervalo informado.
 * @param taxas - Array completo de taxas Selic
 * @param dataInicio - Data início (YYYY-MM-DD) - baseada na dt_solicitada do PER
 * @param dataFim - Data fim (YYYY-MM-DD) - data de referência (geralmente hoje)
 */
/**
 * Encontra a taxa Selic cuja data_atualizacao é a mais próxima (<=) da data solicitada do PER.
 * Retorna null se nenhuma taxa for encontrada.
 */
export function findTaxaByDate(
  taxas: SelicTaxa[],
  dataSolicitada: string
): SelicTaxa | null {
  // Ordena por data_atualizacao desc para encontrar a mais próxima <= dataSolicitada
  const candidatas = taxas
    .filter((t) => t.data_atualizacao <= dataSolicitada)
    .sort((a, b) => b.data_atualizacao.localeCompare(a.data_atualizacao));
  return candidatas.length > 0 ? candidatas[0] : null;
}

/**
 * Aplica a correção monetária Selic sobre um valor.
 * Fórmula: valor_credito * vlr_acumulado_dec (valor já acumulado pela API)
 */
export function applySelicCorrection(
  valor: number,
  taxas: SelicTaxa[],
  dataInicio: string,
  _dataFim: string
): { valorCorrigido: number; fator: number; valorAcumulado: number } {
  const taxa = findTaxaByDate(taxas, dataInicio);
  if (!taxa) {
    return { valorCorrigido: 0, fator: 0, valorAcumulado: 0 };
  }
  return {
    valorCorrigido: valor * taxa.vlr_acumulado_dec,
    fator: taxa.vlr_acumulado_dec,
    valorAcumulado: taxa.valor_acumulado,
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
