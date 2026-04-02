/**
 * Normalizes a PER/DCOMP process number to the standard 24-digit format:
 * XXXXX.XXXXX.XXXXXX.X.X.XX-XXXX
 */
export function normalizeProcessNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 24) return raw; // can't normalize non-24-digit strings
  return `${digits.slice(0, 5)}.${digits.slice(5, 10)}.${digits.slice(10, 16)}.${digits.slice(16, 17)}.${digits.slice(17, 18)}.${digits.slice(18, 20)}-${digits.slice(20, 24)}`;
}

/**
 * Normalizes monetary values that round to zero, avoiding displays like -0,00.
 */
export function normalizeCurrencyZero(value: number): number {
  return Math.abs(value) < 0.005 ? 0 : value;
}
