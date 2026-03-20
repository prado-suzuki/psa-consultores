import type { PisCofinsItemCredito, PivotRow } from '@/types/pisCofins';
import type { PisCofsinPeriodo } from '@/types/pisCofins';

/* ── CST filter predicates (pure, testable) ── */

export const isDebito = (cst: string): boolean => {
  const n = parseInt(cst, 10);
  return !isNaN(n) && n >= 1 && n <= 10;
};

export const isExclusao = (cst: string): boolean => {
  const n = parseInt(cst, 10);
  return !isNaN(n) && n >= 4 && n <= 9;
};

export const isCredito = (cst: string, aliq_pis: number): boolean => {
  const n = parseInt(cst, 10);
  return !isNaN(n) && n >= 50 && n <= 66 && aliq_pis > 0;
};

/* ── Generic pivot builder ── */

type ItemFilter = (item: PisCofinsItemCredito) => boolean;

export interface PivotResult {
  rows: PivotRow[];
  periodos: string[];
}

export function buildPivot(
  periodos: PisCofsinPeriodo[],
  filterFn?: ItemFilter,
): PivotResult {
  if (!periodos?.length) return { rows: [], periodos: [] };

  const periodKeys = [...new Set(periodos.map(p => p.dt_ini.slice(0, 7)))].sort();

  const map = new Map<string, PivotRow>();

  for (const periodo of periodos) {
    const pk = periodo.dt_ini.slice(0, 7);
    for (const item of periodo.itens_credito) {
      if (filterFn && !filterFn(item)) continue;

      const key = `${item.cst_pis}|${item.cod_cta}|${item.bloco_efd}`;
      if (!map.has(key)) {
        map.set(key, {
          cst_pis: item.cst_pis,
          cod_cta: item.cod_cta,
          descricao_conta: item.descricao_conta,
          bloco_efd: item.bloco_efd,
          valores: {},
        });
      }
      const row = map.get(key)!;
      row.valores[pk] = (row.valores[pk] || 0) + item.vlr_efd;
    }
  }

  const rows = Array.from(map.values()).sort((a, b) =>
    a.cod_cta.localeCompare(b.cod_cta, 'pt-BR', { numeric: true }),
  );

  return { rows, periodos: periodKeys };
}
