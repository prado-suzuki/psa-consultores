import type { Database } from '@/integrations/supabase/types';
import { normalizeCurrencyZero } from '@/lib/perdcompUtils';
import { applySelicCorrection, isWithinGracePeriod } from '@/lib/selicCalculator';

type PerRow = Database['public']['Tables']['per']['Row'];
type DcompRow = Database['public']['Tables']['dcomp']['Row'];

export type ControlePer = PerRow & {
  contribuinte_ambiente?: string | null;
  contribuinte_nome?: string | null;
};
export type ControleDcomp = DcompRow;

export interface ControlePerSituacao {
  nr_proc_per: string;
  situacao: string;
  criado_em: string | null;
  dt_pagamento: string | null;
}

export interface ControlePerSituacaoInfo {
  situacao: string;
  criado_em: string;
  dt_pagamento: string | null;
}

export type ControlePerSituacaoMap = Record<string, ControlePerSituacaoInfo>;

export interface ControleDistribuicao {
  nr_documento: string;
  valor_tributo: number | null;
  valor_original: number | null;
}

export interface SelicFactor {
  fator: number;
}

export interface SelicCorrection {
  valorCorrigido: number;
  fator: number;
}

export type ControleSortDirection = 'asc' | 'desc';

export interface ControlePerTotals {
  credito: number;
  corrigido: number;
  compensado: number;
  ressarcido: number;
  saldo: number;
}

export interface ControlePagination {
  totalPages: number;
  start: number;
  end: number;
  items: ControlePer[];
}

export const PREDEFINED_SITUACOES = [
  'Aguardando Documentação',
  'Análise concluída',
  'Análise preliminar disponibilizada',
  'Analisado',
  'Contribuinte intimado',
  'Deferido',
  'Deferido Parcialmente',
  'Despacho decisório emitido',
  'Em Análise',
  'Em discussão administrativa - CARF',
  'Em discussão administrativa - CSRF',
  'Em discussão administrativa - DRJ',
  'Homologado',
  'Indeferido',
  'Não admitido',
  'Pago',
  'PER deferido',
  'Pendente de Análise',
  'Retificado',
] as const;

export function buildLatestSituacoesMap(rows: ControlePerSituacao[]): ControlePerSituacaoMap {
  const map: ControlePerSituacaoMap = {};
  for (const row of rows) {
    if (!map[row.nr_proc_per]) {
      map[row.nr_proc_per] = {
        situacao: row.situacao,
        criado_em: row.criado_em || '',
        dt_pagamento: row.dt_pagamento || null,
      };
    }
  }
  return map;
}

export function getRectifiedPerNumbers(pers: ControlePer[]): Set<string> {
  return new Set(pers.flatMap((per) => (per.nr_proc_ret ? [per.nr_proc_ret] : [])));
}

export function getRectifiedDcompNumbers(dcomps: ControleDcomp[]): Set<string> {
  return new Set(dcomps.flatMap((dcomp) => (dcomp.nr_dcomp_ret ? [dcomp.nr_dcomp_ret] : [])));
}

export function getCurrentDcompDocumentNumbers(
  dcomps: ControleDcomp[],
  rectified: ReadonlySet<string>,
): string[] {
  return dcomps
    .filter((dcomp) => !rectified.has(dcomp.nr_documento))
    .map((dcomp) => dcomp.nr_documento);
}

export function sumCompensatedByPer(
  dcomps: ControleDcomp[],
  rectified: ReadonlySet<string>,
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const dcomp of dcomps) {
    if (rectified.has(dcomp.nr_documento)) continue;
    totals[dcomp.nr_per_orig] = (totals[dcomp.nr_per_orig] || 0) + (dcomp.vlr_compensado || 0);
  }
  return totals;
}

export function sumOriginalDistributedByPer(
  distributions: ControleDistribuicao[],
  dcomps: ControleDcomp[],
  rectified: ReadonlySet<string>,
): Record<string, number> {
  const documentToPer: Record<string, string> = {};
  const totals: Record<string, number> = {};
  for (const dcomp of dcomps) {
    if (!rectified.has(dcomp.nr_documento)) documentToPer[dcomp.nr_documento] = dcomp.nr_per_orig;
  }
  for (const row of distributions) {
    const perNumber = documentToPer[row.nr_documento];
    if (!perNumber) continue;
    // Legacy rows may only have valor_tributo; keep that mixed-data fallback.
    const value = Number(row.valor_original ?? row.valor_tributo ?? 0);
    totals[perNumber] = (totals[perNumber] || 0) + value;
  }
  return totals;
}

export interface ControlePerFilters {
  exercicio: string;
  processo: string;
  situacoes: string[];
}

export function filterControlePers(
  pers: ControlePer[],
  dcomps: ControleDcomp[],
  situations: ControlePerSituacaoMap,
  filters: ControlePerFilters,
): ControlePer[] {
  const rectified = getRectifiedPerNumbers(pers);
  const filterDigits = filters.processo.replace(/\D/g, '');
  return pers.filter((per) => {
    if (rectified.has(per.nr_per)) return false;
    if (filters.exercicio && per.exercicio !== parseInt(filters.exercicio)) return false;
    if (
      filters.situacoes.length > 0 &&
      !filters.situacoes.includes(situations[per.nr_per]?.situacao || '')
    ) {
      return false;
    }
    if (filters.processo) {
      const matchesPer = per.nr_per.includes(filterDigits);
      const matchesDcomp = dcomps.some(
        (dcomp) => dcomp.nr_per_orig === per.nr_per && dcomp.nr_documento.includes(filterDigits),
      );
      if (!matchesPer && !matchesDcomp) return false;
    }
    return true;
  });
}

