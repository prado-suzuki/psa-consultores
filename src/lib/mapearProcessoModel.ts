import type { DocRef, Etapa, ResponsavelEtapa } from '@/types';
import { cleanEtapaName } from '@/utils/etapaEditor';
import { resolveSistemaId, resolveVinculoId } from '@/utils/etapaVinculosResolve';

export type MapearScenario = 'era' | 'ficou';

export interface EtapasDraft {
  mode: MapearScenario;
  list: Etapa[];
  removed: string[];
  activeIndex: number;
  ts: number;
}

export const ordenarEtapas = (a: Etapa, b: Etapa) =>
  (a.stage_order ?? 0) - (b.stage_order ?? 0);

export function melhoriaLabel(descricao: string): string {
  const separador = descricao.indexOf(' — ');
  if (separador > 0) return descricao.slice(0, separador).trim();
  return descricao.length > 50 ? `${descricao.slice(0, 50)}…` : descricao;
}

export const draftKey = (processoId: string | undefined, mode: MapearScenario) =>
  `mapa.etapasDraft.${processoId}.${mode}`;

export const cleanEtapa = (etapa: Etapa): Etapa => ({
  ...etapa,
  docsEntrada: (etapa.docsEntrada || []).filter(item => item.nome?.trim() || item.documentoId),
  docsSaida: (etapa.docsSaida || []).filter(item => item.nome?.trim() || item.documentoId),
  executadoPor: (etapa.executadoPor || []).filter(item => item.nome?.trim() || item.responsavelId),
  sistemas: (etapa.sistemas || []).filter(item => item?.trim()),
});

export function prepararEtapas(etapas: Etapa[], mode: MapearScenario): Etapa[] {
  const snapshots = etapas.map(etapa => cleanEtapa({ ...etapa, name: cleanEtapaName(etapa.name) }));
  if (mode === 'era') return snapshots;
  return snapshots.map(etapa => {
    const ficou = etapa.ficou;
    return {
      ...etapa,
      description: ficou?.description ?? etapa.description,
      execution: ficou?.execution ?? etapa.execution,
      lead_time_days: ficou?.lead_time_days ?? etapa.lead_time_days,
      volume_per_process: ficou?.volume_per_process ?? etapa.volume_per_process,
      error_rate: ficou?.error_rate ?? etapa.error_rate,
      rework_rate: ficou?.rework_rate ?? etapa.rework_rate ?? 0,
      error_cost: ficou?.error_cost ?? etapa.error_cost,
      error_volume: ficou?.error_volume ?? etapa.error_volume,
      executadoPor: ficou?.executadoPor ?? etapa.executadoPor,
      sistemas: ficou?.sistemas ?? etapa.sistemas,
      docsEntrada: ficou?.docsEntrada ?? etapa.docsEntrada,
      docsSaida: ficou?.docsSaida ?? etapa.docsSaida,
    };
  });
}

export function criarEtapaVazia(processId: string): Etapa {
  return {
    id: `etp-novo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    process_id: processId,
    name: '',
    description: '',
    execution: 'manual',
    docsEntrada: [],
    docsSaida: [],
    executadoPor: [],
    volumeMensal: 0,
    sistemas: [],
    rework_rate: 0,
  } as Etapa;
}

export interface VinculoMaps {
  docIdByNome: Map<string, string>;
  docById: Map<string, string>;
  respIdByNome: Map<string, string>;
  respById: Map<string, string>;
  sisCandidatosPorNome: Map<string, { id: string; cluster_id?: string | null }[]>;
  procClusterId: string | null;
}

export const resolverVinculos = (etapa: Etapa, maps: VinculoMaps): Etapa => ({
  ...etapa,
  docsEntrada: (etapa.docsEntrada || []).map(item => ({
    ...item,
    documentoId: resolveVinculoId(item.nome, item.documentoId, maps.docIdByNome, maps.docById),
  })),
  docsSaida: (etapa.docsSaida || []).map(item => ({
    ...item,
    documentoId: resolveVinculoId(item.nome, item.documentoId, maps.docIdByNome, maps.docById),
  })),
  executadoPor: (etapa.executadoPor || []).map(item => ({
    ...item,
    responsavelId: resolveVinculoId(item.nome, item.responsavelId, maps.respIdByNome, maps.respById),
  })),
  sistemas: (etapa.sistemas || []).map(nome =>
    resolveSistemaId(nome, maps.sisCandidatosPorNome, maps.procClusterId)),
});

export const sumHorasEtapa = (etapa: Etapa, ficou = false): number => {
  const somar = (itens?: ResponsavelEtapa[]) =>
    (itens || []).reduce((total, item) => total + (item.horas || 0), 0);
  return somar(ficou ? (etapa.ficou?.executadoPor ?? etapa.executadoPor) : etapa.executadoPor);
};

export type VinculoValue = DocRef | ResponsavelEtapa | string;
