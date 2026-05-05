const CURRENCY_RE = /(^|_)(VL|VALOR|ICMS|FUND|FUNDES|FUNDED|FUNDEIC|BC|CREDITO|TOTAL|PMPF|ADREM)(_|$)/i;
const PERCENT_RE = /(ALIQ|PCT|PERCENT|BENEFICIO|MVA)/i;
const DATE_RE = /(DATA|DT_|DATA_NOTA)/i;
const COMPETENCIA_RE = /^(MES_ANO|COMPETENCIA|MES_ANO_EXERCICIO)$/i;
const ID_RE = /^(NF|NUM_NOTA|NUM_DOC|NUM_NF|NOTA_FISCAL|EFD_C190_NF|NUMERO_NOTA|ID_|MES_ANO|ANO_|MES_|CFOP|NCM|COD_|CST|CST_|CFOP_)/i;

const currencyFmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const numberFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

const NUMERIC_STRING_RE = /^-?\d+(\.\d+)?$/;
const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const capitalizePtBr = (value: string) =>
  value
    ? value.charAt(0).toLocaleUpperCase('pt-BR') + value.slice(1).toLocaleLowerCase('pt-BR')
    : value;

const monthName = (monthIndex: number): string | null =>
  monthIndex >= 0 && monthIndex < MONTH_NAMES.length ? MONTH_NAMES[monthIndex] : null;

const formatCompetencia = (value: string): string => {
  const raw = value.trim();
  if (!raw) return value;

  const mmYear = raw.match(/^(\d{2})\/(\d{4})$/);
  if (mmYear) {
    const month = monthName(Number(mmYear[1]) - 1);
    return month ?? value;
  }

  const isoMonth = raw.match(/^(\d{4})-(\d{2})$/);
  if (isoMonth) {
    const month = monthName(Number(isoMonth[2]) - 1);
    return month ?? value;
  }

  const isoDate = raw.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (isoDate) {
    const month = monthName(Number(isoDate[2]) - 1);
    return month ?? value;
  }

  const monthOnly = raw.match(/^([A-Za-zÀ-ÿ]+)$/u);
  if (monthOnly) return capitalizePtBr(monthOnly[1]);

  const monthYearText = raw.match(/^([A-Za-zÀ-ÿ]+)\/(\d{4})$/u);
  if (monthYearText) return capitalizePtBr(monthYearText[1]);

  return value;
};

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

  if (COMPETENCIA_RE.test(key) && typeof value === 'string') {
    return formatCompetencia(value);
  }

  if (DATE_RE.test(key) && typeof value === 'string') {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }

  // BigQuery NUMERIC vem como string em JSON - coerce antes de formatar
  const numericValue = coerceNumber(value);
  if (numericValue !== null) {
    if (ID_RE.test(key)) return String(numericValue);
    if (CURRENCY_RE.test(key)) return currencyFmt.format(numericValue);
    if (PERCENT_RE.test(key)) {
      // Backend devolve aliquotas/beneficios como decimal (0.12 = 12%, 0.75 = 75%).
      // Heuristica: 0 < |v| <= 1 -> multiplicar por 100. > 1 -> assumir ja em pontos percentuais.
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