export function mergeControleSituacoes(dbSituations: string[]): string[] {
  return Array.from(new Set<string>([...PREDEFINED_SITUACOES, ...dbSituations])).sort();
}

export function buildSelicPerInputs(
  pers: ControlePer[],
): Array<{ nr_per: string; dt_solicitada: string }> {
  return pers
    .filter((per) => per.dt_solicitada)
    .map((per) => ({ nr_per: per.nr_per, dt_solicitada: per.dt_solicitada }));
}

export function calculateSelicCorrections(
  pers: ControlePer[],
  selicByPer: Record<string, SelicFactor>,
  compensatedByPer: Record<string, number>,
  originalByPer: Record<string, number>,
): Record<string, SelicCorrection> {
  const corrections: Record<string, SelicCorrection> = {};
  for (const per of pers) {
    if (!per.dt_solicitada) continue;
    if (isWithinGracePeriod(per.dt_solicitada)) {
      corrections[per.nr_per] = { valorCorrigido: 0, fator: 0 };
      continue;
    }
    const selic = selicByPer[per.nr_per];
    if (!selic) continue;
    const original = originalByPer[per.nr_per] ?? (compensatedByPer[per.nr_per] || 0);
    // The view may temporarily omit this new column; retain the legacy-value fallback.
    const refunded = per.vlr_ressarcido_original ?? per.vlr_ressarcido ?? 0;
    const balance = normalizeCurrencyZero(per.vlr_credito - original - refunded);
    corrections[per.nr_per] = applySelicCorrection(balance, selic.fator);
  }
  return corrections;
}

export function getControlePerValues(
  per: ControlePer,
  compensatedByPer: Record<string, number>,
  originalByPer: Record<string, number>,
) {
  const compensated = compensatedByPer[per.nr_per] || 0;
  const original = originalByPer[per.nr_per] ?? compensated;
  const refunded = per.vlr_ressarcido || 0;
  const refundedOriginal = per.vlr_ressarcido_original ?? refunded;
  const balance = normalizeCurrencyZero(per.vlr_credito - original - refundedOriginal);
  return { compensated, original, refunded, refundedOriginal, balance };
}

export function getRoundedControleBalance(balance: number): number {
  return normalizeCurrencyZero(Math.round(balance * 100) / 100);
}

export function calculateControleTotals(
  pers: ControlePer[],
  compensatedByPer: Record<string, number>,
  originalByPer: Record<string, number>,
  corrections: Record<string, SelicCorrection>,
): ControlePerTotals {
  const totals: ControlePerTotals = {
    credito: 0,
    corrigido: 0,
    compensado: 0,
    ressarcido: 0,
    saldo: 0,
  };
  for (const per of pers) {
    const values = getControlePerValues(per, compensatedByPer, originalByPer);
    const correction = corrections[per.nr_per];
    totals.credito += per.vlr_credito;
    totals.corrigido += correction ? values.balance * (1 + correction.fator) : 0;
    totals.compensado += values.compensated;
    totals.ressarcido += values.refunded;
    totals.saldo += values.balance;
  }
  return totals;
}

function getSortValue(
  per: ControlePer,
  column: string,
  situations: ControlePerSituacaoMap,
  compensatedByPer: Record<string, number>,
  originalByPer: Record<string, number>,
  corrections: Record<string, SelicCorrection>,
): string | number {
  const values = getControlePerValues(per, compensatedByPer, originalByPer);
  switch (column) {
    case 'processo':
      return per.nr_per;
    case 'situacao':
      return situations[per.nr_per]?.situacao || '';
    case 'dt_solicitada':
      return per.dt_solicitada || '';
    case 'exercicio':
      return per.exercicio;
    case 'trimestre':
      return per.tri_exercicio;
    case 'vlr_credito':
      return per.vlr_credito;
    case 'vlr_compensado':
      return values.compensated;
    case 'saldo':
      return values.balance;
    case 'vlr_corrigido':
      return values.balance * (1 + (corrections[per.nr_per]?.fator || 0));
    default:
      return '';
  }
}

export function sortControlePers(
  pers: ControlePer[],
  column: string | null,
  direction: ControleSortDirection,
  situations: ControlePerSituacaoMap,
  compensatedByPer: Record<string, number>,
  originalByPer: Record<string, number>,
  corrections: Record<string, SelicCorrection>,
): ControlePer[] {
  if (!column) return pers;
  return [...pers].sort((left, right) => {
    const leftValue = getSortValue(
      left,
      column,
      situations,
      compensatedByPer,
      originalByPer,
      corrections,
    );
    const rightValue = getSortValue(
      right,
      column,
      situations,
      compensatedByPer,
      originalByPer,
      corrections,
    );
    const comparison = leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
    return direction === 'asc' ? comparison : -comparison;
  });
}

export function buildControlePagination(
  pers: ControlePer[],
  page: number,
  pageSize: number,
): ControlePagination {
  const offset = (page - 1) * pageSize;
  return {
    totalPages: Math.ceil(pers.length / pageSize),
    start: offset + 1,
    end: Math.min(page * pageSize, pers.length),
    items: pers.slice(offset, page * pageSize),
  };
}
