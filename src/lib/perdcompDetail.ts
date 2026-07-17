import type { Database } from '@/integrations/supabase/types';
import { normalizeCurrencyZero } from '@/lib/perdcompUtils';
import {
  applySelicCorrection,
  isWithinGracePeriod,
  isWithinGracePeriodAt,
} from '@/lib/selicCalculator';

type PerRow = Database['public']['Tables']['per']['Row'];
type DcompRow = Database['public']['Tables']['dcomp']['Row'];
type PerSituacaoRow = Database['public']['Tables']['per_situacao']['Row'];
type DistribuicaoRow = Database['public']['Tables']['distribuicao_dcomp']['Row'];

export type PerdcompDetailPer = PerRow & {
  contribuinte?: { nome_razao_social: string } | null;
};
export type PerdcompDetailDcomp = DcompRow;
export type PerdcompDetailSituacao = PerSituacaoRow;
export type PerdcompDetailDistribuicao = Pick<
  DistribuicaoRow,
  'nr_documento' | 'tributo' | 'valor_tributo' | 'valor_original' | 'competencia'
>;

export interface PerdcompDetailDcompDisplay {
  dcomp: PerdcompDetailDcomp;
  valorExibido: number;
  tributoExibido: string;
  tributosTodos?: Array<{ tributo: string; valor: number }>;
}

export function findOriginalDcomp(nrDocumento: string, allDcomps: PerdcompDetailDcomp[]): string {
  const byDoc = new Map(allDcomps.map((dcomp) => [dcomp.nr_documento, dcomp]));
  let current = byDoc.get(nrDocumento);
  const visited = new Set<string>();

  while (current?.nr_dcomp_ret && !visited.has(current.nr_documento)) {
    visited.add(current.nr_documento);
    const previous = byDoc.get(current.nr_dcomp_ret);
    if (!previous) break;
    current = previous;
  }

  return current?.nr_documento || nrDocumento;
}

export function getCurrentDcomps(dcomps: PerdcompDetailDcomp[]): PerdcompDetailDcomp[] {
  const rectified = new Set(
    dcomps.flatMap((dcomp) => (dcomp.nr_dcomp_ret ? [dcomp.nr_dcomp_ret] : [])),
  );
  return dcomps.filter((dcomp) => !rectified.has(dcomp.nr_documento));
}

export function getAvailableTributes(distributions: PerdcompDetailDistribuicao[]): string[] {
  return Array.from(
    new Set(distributions.flatMap((row) => (row.tributo ? [row.tributo] : []))),
  ).sort();
}

export function aggregateTributesByDcomp(
  distributions: PerdcompDetailDistribuicao[],
): Record<string, Record<string, number>> {
  const values: Record<string, Record<string, number>> = {};
  for (const row of distributions) {
    values[row.nr_documento] ??= {};
    values[row.nr_documento][row.tributo] =
      (values[row.nr_documento][row.tributo] || 0) + Number(row.valor_tributo || 0);
  }
  return values;
}

export function getDisplayedDcomps(
  currentDcomps: PerdcompDetailDcomp[],
  tributeFilter: string,
  valuesByDcompTribute: Record<string, Record<string, number>>,
): PerdcompDetailDcompDisplay[] {
  if (tributeFilter === '__todos__') {
    return currentDcomps.map((dcomp) => {
      const entries = Object.entries(valuesByDcompTribute[dcomp.nr_documento] || {}).filter(
        ([tribute]) => !!tribute,
      );
      let tributoExibido = '—';
      let tributosTodos: Array<{ tributo: string; valor: number }> | undefined;
      if (entries.length === 1) {
        tributoExibido = entries[0][0];
      } else if (entries.length > 1) {
        tributosTodos = entries
          .map(([tributo, valor]) => ({ tributo, valor: Number(valor) || 0 }))
          .sort((a, b) => b.valor - a.valor);
        tributoExibido = `${tributosTodos[0].tributo}...`;
      }
      return {
        dcomp,
        valorExibido: dcomp.vlr_compensado || 0,
        tributoExibido,
        tributosTodos,
      };
    });
  }

  return currentDcomps
    .filter((dcomp) =>
      Object.prototype.hasOwnProperty.call(
        valuesByDcompTribute[dcomp.nr_documento] || {},
        tributeFilter,
      ),
    )
    .map((dcomp) => ({
      dcomp,
      valorExibido: valuesByDcompTribute[dcomp.nr_documento]?.[tributeFilter] || 0,
      tributoExibido: tributeFilter,
      tributosTodos: undefined,
    }));
}

export function calculateRemainingBalance(
  per: Pick<PerdcompDetailPer, 'vlr_credito' | 'vlr_ressarcido_original'> | null,
  distributions: PerdcompDetailDistribuicao[],
  currentDocumentNumbers: string[],
  reimbursedValue: number,
): number {
  if (!per) return 0;
  const currentDocuments = new Set(currentDocumentNumbers);
  const compensatedOriginal = distributions
    .filter((row) => currentDocuments.has(row.nr_documento))
    .reduce((sum, row) => sum + Number(row.valor_original ?? row.valor_tributo ?? 0), 0);
  const reimbursedBase = per.vlr_ressarcido_original ?? reimbursedValue;
  return normalizeCurrencyZero(
    Math.round((per.vlr_credito - compensatedOriginal - reimbursedBase) * 100) / 100,
  );
}

export function parseCurrencyInput(value: string): number {
  const digits = value.replace(/\D/g, '');
  return parseInt(digits || '0', 10) / 100;
}

export function calculateCurrentSelic(
  requestedAt: string | undefined,
  balance: number,
  factor: number | undefined,
): { emCarencia: boolean; value: { valor: number; fator: number } | null } {
  const emCarencia = requestedAt ? isWithinGracePeriod(requestedAt) : true;
  if (emCarencia || factor == null) return { emCarencia, value: null };
  const { valorCorrigido, fator } = applySelicCorrection(balance, factor);
  return { emCarencia, value: { valor: valorCorrigido - balance, fator } };
}

export function calculateReimbursementValues(
  requestedAt: string | undefined,
  paymentDate: string,
  correctedValue: number,
  factor: number | undefined,
): { emCarencia: boolean; fator: number; valorOriginal: number } {
  const emCarencia =
    !!requestedAt && !!paymentDate ? isWithinGracePeriodAt(requestedAt, paymentDate) : true;
  const fator =
    !paymentDate || !requestedAt || emCarencia || factor == null ? 0 : Math.max(0, factor);
  return {
    emCarencia,
    fator,
    valorOriginal: fator <= 0 ? correctedValue : correctedValue / (1 + fator),
  };
}
