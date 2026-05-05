// Ordenacao e ocultacao de colunas por familia, alinhadas ao layout da
// planilha WP_Revisao_Barralcool_2o Semestre 2025 (T03.1_Saidas).
//
// Colunas presentes na resposta da API mas nao declaradas em ORDER vao para
// o final ("extras"). Se a coluna esta em ORDER mas nao vem na resposta,
// ela simplesmente nao aparece (sem placeholder).

import type { FamiliaSaida } from '@/hooks/useSaidaIcms';

/** Colunas que nunca devem aparecer (redundantes ou substituidas por derivadas). */
const HIDDEN_KEYS = new Set([
  'ID_CONTRIBUINTE',
  'FUNDES_EFD',
  'FUNDED_EFD',
  'FUNDEIC_EFD',
]);

/** Totais nao devem exibir colunas cruas usadas apenas para derivar os checks. */
const HIDDEN_TOTAL_KEYS = new Set([
  'VL_ICMS_C190',
  'ICMS_RECOLHER_EFD',
  'ICMS_RECOLHER_E116',
  'E116_ICMS_RECOLHER',
  'ICMS_DEVIDO_EFD',
  'ICMS_DEVIDO_E116',
  'E116_ICMS_DEVIDO',
  'E116_ICMS',
  'ICMS_EFD',
]);

interface FamilyOrder {
  data: string[];
  totals: string[];
}

export const COLUMN_ORDER: Record<FamiliaSaida, FamilyOrder> = {
  acucar: {
    data: [
      'MES_ANO',
      'NUM_NOTA',
      'DATA_NOTA',
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
      'ICMS_C190_CHECK',
      'ICMS_RECOLHER',
      'ICMS_RECOLHER_E116_CHECK',
      'FUNDES',
      'FUNDES_E116_CHECK',
      'FUNDED',
      'FUNDED_E116_CHECK',
    ],
  },

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
      'INCIDENCIA_ICMS',
      'QUANTIDADE',
      'PMPF',
      'PMPF_BC_REDUZIDA',
      'BC_CALCULADA',
      'BASE_CALCULO_ICMS',
      'ICMS_17_CALCULADO',
      'BC_ICMS_C190',
      'VL_ICMS_C190',
      'C190_CHECK',
    ],
    totals: ['MES_ANO', 'ICMS_17_CALCULADO', 'ICMS_C190_CHECK'],
  },

  etanol_interestado: {
    data: [
      'MES_ANO',
      'NUM_NOTA',
      'DATA_NOTA',
      'CFOP',
      'DESCRICAO_CFOP',
      'CST_ICMS',
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
      'C190_CHECK',
    ],
    totals: [
      'MES_ANO',
      'VALOR_ICMS',
      'ICMS_C190_CHECK',
      'ICMS_DEVIDO',
      'ICMS_DEVIDO_E116_CHECK',
      'FUNDEIC',
      'FUNDEIC_E116_CHECK',
      'FUNDED',
      'FUNDED_E116_CHECK',
    ],
  },

  residuos_producao: {
    data: [
      'MES_ANO',
      'NUM_NOTA',
      'DATA_NOTA',
      'CFOP',
      'DESCRICAO_PRODUTO',
      'VALOR_MERCADORIA',
      'INCIDENCIA_ICMS',
      'BASE_CALCULO_ICMS',
      'ALIQUOTA',
      'ICMS_NORMAL',
      'BC_ICMS_C190',
      'VL_ICMS_C190',
      'CHECK_',
    ],
    totals: [],
  },

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
      'INCIDENCIA_ICMS',
      'BASE_CALCULO_ICMS',
      'ALIQUOTA',
      'ICMS_NORMAL',
      'BC_ICMS_C190',
      'VL_ICMS_C190',
      'CHECK_',
    ],
    totals: [],
  },

  // T03.2 — Açúcar ST
  acucar_st: {
    data: [
      'MES_ANO',           // Competência
      'NUM_NOTA',          // Nota Fiscal
      'DATA_NOTA',         // Data
      'CFOP',              // C.F.O.P.
      'CST',               // CST
      'DESCRICAO_CFOP',    // Descrição
      'DESCRICAO_PRODUTO', // Produto
      'VALOR_MERCADORIA',  // Valor Mercadoria
      'INCIDENCIA_ST',     // Incidência ST
      'BASE_CALCULO',      // BC Cálculo
      'ALIQUOTA',          // Alíquota
      'ICMS_NORMAL',       // ICMS Normal
      'MVA',               // MVA
      'BC_ST',             // BC ST
      'ICMS_ST_PRADO',     // ICMS ST (calculado)
      'C190_BC_ST',        // EFD C190 - BC ST
      'C190_ICMS_ST',      // EFD C190 - ICMS ST
      'CHECK_DIF',         // Diferença
    ],
    totals: ['MES_ANO', 'ICMS_ST_PRADO', 'C190_ICMS_ST', 'E250_TOTAL'],
  },

  // T03.2 — Etanol Interestadual ST
  etanol_interestado_st: {
    data: [
      'MES_ANO',           // Competência
      'NUM_NOTA',          // Nota Fiscal
      'DATA_NOTA',         // Data
      'CFOP',              // C.F.O.P.
      'CST',               // CST
      'DESCRICAO_CFOP',    // Descrição
      'DESCRICAO_PRODUTO', // Produto
      'INCIDENCIA_ST',     // Incidência ST
      'VALOR_MERCADORIA',  // Valor
      'MVA',               // MVA
      'BASE_CALCULO',      // BC ICMS ST
      'UF_DESTINO',        // UF Destino
      'UF_ALIQUOTA',       // Alíquota UF
      'VALOR_ICMS_ST',     // Valor ICMS ST
      'C190_BC_ST',        // EFD C190 - BC ST
      'C190_ICMS_ST',      // EFD C190 - ICMS ST
      'CHECK_DIF',         // Diferença
    ],
    totals: ['MES_ANO', 'VALOR_ICMS_ST', 'C190_ICMS_ST', 'E250_TOTAL'],
  },

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
      'ICMS_C190_CHECK',
      'ICMS_DEVIDO',
      'ICMS_DEVIDO_E116_CHECK',
      'FUNDEIC',
      'FUNDEIC_E116_CHECK',
      'FUNDED',
      'FUNDED_E116_CHECK',
    ],
  },
};

/** Filtra escondidas e ordena conforme layout da planilha. Extras vao para o final. */
export function orderColumns(
  actual: string[],
  familia: FamiliaSaida,
  kind: 'data' | 'totals',
): string[] {
  const visible = actual.filter(
    (k) => !HIDDEN_KEYS.has(k) && !(kind === 'totals' && HIDDEN_TOTAL_KEYS.has(k)),
  );
  const desired = COLUMN_ORDER[familia][kind];
  const desiredSet = new Set(desired);
  const ordered = desired.filter((k) => visible.includes(k));
  const extras = visible.filter((k) => !desiredSet.has(k));
  return [...ordered, ...extras];
}
