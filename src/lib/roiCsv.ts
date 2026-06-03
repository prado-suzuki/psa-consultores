// Geração e download de CSV agregado de ROI. Função pura: recebe os dados
// (já carregados pelas hooks) e devolve/dispara o blob — não fala com
// Supabase nem com o Express. Por isso vive em `src/lib/`.

import type { Projeto, Processo, ProcessSnapshot } from '@/types';

export interface RoiCsvInput {
  projetos: Projeto[];
  processos: Processo[];
  snapshotsLatest: ProcessSnapshot[];
  project_id?: string;
}

export function buildRoiCsv({ projetos, processos, snapshotsLatest, project_id }: RoiCsvInput): string {
  const projetoById = new Map(projetos.map(p => [p.id, p]));
  const linhasProcessos = project_id
    ? processos.filter(p => p.project_id === project_id)
    : processos;
  const snapByProc = new Map(snapshotsLatest.map(s => [s.process_id, s]));

  const sep = ';';
  const header = [
    'projeto_id', 'projeto', 'processo_id', 'processo',
    'custo_anual', 'horas_anual', 'economia_anual',
    'roi_percentual', 'payback_meses', 'horas_liberadas', 'investment',
    'snapshot_em',
  ].join(sep);

  const linhas: string[] = [header];
  for (const proc of linhasProcessos) {
    const s = snapByProc.get(proc.id);
    const projetoNome = proc.project_id ? (projetoById.get(proc.project_id)?.name ?? '') : '';
    linhas.push([
      proc.project_id ?? '',
      escapeCsv(projetoNome),
      proc.id,
      escapeCsv(proc.name ?? ''),
      s?.annual_cost     ?? 0,
      s?.annual_hours     ?? 0,
      s?.annual_savings  ?? 0,
      s?.roi_percent  ?? 0,
      s?.payback_months   ?? 0,
      s?.hours_freed ?? 0,
      s?.investment   ?? 0,
      s?.snapshot_at     ?? '',
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
