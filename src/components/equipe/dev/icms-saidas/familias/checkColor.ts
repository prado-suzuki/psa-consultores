// Detecta colunas de "Check/Diferença" e retorna classe de cor tricolor.

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

export function isCheckKey(key: string): boolean {
  return CHECK_KEY_RE.test(key);
}

export function checkColorClass(key: string, value: unknown): string {
  if (!isCheckKey(key)) return '';
  const num = coerceNumber(value);
  if (num === null) return '';
  const abs = Math.abs(num);
  if (abs < VERDE) return 'text-emerald-700 bg-emerald-50/60';
  if (abs < AMARELO) return 'text-amber-700 bg-amber-50/60';
  return 'text-red-700 bg-red-50/60 font-semibold';
}
