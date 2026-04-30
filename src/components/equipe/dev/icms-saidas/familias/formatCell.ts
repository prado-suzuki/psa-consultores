const CURRENCY_RE = /(^|_)(VL|VALOR|ICMS|FUND|FUNDES|FUNDED|FUNDEIC|BC|CREDITO|TOTAL|PMPF|ADREM)(_|$)/i;
const PERCENT_RE = /(ALIQ|PCT|PERCENT|BENEFICIO)/i;
const DATE_RE = /(DATA|DT_|DATA_NOTA)/i;
const ID_RE = /^(NF|NUM_NOTA|NUM_DOC|NUM_NF|NOTA_FISCAL|EFD_C190_NF|NUMERO_NOTA|ID_|MES_ANO|ANO_|MES_|CFOP|NCM|COD_|CST|CST_|CFOP_)/i;

const currencyFmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const numberFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

const NUMERIC_STRING_RE = /^-?\d+(\.\d+)?$/;

const coerceNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && NUMERIC_STRING_RE.test(value)) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

export function formatCell(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';

  if (DATE_RE.test(key) && typeof value === 'string') {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }

  // BigQuery NUMERIC vem como string em JSON — coerce antes de formatar
  const numericValue = coerceNumber(value);
  if (numericValue !== null) {
    if (ID_RE.test(key)) return String(numericValue);
    if (CURRENCY_RE.test(key)) return currencyFmt.format(numericValue);
    if (PERCENT_RE.test(key)) {
      // Backend devolve alíquotas/benefícios como decimal (0.12 = 12%, 0.75 = 75%).
      // Heurística: 0 < |v| <= 1 → multiplicar por 100. > 1 → assumir já em pontos percentuais.
      const abs = Math.abs(numericValue);
      const pct = abs > 0 && abs <= 1 ? numericValue * 100 : numericValue;
      return `${pct.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
    }
    return numberFmt.format(numericValue);
  }

  return String(value);
}

export function isNumericKey(key: string, value: unknown): boolean {
  if (coerceNumber(value) !== null) return true;
  return CURRENCY_RE.test(key) || PERCENT_RE.test(key);
}
