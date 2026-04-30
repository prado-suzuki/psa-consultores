// Ordenação e ocultação de colunas por família, alinhadas ao layout da
// planilha WP_Revisao_Barralcool_2º Semestre 2025 (T03.1_Saídas).
//
// Colunas presentes na resposta da API mas não declaradas em ORDER vão para
// o final ("extras"). Se a coluna está em ORDER mas não vem na resposta,
// ela simplesmente não aparece (sem placeholder).

import type { FamiliaSaida } from '@/hooks/useSaidaIcms';

/** Colunas que nunca devem aparecer (redundantes ou substituídas por derivadas). */
const HIDDEN_KEYS = new Set([
  'ID_CONTRIBUINTE', // sempre o do filtro — redundante
  'FUNDES_EFD',      // raw E116 — substituído pelo Check derivado
  'FUNDED_EFD',
  'FUNDEIC_EFD',
]);

interface FamilyOrder {
  data: string[];
  totals: string[];
}

export const COLUMN_ORDER: Record<FamiliaSaida, FamilyOrder> = {
  // BLOCO 1 (planilha cols 2-17)
  acucar: {
    data: [
      'MES_ANO',           // Competência
      'NUM_NOTA',          // Nota Fiscal
      'DATA_NOTA',         // Data
      'CFOP',              // C.F.O.P.
      'DESCRICAO_CFOP',    // Descrição
      'DESCRICAO_PRODUTO', // Produto
      'VALOR_MERCADORIA',  // Valor Mercadoria
      'INCIDENCIA_ICMS',   // Incidência do ICMS?
      'BASE_CALCULO_ICMS', // BC Cálculo
      'ALIQUOTA',          // Alíquota
      'ICMS_NORMAL',       // ICMS Normal
      'BENEFICIO',         // % Benefício
      'VALOR_CREDITO',     // Valor Crédito
      'ICMS_RECOLHER',     // ICMS Recolher
      'FUNDES',            // FUNDES 6%
      'FUNDED',            // FUNDED 1%
    ],
    // Resumo planilha cols 8-14: Comp | ICMS Normal | ICMS Recolher | FUNDES | E116-Check | FUNDED | E116-Check
    totals: [
      'MES_ANO',
      'ICMS_NORMAL',
      'ICMS_RECOLHER',
      'FUNDES',
      'FUNDES_E116_CHECK',
      'FUNDED',
      'FUNDED_E116_CHECK',
    ],
  },

  // BLOCO 2 (planilha cols 19-35)
  etanol_interno: {
    data: [
      'MES_ANO',           // Competência
      'DATA_NOTA',         // Data
      'NUM_NOTA',          // Nota Fiscal
      'NUM_DOC',           // EFD - C190 (NF do EFD)
      'CFOP',              // C.F.O.P.
      'CST_ICMS',          // CST
      'DESCRICAO_CFOP',    // Descrição
      'DESCRICAO_PRODUTO', // Produto
      'INCIDENCIA_ICMS',   // Incidência do ICMS?
      'QUANTIDADE',        // QNT/BC Litros
      'PMPF',              // PMPF
      'PMPF_BC_REDUZIDA',  // 38% PMPF (BC reduzida)
      'BC_CALCULADA',      // BC (calculada)
      'BASE_CALCULO_ICMS', // BC ICMS (raw da view, se vier)
      'ICMS_17_CALCULADO', // ICMS 17%
      'BC_ICMS_C190',      // EFD - C190 (BC)
      'VL_ICMS_C190',      // EFD - C190 (Vl ICMS)
      'C190_CHECK',        // Check (derivado)
    ],
    // Resumo planilha cols 27-29: Comp | ICMS Normal | EFD C190-Check
    totals: ['MES_ANO', 'ICMS_17_CALCULADO', 'VL_ICMS_C190', 'ICMS_C190_CHECK'],
  },

  // BLOCO 3 (planilha cols 37-53)
  etanol_interestado: {
    data: [
      'MES_ANO',           // Competência
      'NUM_NOTA',          // Nota Fiscal
      'DATA_NOTA',         // Data
      'CFOP',              // C.F.O.P.
      'DESCRICAO_CFOP',    // Descrição
      'CST_ICMS',          // CST
      'DESCRICAO_PRODUTO', // Produto
      'INCIDENCIA_ICMS',   // Incidência do ICMS?
      'QUANTIDADE',        // Quantidade
      'VALOR_MERCADORIA',  // Valor
      'ICMS_12',           // ICMS 12%
      'BASE_CALCULO_ICMS', // BC ICMS
      'VALOR_ICMS',        // Valor ICMS
      'CREDITO_OUTORGADO', // Crédito Outor. 73,3333% / 0,21/L
      'ICMS_DEVIDO',       // ICMS Devido
      'FUNDEIC',           // FUNDEIC 1%
      'FUNDED',            // FUNDED 1%
    ],
    // Resumo planilha cols 46-53: Comp | ICMS Normal | EFD C190-Check | ICMS Devido | FUNDEIC | E116-Check | FUNDED | E116-Check
    totals: [
      'MES_ANO',
      'VALOR_ICMS',          // ICMS Normal (12%)
      'VL_ICMS_C190',        // valor escriturado C190
      'ICMS_C190_CHECK',     // EFD C190-Check (derivado)
      'ICMS_DEVIDO',
      'FUNDEIC',
      'FUNDEIC_E116_CHECK',
      'FUNDED',
      'FUNDED_E116_CHECK',
    ],
  },

  // BLOCO 4 (planilha cols 55-67)
  residuos_producao: {
    data: [
      'MES_ANO',           // Competência
      'NUM_NOTA',          // Nota Fiscal
      'DATA_NOTA',         // Data
      'CFOP',              // C.F.O.P.
      'DESCRICAO_PRODUTO', // Produto
      'VALOR_MERCADORIA',  // Valor Mercadoria
      'INCIDENCIA_ICMS',   // Incidência do ICMS?
      'BASE_CALCULO_ICMS', // BC Cálculo
      'ALIQUOTA',          // Alíquota
      'ICMS_NORMAL',       // ICMS Normal
      'BC_ICMS_C190',      // C190 - BC
      'VL_ICMS_C190',      // C190 - Vl. ICMS
      'CHECK_',            // Check (vem da API)
    ],
    totals: [],
  },

  // BLOCO 5 (planilha cols 70-84)
  sucata: {
    data: [
      'MES_ANO',           // Competência
      'NUM_NOTA',          // Nº NF
      'DATA_NOTA',         // Data
      'CFOP',              // CFOP
      'DESCRICAO_CFOP',    // Descrição
      'DESCRICAO_PRODUTO', // Produto
      'CLASSIF',           // Classif.
      'VALOR_MERCADORIA',  // Valor
      'INCIDENCIA_ICMS',   // Incidência do ICMS?
      'BASE_CALCULO_ICMS', // BC Cálculo
      'ALIQUOTA',          // Alíquota
      'ICMS_NORMAL',       // ICMS Normal
      'BC_ICMS_C190',      // EFD C190 - BC
      'VL_ICMS_C190',      // C190 - Vl. ICMS
      'CHECK_',            // Check
    ],
    totals: [],
  },

  // BLOCO 6 (planilha cols 86-105)
  biodiesel: {
    data: [
      'MES_ANO',           // Competência
      'DATA_NOTA',         // Data
      'NUM_NOTA',          // Nota Fiscal
      'EFD_C190_NF',       // EFD - C190 (NF)
      'CFOP',              // C.F.O.P.
      'CST_ICMS',          // CST
      'DESCRICAO_CFOP',    // Descrição
      'DESCRICAO_PRODUTO', // Produto
      'INCIDENCIA_ICMS',   // Incidência do ICMS?
      'QUANTIDADE',        // QNT/BC Litros
      'ADREM',             // AdRem
      'BASE_CALCULO_ICMS', // BC
      'ICMS_17',           // ICMS 17%
      'BC_ICMS_C190',      // EFD - C190 (BC)
      'VL_ICMS_C190',      // EFD - C190 (Vl ICMS)
      'CHECK_',            // Check
      'CREDITO_OUTORGADO', // Crédito Outor. 85%
      'ICMS_DEVIDO',       // ICMS Devido
      'FUNDEIC',           // FUNDEIC 1%
      'FUNDED',            // FUNDED 1%
    ],
    // Resumo planilha cols 94-101: Comp | ICMS Normal | EFD C190-Check | ICMS Devido | FUNDEIC | E116-Check | FUNDED | E116-Check
    totals: [
      'MES_ANO',
      'ICMS_17',
      'VL_ICMS_C190',
      'ICMS_C190_CHECK',
      'ICMS_DEVIDO',
      'FUNDEIC',
      'FUNDEIC_E116_CHECK',
      'FUNDED',
      'FUNDED_E116_CHECK',
    ],
  },
};

/** Filtra escondidas e ordena conforme layout da planilha. Extras vão para o final. */
export function orderColumns(
  actual: string[],
  familia: FamiliaSaida,
  kind: 'data' | 'totals',
): string[] {
  const visible = actual.filter((k) => !HIDDEN_KEYS.has(k));
  const desired = COLUMN_ORDER[familia][kind];
  const desiredSet = new Set(desired);
  const ordered = desired.filter((k) => visible.includes(k));
  const extras = visible.filter((k) => !desiredSet.has(k));
  return [...ordered, ...extras];
}
