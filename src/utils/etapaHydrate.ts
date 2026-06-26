// Hidratação PURA de process_stages → Etapa (sem supabase, sem react-query).
// Extraída de useEtapas.ts para ser reutilizável pelo script de extração (node/bun),
// que busca as mesmas rows via PostgREST com os mesmos embeds.
//
// Cruza AS-IS e TO-BE por `id`: a row AS-IS vira a Etapa principal e a TO-BE
// (mesmo id, scenario='TO-BE') vai para `etapa.ficou`.

import type { Etapa, EtapaFicou, DocRef, ResponsavelEtapa } from '@/types';

export type EtapaDbRow = Record<string, unknown> & {
  scenario?: string;
  etapa_documentos?: Array<{ documento_id: string; sentido: string; volume: number | null }> | null;
  etapa_sistemas?: Array<{ sistema_id: string; rateio: number | null }> | null;
  etapa_responsaveis?: Array<{ responsavel_id: string; papel: string; horas: number | null }> | null;
  gargalo_etapas?: Array<{ gargalo_id: string }> | null;
};

function splitDocs(row: EtapaDbRow): { docsEntrada: DocRef[]; docsSaida: DocRef[] } {
  const docs = row.etapa_documentos ?? [];
  const docsEntrada: DocRef[] = [];
  const docsSaida: DocRef[] = [];
  for (const d of docs) {
    const ref: DocRef = { documentoId: d.documento_id, nome: '', volume: d.volume ?? 0 };
    if (d.sentido === 'saida' || d.sentido === 'saída') docsSaida.push(ref);
    else docsEntrada.push(ref);
  }
  return { docsEntrada, docsSaida };
}

function hydrateExec(row: EtapaDbRow): ResponsavelEtapa[] {
  return (row.etapa_responsaveis ?? []).map((r) => ({ responsavelId: r.responsavel_id, nome: '', horas: r.horas ?? 0 }));
}

function hydrateSistemas(row: EtapaDbRow): string[] {
  return (row.etapa_sistemas ?? []).map((s) => s.sistema_id);
}

export function hydrateEtapa(row: EtapaDbRow): Etapa {
  const { docsEntrada, docsSaida } = splitDocs(row);
  const { etapa_documentos: _ed, etapa_sistemas: _es, etapa_responsaveis: _er, gargalo_etapas: _eg, ...clean } = row;
  void _ed; void _es; void _er; void _eg;
  return {
    ...(clean as unknown as Etapa),
    docsEntrada,
    docsSaida,
    executadoPor: hydrateExec(row),
    sistemas: hydrateSistemas(row),
    gargalos: (row.gargalo_etapas ?? []).map((g) => g.gargalo_id),
    volumeMensal: 0,
  };
}

function hydrateFicou(row: EtapaDbRow): EtapaFicou {
  const { docsEntrada, docsSaida } = splitDocs(row);
  const r = row as unknown as Etapa;
  return {
    description: r.description ?? null,
    execution: r.execution,
    lead_time_days: r.lead_time_days ?? null,
    volume_per_process: r.volume_per_process ?? null,
    error_rate: r.error_rate ?? null,
    rework_rate: r.rework_rate ?? null,
    error_cost: r.error_cost ?? null,
    error_volume: r.error_volume ?? null,
    executadoPor: hydrateExec(row),
    sistemas: hydrateSistemas(row),
    docsEntrada,
    docsSaida,
  };
}

/**
 * Recebe rows de AMBOS scenarios (AS-IS e TO-BE) e cruza por id.
 * Retorna só os AS-IS, com `ficou` populado quando há row TO-BE de mesmo id.
 */
export function buildEtapasComFicou(rows: EtapaDbRow[]): Etapa[] {
  const ficouById = new Map<string, EtapaFicou>();
  for (const r of rows) {
    if (r.scenario === 'TO-BE' && typeof r.id === 'string') ficouById.set(r.id, hydrateFicou(r));
  }
  const asis = rows.filter(r => r.scenario === 'AS-IS').map(hydrateEtapa);
  for (const e of asis) {
    const f = ficouById.get(e.id);
    if (f) e.ficou = f;
  }
  return asis;
}
