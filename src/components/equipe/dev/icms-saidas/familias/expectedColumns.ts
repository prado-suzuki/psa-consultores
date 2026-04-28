// Schema esperado por família, alinhado às views BigQuery VW_ANL_*
// (acucar, biodiesel, etanol_interestado, etanol_interno, residuos_producao, sucata).
// Os nomes aqui são os CANÔNICOS após `normalizeRow` em useSaidaIcms — sinônimos
// (NOTA_FISCAL→NUM_NOTA, BC→BASE_CALCULO_ICMS, etc.) já foram resolvidos antes
// de chegar a esta verificação.

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
  // VW_ANL_ACUCAR
  acucar: {
    data: [
      'MES_ANO',
      'DATA_NOTA',
      'NUM_NOTA',
      'CFOP',
      'DESCRICAO_CFOP',
      'DESCRICAO_PRODUTO',
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

  // VW_ANL_ETANOL_INTERNO
  etanol_interno: {
    data: [
      'MES_ANO',
      'DATA_NOTA',
      'NUM_NOTA',
      'NUM_DOC',
      'CFOP',
      'CST_ICMS',
      'DESCRICAO_CFOP',
      'DESCRICAO_PRODUTO',
      'QUANTIDADE',
      'BASE_CALCULO_ICMS',
      'PMPF',
      'PMPF_BC_REDUZIDA',
      'BC_CALCULADA',
      'ICMS_17_CALCULADO',
      'BC_ICMS_C190',
      'VL_ICMS_C190',
    ],
    totals: ['MES_ANO', 'ICMS_17_CALCULADO', 'VL_ICMS_C190'],
    hasTotals: true,
  },

  // VW_ANL_ETANOL_INTERESTADO (view devolve quase tudo lowercase; canonicalKey
  // sobe para UPPER antes de chegar aqui)
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

  // VW_ANL_RESIDUOS_PRODUCAO
  residuos_producao: {
    data: [
      'MES_ANO',
      'DATA_NOTA',
      'NUM_NOTA',
      'CFOP',
      'DESCRICAO_PRODUTO',
      'VALOR_MERCADORIA',
      'CST_ICMS',
      'INCIDENCIA_ICMS',
      'BASE_CALCULO_ICMS',
      'ALIQUOTA',
      'BC_ICMS_C190',
      'VL_ICMS_C190',
      'ICMS_NORMAL',
      'CHECK_',
    ],
    totals: [],
    hasTotals: false,
  },

  // VW_ANL_SUCATA
  sucata: {
    data: [
      'MES_ANO',
      'NUM_NOTA',
      'DATA_NOTA',
      'CFOP',
      'DESCRICAO_CFOP',
      'DESCRICAO_PRODUTO',
      'CLASSIF',
      'VALOR_MERCADORIA',
      'CST_ICMS',
      'INCIDENCIA_ICMS',
      'BASE_CALCULO_ICMS',
      'ALIQUOTA',
      'ICMS_NORMAL',
      'BC_ICMS_C190',
      'VL_ICMS_C190',
      'CHECK_',
    ],
    totals: [],
    hasTotals: false,
  },

  // VW_ANL_BIODIESEL
  biodiesel: {
    data: [
      'MES_ANO',
      'DATA_NOTA',
      'NUM_NOTA',
      'EFD_C190_NF',
      'CFOP',
      'CST_ICMS',
      'DESCRICAO_CFOP',
      'DESCRICAO_PRODUTO',
      'INCIDENCIA_ICMS',
      'QUANTIDADE',
      'ADREM',
      'BASE_CALCULO_ICMS',
      'ICMS_17',
      'BC_ICMS_C190',
      'VL_ICMS_C190',
      'CHECK_',
      'CREDITO_OUTORGADO',
      'ICMS_DEVIDO',
      'FUNDEIC',
      'FUNDED',
    ],
    totals: [
      'MES_ANO',
      'ICMS_17',
      'VL_ICMS_C190',
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
