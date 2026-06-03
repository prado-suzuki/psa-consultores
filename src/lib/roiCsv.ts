// Geração e download de CSV agregado de ROI. Função pura: recebe os dados
// (já carregados pelas hooks) e devolve/dispara o blob — não fala com
// Supabase nem com o Express. Por isso vive em `src/lib/`.

import type { Projeto, Processo, ProcessSnapshot } from '@/types';

export interface RoiCsvInput {
  projetos: Projeto[];
  processos: Processo[];
  snapshotsLatest: ProcessSnapshot[];
  projetoId?: string;
}

export function buildRoiCsv({ projetos, processos, snapshotsLatest, projetoId }: RoiCsvInput): string {
  const projetoById = new Map(projetos.map(p => [p.id, p]));
  const linhasProcessos = projetoId
    ? processos.filter(p => p.projetoId === projetoId)
    : processos;
  const snapByProc = new Map(snapshotsLatest.map(s => [s.processoId, s]));

  const sep = ';';
  const header = [
    'projeto_id', 'projeto', 'processo_id', 'processo',
    'custo_anual', 'horas_anual', 'economia_anual',
    'roi_percentual', 'payback_meses', 'horas_liberadas', 'investimento',
    'snapshot_em',
  ].join(sep);

  const linhas: string[] = [header];
  for (const proc of linhasProcessos) {
    const s = snapByProc.get(proc.id);
    const projetoNome = proc.projetoId ? (projetoById.get(proc.projetoId)?.nome ?? '') : '';
    linhas.push([
      proc.projetoId ?? '',
      escapeCsv(projetoNome),
      proc.id,
      escapeCsv(proc.nome ?? ''),
      s?.custoAnual     ?? 0,
      s?.horasAnual     ?? 0,
      s?.economiaAnual  ?? 0,
      s?.roiPercentual  ?? 0,
      s?.paybackMeses   ?? 0,
      s?.horasLiberadas ?? 0,
      s?.investimento   ?? 0,
      s?.snapshotEm     ?? '',
    ].join(sep));
  }

  return linhas.join('\n');
}

export function triggerCsvDownload(content: string, filename: string): void {
  // BOM UTF-8 para Excel reconhecer acentuação.
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeCsv(s: string): string {
  if (s == null) return '';
  const needs = /[;\n"]/.test(s);
  const esc = s.replace(/"/g, '""');
  return needs ? `"${esc}"` : esc;
}
