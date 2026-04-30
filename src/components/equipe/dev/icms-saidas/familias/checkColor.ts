// Detecta colunas de "Check/Diferença" e retorna classe de cor tricolor.
// Para checks derivados (em BRL), calcula a divergência relativa contra
// o campo base, comparada aos thresholds verde/amarelo/vermelho.

const CHECK_KEY_RE = /(_CHECK$|^CHECK_?$|^DIF$|EFD.*CHECK|E116.*CHECK|_DIF$)/i;

const VERDE = 0.005; // < 0.5% — divergência insignificante
const AMARELO = 0.02; // < 2% — atenção

const coerceNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

/** Para cada Check derivado, qual campo serve de base p/ % relativo. */
const CHECK_BASE_MAP: Record<string, string[]> = {
  FUNDES_E116_CHECK: ['FUNDES'],
  FUNDED_E116_CHECK: ['FUNDED'],
  FUNDEIC_E116_CHECK: ['FUNDEIC'],
  ICMS_C190_CHECK: [
    'ICMS_NORMAL',
    'ICMS_17_CALCULADO',
    'icms_17_calculado',
    'VALOR_ICMS',
    'ICMS_17',
  ],
  C190_CHECK: [
    'ICMS_NORMAL',
    'ICMS_17_CALCULADO',
    'icms_17_calculado',
    'VALOR_ICMS',
    'ICMS_17',
  ],
};

export function isCheckKey(key: string): boolean {
  return CHECK_KEY_RE.test(key);
}

/**
 * Retorna a classe Tailwind para colorir a célula de Check.
 * Quando `row` é fornecida e o key é um Check derivado, calcula a divergência
 * relativa (|diff/base|). Caso contrário, usa o valor em si (assumindo que já
 * é um percentual, como nos Checks originais da planilha).
 */
export function checkColorClass(
  key: string,
  value: unknown,
  row?: Record<string, unknown>,
): string {
  if (!isCheckKey(key)) return '';
  const num = coerceNumber(value);
  if (num === null) return '';

  let relativeAbs = Math.abs(num);
  const baseKeys = CHECK_BASE_MAP[key];
  if (baseKeys && row) {
    for (const bk of baseKeys) {
      const base = coerceNumber(row[bk]);
      if (base !== null && base !== 0) {
        relativeAbs = Math.abs(num / base);
        break;
      }
    }
  }

  if (relativeAbs < VERDE) return 'text-emerald-700 bg-emerald-50/60';
  if (relativeAbs < AMARELO) return 'text-amber-700 bg-amber-50/60';
  return 'text-red-700 bg-red-50/60 font-semibold';
}
