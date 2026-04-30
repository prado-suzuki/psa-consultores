// Tradução UPPER_SNAKE → rótulo em PT-BR baseado nos cabeçalhos da planilha WP_ICMS_SAIDAS.xlsb (T03.1)
// e nas views BigQuery VW_ANL_*. Os nomes aqui já são CANÔNICOS (após canonicalKey).

const COMMON_LABELS: Record<string, string> = {
  ID_CONTRIBUINTE: 'Contribuinte',
  MES_ANO: 'Competência',
  DATA_NOTA: 'Data',
  NUM_NOTA: 'Nota Fiscal',
  NUM_DOC: 'Nº Documento',
  CFOP: 'CFOP',
  CST_ICMS: 'CST',
  DESCRICAO_CFOP: 'Descrição CFOP',
  DESCRICAO_PRODUTO: 'Produto',
  VALOR_MERCADORIA: 'Valor Mercadoria',
  VL_MERCADORIA: 'Valor Mercadoria',
  INCIDENCIA_ICMS: 'Incidência ICMS',
  BASE_CALCULO_ICMS: 'BC Cálculo',
  ALIQUOTA: 'Alíquota',
  ICMS_NORMAL: 'ICMS Normal',
  BENEFICIO: '% Benefício',
  VALOR_CREDITO: 'Valor Crédito',
  ICMS_RECOLHER: 'ICMS a Recolher',
  CHECK_: 'Check',
  // Fundos
  FUNDES: 'FUNDES',
  FUNDED: 'FUNDED',
  FUNDEIC: 'FUNDEIC',
  FUNDES_EFD: 'FUNDES (EFD)',
  FUNDED_EFD: 'FUNDED (EFD)',
  FUNDEIC_EFD: 'FUNDEIC (EFD)',
  // Etanol Interno
  QUANTIDADE: 'Qtd. (Litros)',
  PMPF: 'PMPF',
  PMPF_BC_REDUZIDA: '50% PMPF',
  pmpf_bc_reduzida: '50% PMPF',
  BC_CALCULADA: 'BC Calculada',
  bc_calculada: 'BC Calculada',
  ICMS_17_CALCULADO: 'ICMS 17%',
  icms_17_calculado: 'ICMS 17%',
  BC_ICMS_C190: 'EFD C190 - BC',
  VL_ICMS_C190: 'EFD C190 - ICMS',
  // Etanol Interestadual
  ICMS_12: 'ICMS 12%',
  VALOR_ICMS: 'Valor ICMS',
  CREDITO_OUTORGADO: 'Crédito Outorgado (73,33% / 0,21/L)',
  ICMS_DEVIDO: 'ICMS Devido',
  // Biodiesel
  EFD_C190_NF: 'NF (EFD C190)',
  ADREM: 'Alíquota Específica (R$/L)',
  ICMS_17: 'ICMS 17%',
  // Sucata
  CLASSIF: 'Classificação',
  // Checks derivados (calculados no front conforme planilha T03.1)
  C190_CHECK: 'EFD C190 - Check',
  ICMS_C190_CHECK: 'EFD C190 - Check (ICMS)',
  FUNDES_E116_CHECK: 'E116 - Check (FUNDES)',
  FUNDED_E116_CHECK: 'E116 - Check (FUNDED)',
  FUNDEIC_E116_CHECK: 'E116 - Check (FUNDEIC)',
};

export function labelFor(key: string): string {
  return COMMON_LABELS[key] ?? key;
}
