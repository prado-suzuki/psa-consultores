/* ══════════════════════════════════════════════════════════════
 *  Predicados CST + utilitários de pivoteamento
 *  Mantém buildPivot original (Geração 1) + buildPivotGeneric (Geração 2)
 * ══════════════════════════════════════════════════════════════ */

import type {
  PisCofinsItemCredito,
  PisCofsinPeriodo,
  PivotRow,
  PivotRowGeneric,
  ItemCredito,
  ContaNode,
} from '@/types/pisCofins';
import {
  isItemOutrasSaidas as _isItemOutrasSaidas,
  isItemIsencaoCredito as _isItemIsencaoCredito,
} from '@/lib/apuracaoPisCofins';

/* ── CST filter predicates (Geração 1 — mantidos) ── */

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

/* ── Predicados delegados (Geração 2) ── */

export const isItemOutrasSaidas = _isItemOutrasSaidas;
export const isItemIsencaoCredito = _isItemIsencaoCredito;

/* ── Generic pivot builder (Geração 1 — inalterado) ── */

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

/* ── Achatamento da árvore hierárquica para itens planos ── */

export function flattenContasToItens(contas: ContaNode[]): PisCofinsItemCredito[] {
  const result: PisCofinsItemCredito[] = [];

  function walk(nodes: ContaNode[]) {
    for (const node of nodes) {
      // Extrair lançamentos das folhas (nós sem children)
      if (!node.children || node.children.length === 0) {
        for (const lanc of node.lancamentos) {
          result.push({
            cst_pis: lanc.cst_pis ?? '',
            aliq_pis: lanc.aliq_pis ?? 0,
            cod_cta: lanc.cod_cta ?? node.cod_cta,
            descricao_conta: node.descricao_conta.trim(),
            bloco_efd: lanc.bloco_efd ?? '',
            vlr_efd: lanc.vlr_efd ?? 0,
            credito: lanc.credito ?? 0,
            debito: lanc.debito ?? 0,
            saldo_periodo: lanc.saldo_periodo ?? 0,
            saldo_atual: lanc.saldo_atual ?? 0,
          });
        }
      } else {
        walk(node.children);
      }
    }
  }

  walk(contas);
  return result;
}

/* ── Pivot genérico parametrizável (Geração 2) ── */

export function buildPivotGeneric(
  periodos: PisCofsinPeriodo[],
  filterFn: (i: ItemCredito) => boolean,
  groupBy: (i: ItemCredito) => string,
  valueFn: (i: ItemCredito) => number,
): PivotRowGeneric[] {
  if (!periodos?.length) return [];

  const rowsMap = new Map<string, PivotRowGeneric>();

  for (const periodo of periodos) {
    const month = periodo.dt_ini.substring(0, 7);
    for (const item of periodo.itens_credito) {
      if (!filterFn(item)) continue;

      const key = groupBy(item);
      if (!rowsMap.has(key)) {
        rowsMap.set(key, {
          key,
          cst_pis: item.cst_pis,
          cod_cta: item.cod_cta,
          descricao_conta: item.descricao_conta,
          bloco_efd: item.bloco_efd,
          total: 0,
        });
      }
      const row = rowsMap.get(key)!;
      const val = valueFn(item);
      row[month] = ((row[month] as number) || 0) + val;
      row.total += val;
    }
  }

  return Array.from(rowsMap.values()).sort((a, b) =>
    a.cod_cta.localeCompare(b.cod_cta, 'pt-BR', { numeric: true }),
  );
}
