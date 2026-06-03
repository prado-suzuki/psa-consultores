// Helpers puros usados pelos documentos PDF (formatadores, cálculos de etapa,
// headline). Sem JSX — podem ser importados de qualquer lugar.

import type {
  Etapa, Responsavel, ResponsavelEtapa, DocRef,
} from '@/types';
import { PDF_STRINGS } from '@/utils/pdfStrings';

// ────────── formatadores ──────────

export function fmtMoney(n: number): string {
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtPercent(t: number): string {
  return `${(t * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;
}

export function todayBR(): string {
  return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function docName(d: DocRef | string): string {
  return typeof d === 'string' ? d : d.nome;
}

/** Junção plana (sem HTML) para uso dentro de <Text> do react-pdf. */
export function joinDocs(arr: (DocRef | string)[] | undefined): string {
  if (!arr || arr.length === 0) return '—';
  return arr.map(d => docName(d)).join(' · ');
}

export function joinPeople(arr: ResponsavelEtapa[] | undefined): string {
  if (!arr || arr.length === 0) return '—';
  return arr
    .map(r => `${r.nome ?? ''}${r.horas ? ` (${r.horas.toLocaleString('pt-BR')}h)` : ''}`)
    .join(' · ');
}

// ────────── cálculos de etapa (etapa "era" vs "ficou") ──────────

/** Detecta etapa "eliminada" (todos os campos do ficou explicitamente vazios). */
export function isEtapaEliminada(e: Etapa): boolean {
  const f = e.ficou;
  if (!f) return false;
  const semExec = !(f.executadoPor && f.executadoPor.length);
  const semDescr = !(f.descricao && f.descricao.trim());
  const semHoras = (f.executadoPor || []).every(r => !r.horas);
  return semExec && semDescr && semHoras;
}

export interface CalcEtapaResult {
  horas: number;
  custo: number;
  taxaRetrab: number;
}

export function calcEtapa(
  e: Etapa,
  ficou: boolean,
  respById: Map<string, Responsavel>,
  custoMedio: number,
): CalcEtapaResult {
  const f = ficou ? e.ficou : null;
  const exec = (ficou ? (f?.executadoPor ?? e.executadoPor) : e.executadoPor) || [];
  const vol = (ficou ? (f?.volumePorProcesso ?? e.volumePorProcesso) : e.volumePorProcesso) || 1;
  let horas = 0, custoBase = 0;
  for (const r of exec) {
    const ch = (r.responsavelId ? respById.get(r.responsavelId)?.custoHora : undefined) ?? custoMedio;
    const h = r.horas ?? 0;
    horas += h;
    custoBase += h * ch;
  }
  const custo = custoBase * vol;
  const taxaRetrab = (ficou ? (f?.taxaRetrabalho ?? e.taxaRetrabalho) : e.taxaRetrabalho) ?? 0;
  return { horas, custo, taxaRetrab };
}

// ────────── headline (sumário executivo) ──────────

export function generateHeadline(args: {
  processoNome: string;
  roiPct: number;
  paybackMeses: number;
}): string {
  const { processoNome, roiPct, paybackMeses } = args;
  const roiStr = `${roiPct.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;
  const paybackStr = paybackMeses > 0
    ? `${paybackMeses.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} meses`
    : '—';

  if (paybackMeses <= 0) {
    return PDF_STRINGS.exec.headlineSemPayback(processoNome);
  }
  if (paybackMeses <= 6 && roiPct >= 500) {
    return PDF_STRINGS.exec.headlineExcepcional(processoNome, roiStr, paybackStr);
  }
  if (paybackMeses <= 12 && roiPct >= 100) {
    return PDF_STRINGS.exec.headlineSolido(processoNome, roiStr);
  }
  return PDF_STRINGS.exec.headlineQualitativo(processoNome, paybackStr);
}
