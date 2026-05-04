// Computa colunas Check derivadas, replicando a logica da planilha
// WP_Revisao_Barralcool (T03.1) onde os Checks sao SUMIFS contra E116/C190
// menos o valor calculado.
//
// Resumo (E116 - Check):  EFD - calculado
// Resumo (C190 - Check):  C190 - calculado
// Detail (Check):         calculado - C190  (sinal invertido na planilha original)

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

/** Campo "ICMS calculado" usado pelo detail Check de cada familia. */
const DETAIL_CALC_FIELD: Record<FamiliaSaida, string[]> = {
  acucar: ['ICMS_NORMAL'],
  etanol_interno: ['ICMS_17_CALCULADO', 'icms_17_calculado'],
  etanol_interestado: ['VALOR_ICMS'],
  residuos_producao: ['ICMS_NORMAL'],
  sucata: ['ICMS_NORMAL'],
  biodiesel: ['ICMS_17'],
};

/**
 * Detail-level Check (uma linha): `calc - VL_ICMS_C190`.
 * Nao sobrescreve se a API ja entrega o Check da linha.
 */
export function deriveDetailChecks(
  row: Record<string, unknown>,
  familia: FamiliaSaida,
): Record<string, unknown> {
  if ('CHECK_' in row || 'C190_CHECK' in row) return row;

  const calc = pickFirst(row, DETAIL_CALC_FIELD[familia]);
  const c190 = row['VL_ICMS_C190'];
  if (calc === undefined || c190 === undefined || c190 === null) return row;

  return { ...row, C190_CHECK: sub(calc, c190) };
}

/**
 * Resumo-level Checks: E116 - calculado e C190 - calculado.
 */
export function deriveTotalsChecks(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };

  // E116 Checks (sempre EFD - calculado, mesma direcao da planilha)
  if ('FUNDES_EFD' in row && 'FUNDES' in row) {
    out['FUNDES_E116_CHECK'] = sub(row['FUNDES_EFD'], row['FUNDES']);
  }
  if ('FUNDED_EFD' in row && 'FUNDED' in row) {
    out['FUNDED_E116_CHECK'] = sub(row['FUNDED_EFD'], row['FUNDED']);
  }
  if ('FUNDEIC_EFD' in row && 'FUNDEIC' in row) {
    out['FUNDEIC_E116_CHECK'] = sub(row['FUNDEIC_EFD'], row['FUNDEIC']);
  }
  if ('ICMS_RECOLHER' in row) {
    const icmsRecolherEfd = pickFirst(row, [
      'ICMS_RECOLHER_EFD',
      'ICMS_RECOLHER_E116',
      'E116_ICMS_RECOLHER',
      'E116_ICMS',
      'ICMS_EFD',
    ]);
    if (icmsRecolherEfd !== undefined) {
      out['ICMS_RECOLHER_E116_CHECK'] = sub(icmsRecolherEfd, row['ICMS_RECOLHER']);
    }
  }
  if ('ICMS_DEVIDO' in row) {
    const icmsDevidoEfd = pickFirst(row, [
      'ICMS_DEVIDO_EFD',
      'ICMS_DEVIDO_E116',
      'E116_ICMS_DEVIDO',
      'E116_ICMS',
      'ICMS_EFD',
    ]);
    if (icmsDevidoEfd !== undefined) {
      out['ICMS_DEVIDO_E116_CHECK'] = sub(icmsDevidoEfd, row['ICMS_DEVIDO']);
    }
  }

  // C190 Check ICMS (resumo): VL_ICMS_C190 - calculado
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
