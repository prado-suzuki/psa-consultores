// Computa colunas Check derivadas, replicando a lógica da planilha
// WP_Revisao_Barralcool (T03.1) onde os Checks são SUMIFS contra E116/C190
// menos o valor calculado.
//
// Resumo (E116 - Check):  EFD − calculado
// Resumo (C190 - Check):  C190 − calculado
// Detail (Check):         calculado − C190  (sinal invertido na planilha original)

import type { FamiliaSaida } from '@/hooks/useSaidaIcms';

const coerceNumber = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const sub = (a: unknown, b: unknown): number | null => {
  const na = coerceNumber(a);
  const nb = coerceNumber(b);
  if (na === null || nb === null) return null;
  return na - nb;
};

const pickFirst = (row: Record<string, unknown>, keys: string[]): unknown => {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
};

/** Campo "ICMS calculado" usado pelo detail Check de cada família. */
const DETAIL_CALC_FIELD: Record<FamiliaSaida, string[]> = {
  acucar: ['ICMS_NORMAL'],
  etanol_interno: ['ICMS_17_CALCULADO', 'icms_17_calculado'],
  etanol_interestado: ['VALOR_ICMS'],
  residuos_producao: ['ICMS_NORMAL'],
  sucata: ['ICMS_NORMAL'],
  biodiesel: ['ICMS_17'],
};

/**
 * Detail-level Check (uma linha): `calc − VL_ICMS_C190`.
 * Não sobrescreve se a API já entrega `CHECK_` pronto.
 */
export function deriveDetailChecks(
  row: Record<string, unknown>,
  familia: FamiliaSaida,
): Record<string, unknown> {
  if ('CHECK_' in row) return row; // API já fornece o Check da linha

  const calc = pickFirst(row, DETAIL_CALC_FIELD[familia]);
  const c190 = row['VL_ICMS_C190'];
  if (calc === undefined || c190 === undefined || c190 === null) return row;

  return { ...row, C190_CHECK: sub(calc, c190) };
}

/**
 * Resumo-level Checks: E116 − calculado e C190 − calculado.
 */
export function deriveTotalsChecks(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };

  // E116 Checks (sempre EFD − calculado, mesma direção da planilha)
  if ('FUNDES_EFD' in row && 'FUNDES' in row) {
    out['FUNDES_E116_CHECK'] = sub(row['FUNDES_EFD'], row['FUNDES']);
  }
  if ('FUNDED_EFD' in row && 'FUNDED' in row) {
    out['FUNDED_E116_CHECK'] = sub(row['FUNDED_EFD'], row['FUNDED']);
  }
  if ('FUNDEIC_EFD' in row && 'FUNDEIC' in row) {
    out['FUNDEIC_E116_CHECK'] = sub(row['FUNDEIC_EFD'], row['FUNDEIC']);
  }

  // C190 Check ICMS (resumo): VL_ICMS_C190 − calculado
  const totalsCalc = pickFirst(row, [
    'ICMS_NORMAL',
    'ICMS_17_CALCULADO',
    'icms_17_calculado',
    'VALOR_ICMS',
    'ICMS_17',
  ]);
  if ('VL_ICMS_C190' in row && totalsCalc !== undefined) {
    out['ICMS_C190_CHECK'] = sub(row['VL_ICMS_C190'], totalsCalc);
  }

  return out;
}

