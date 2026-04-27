// Schema esperado por família (baseado na planilha WP_ICMS_SAIDAS.xlsb T03.1)
// Comparado contra o response real para sinalizar campos faltando.

import type { FamiliaSaida } from '@/hooks/useSaidaIcms';

interface FamiliaSchema {
  /** Campos esperados nas linhas detalhadas (data[]) */
  data: string[];
  /** Campos esperados no resumo mensal (totalizadores_mensal[]) */
  totals: string[];
  /** Endpoint devolve totais? (residuos_producao e sucata não devolvem) */
  hasTotals: boolean;
}

export const EXPECTED_SCHEMA: Record<FamiliaSaida, FamiliaSchema> = {
  acucar: {
    data: [
      'MES_ANO',
      'DATA_NOTA',
      'NUM_NOTA',
      'CFOP',
      'DESCRICAO_CFOP',
      'DESCRICAO_PRODUTO',
      'VALOR_MERCADORIA',
      'INCIDENCIA_ICMS',
      'BASE_CALCULO_ICMS',
      'ALIQUOTA',
      'ICMS_NORMAL',
      'BENEFICIO',
      'VALOR_CREDITO',
      'ICMS_RECOLHER',
      'FUNDES',
      'FUNDED',
    ],
    totals: [
      'MES_ANO',
      'ICMS_NORMAL',
      'VL_ICMS_C190',
      'ICMS_RECOLHER',
      'FUNDES',
      'FUNDED',
      'FUNDES_EFD',
      'FUNDED_EFD',
    ],
    hasTotals: true,
  },
  etanol_interno: {
    data: [
      'MES_ANO',
      'DATA_NOTA',
      'NUM_NOTA',
      'CFOP',
      'CST_ICMS',
      'DESCRICAO_CFOP',
      'DESCRICAO_PRODUTO',
      'INCIDENCIA_ICMS',
      'QUANTIDADE',
      'PMPF',
      'pmpf_bc_reduzida',
      'bc_calculada',
      'icms_17_calculado',
      'BC_ICMS_C190',
      'VL_ICMS_C190',
    ],
    totals: ['MES_ANO', 'ICMS_17_CALCULADO', 'VL_ICMS_C190'],
    hasTotals: true,
  },
  etanol_interestado: {
    data: [
      'MES_ANO',
      'DATA_NOTA',
      'NUM_NOTA',
      'CFOP',
      'CST_ICMS',
      'DESCRICAO_CFOP',
      'DESCRICAO_PRODUTO',
      'INCIDENCIA_ICMS',
      'QUANTIDADE',
      'VALOR_MERCADORIA',
      'ICMS_12',
      'BASE_CALCULO_ICMS',
      'VALOR_ICMS',
      'CREDITO_OUTORGADO',
      'ICMS_DEVIDO',
      'FUNDEIC',
      'FUNDED',
    ],
    totals: [
      'MES_ANO',
      'VALOR_ICMS',
      'VL_ICMS_C190',
      'ICMS_DEVIDO',
      'FUNDEIC',
      'FUNDED',
      'FUNDEIC_EFD',
      'FUNDED_EFD',
    ],
    hasTotals: true,
  },
  residuos_producao: {
    data: [
      'MES_ANO',
      'DATA_NOTA',
      'NUM_NOTA',
      'CFOP',
      'DESCRICAO_PRODUTO',
      'VALOR_MERCADORIA',
      'INCIDENCIA_ICMS',
      'BASE_CALCULO_ICMS',
      'ALIQUOTA',
      'ICMS_NORMAL',
      'BC_ICMS_C190',
      'VL_ICMS_C190',
    ],
    totals: [],
    hasTotals: false,
  },
  sucata: {
    data: [
      'MES_ANO',
      'DATA_NOTA',
      'NUM_NOTA',
      'CFOP',
      'DESCRICAO_CFOP',
      'DESCRICAO_PRODUTO',
      'VALOR_MERCADORIA',
      'INCIDENCIA_ICMS',
      'BC_ICMS_C190',
    ],
    totals: [],
    hasTotals: false,
  },
  biodiesel: {
    data: [
      'MES_ANO',
      'DATA_NOTA',
      'NUM_NOTA',
      'CFOP',
      'CST_ICMS',
      'DESCRICAO_CFOP',
      'DESCRICAO_PRODUTO',
      'INCIDENCIA_ICMS',
      'QUANTIDADE',
      'BASE_CALCULO_ICMS',
      'ICMS_17',
      'EFD_C190_ICMS',
      'ICMS_DEVIDO',
      'FUNDEIC',
      'FUNDED',
    ],
    totals: [
      'MES_ANO',
      'ICMS_17',
      'EFD_C190_ICMS',
      'ICMS_DEVIDO',
      'FUNDEIC',
      'FUNDED',
      'FUNDEIC_EFD',
      'FUNDED_EFD',
    ],
    hasTotals: true,
  },
};

/** Retorna campos esperados que NÃO vieram na resposta. */
export function findMissingFields(
  expected: string[],
  received: string[],
): string[] {
  const receivedSet = new Set(received);
  return expected.filter((f) => !receivedSet.has(f));
}
