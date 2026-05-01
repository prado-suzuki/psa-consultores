// Merge de correções manuais (correcoes_icms) com os dados vindos da API:
// - no detalhe: vira uma linha extra com __correcao=true
// - no resumo mensal: soma os campos numéricos no MES_ANO da data_lancamento
//   (criando linha nova caso o mês não exista nos totalizadores).

import type { CorrecaoIcmsRow, FamiliaCorrecao } from '@/hooks/useCorrecoesIcms';

const num = (v: unknown): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const mesAno = (dataIso: string): string => {
  // 'YYYY-MM-DD' → 'MM/YYYY' (formato usado pela API no resumo mensal)
  const [y, m] = dataIso.slice(0, 7).split('-');
  return `${m}/${y}`;
};

/** Normaliza diferentes formatos de competência para 'MM/YYYY'. */
const normalizeMesAno = (raw: string): string => {
  if (!raw) return raw;
  // 'YYYY-MM' → 'MM/YYYY'
  const isoMatch = raw.match(/^(\d{4})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[2]}/${isoMatch[1]}`;
  // 'YYYY-MM-DD' → 'MM/YYYY'
  const isoFullMatch = raw.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (isoFullMatch) return `${isoFullMatch[2]}/${isoFullMatch[1]}`;
  return raw; // já é 'MM/YYYY' ou outro formato
};

/** Campos do resumo mensal que cada família soma a partir da correção. */
const TOTAL_FIELDS: Record<FamiliaCorrecao, string[]> = {
  acucar: ['ICMS_NORMAL', 'ICMS_RECOLHER', 'FUNDES', 'FUNDED'],
  etanol_interestado: ['VALOR_ICMS', 'ICMS_DEVIDO', 'FUNDEIC', 'FUNDED'],
  biodiesel: ['ICMS_DEVIDO', 'FUNDEIC', 'FUNDED'],
};

/** Deriva os totais de uma única correção (campos não persistidos). */
function correcaoTotals(
  c: CorrecaoIcmsRow,
  familia: FamiliaCorrecao,
): Record<string, number> {
  const f = c.campos ?? {};
  if (familia === 'acucar') {
    const valor = num(f.VALOR_MERCADORIA);
    const aliq = num(f.ALIQUOTA);
    const credito = num(f.VALOR_CREDITO);
    const icmsNormal = (valor * aliq) / 100;
    return {
      ICMS_NORMAL: icmsNormal,
      ICMS_RECOLHER: icmsNormal - credito,
      FUNDES: num(f.FUNDES),
      FUNDED: num(f.FUNDED),
    };
  }
  if (familia === 'etanol_interestado') {
    const valorIcms = num(f.VALOR_ICMS);
    const credito = num(f.CREDITO_OUTORGADO);
    return {
      VALOR_ICMS: valorIcms,
      ICMS_DEVIDO: valorIcms - credito,
      FUNDEIC: num(f.FUNDEIC),
      FUNDED: num(f.FUNDED),
    };
  }
  // biodiesel
  return {
    ICMS_DEVIDO: num(f.ICMS_DEVIDO),
    FUNDEIC: num(f.FUNDEIC),
    FUNDED: num(f.FUNDED),
  };
}

/** Converte uma correção em linha de detalhe canônica. */
export function correcaoToDetailRow(
  c: CorrecaoIcmsRow,
  familia: FamiliaCorrecao,
): Record<string, unknown> {
  const totals = correcaoTotals(c, familia);
  const f = c.campos ?? {};
  const base: Record<string, unknown> = {
    __correcao: true,
    __correcao_id: c.id,
    MES_ANO: c.competencia ? normalizeMesAno(c.competencia) : mesAno(c.data_lancamento),
    DATA_NOTA: c.data_lancamento,
    NUM_NOTA: 'CORREÇÃO',
    DESCRICAO_PRODUTO: c.produto || c.descricao,
    DESCRICAO_CFOP: c.descricao,
    ...f,
    ...totals,
  };
  return base;
}

export function mergeCorrecoesIntoDetail(
  rows: Record<string, unknown>[],
  correcoes: CorrecaoIcmsRow[],
  familia: FamiliaCorrecao,
): Record<string, unknown>[] {
  if (correcoes.length === 0) return rows;
  const extras = correcoes.map((c) => correcaoToDetailRow(c, familia));
  return [...rows, ...extras];
}

export function mergeCorrecoesIntoTotals(
  totals: Record<string, unknown>[],
  correcoes: CorrecaoIcmsRow[],
  familia: FamiliaCorrecao,
): Record<string, unknown>[] {
  if (correcoes.length === 0) return totals;

  const fields = TOTAL_FIELDS[familia];
  const byMes = new Map<string, Record<string, unknown>>();

  totals.forEach((row) => {
    const key = String(row.MES_ANO ?? '');
    byMes.set(key, { ...row });
  });

  correcoes.forEach((c) => {
    const key = c.competencia || mesAno(c.data_lancamento);
    const t = correcaoTotals(c, familia);
    const existing = byMes.get(key);
    if (existing) {
      fields.forEach((field) => {
        const prev = num(existing[field]);
        const inc = num(t[field]);
        existing[field] = prev + inc;
      });
      byMes.set(key, existing);
    } else {
      const novo: Record<string, unknown> = { MES_ANO: key };
      fields.forEach((field) => {
        novo[field] = num(t[field]);
      });
      byMes.set(key, novo);
    }
  });

  return Array.from(byMes.values()).sort((a, b) =>
    String(a.MES_ANO ?? '').localeCompare(String(b.MES_ANO ?? '')),
  );
}
