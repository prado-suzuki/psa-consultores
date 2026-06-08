// Derivação de Cascata por Etapa-origem — calculada em tempo real (sem
// persistência). Dado N etapas-origem (vindas de gargalo.etapasOrigem),
// faz BFS jusante pelo grafo:
//
//   etapa-origem (incluída no grafo) → docs_saida dessa etapa →
//   etapas que CONSOMEM esses docs → docs_saida delas →
//   etapas consumidoras → ... (até esgotar)
//
// Resultado vem com duas classificações:
//   • granular: lista plana de etapas afetadas (incluindo origens)
//   • macro: processos únicos com intensidade Total/Parcial baseada em
//     etapas_afetadas / etapas_totais do processo
//
// Comparação canônica de documentos via canon() — reusa cascataEngine.

import type { Documento, Etapa, Processo } from '@/types';
import { canon } from '@/utils/cascataEngine';

export type IntensidadeProcesso = 'TOTAL' | 'PARCIAL';

export interface ProcessoAfetado {
  processId: string;
  etapasAfetadas: string[];       // ids
  etapasTotais: number;
  intensidade: IntensidadeProcesso;
  razao: number;                   // afetadas / totais
}

export interface DerivacaoCascata {
  /** IDs de etapas afetadas (inclui origens), ordem da BFS. */
  stageIds: string[];
  /** IDs de etapas-origem (seeds), preservados para destacar na UI. */
  origemStageIds: string[];
  /** Processos afetados com intensidade Total/Parcial. */
  processos: ProcessoAfetado[];
  /** Documentos visitados pela BFS (canon → primeiro docId encontrado). */
  documentoIds: string[];
  /** Arestas para renderização do grafo. */
  edges: CascataEdge[];
  /** Profundidade máxima alcançada pela BFS (0 = só etapas-origem). */
  profundidadeMax: number;
}

export interface CascataEdge {
  from: { kind: 'doc' | 'stage'; id: string };
  to:   { kind: 'doc' | 'stage'; id: string };
  depth: number;
}

interface DerivarOpts {
  /** Limiar de "Total" vs "Parcial" para classificar processo (default 0.6). */
  thresholdTotal?: number;
}

interface EtapaIndexada {
  etapa: Etapa;
  entradaCanon: Set<string>;
  saidaCanon: Set<string>;
}

function canonDocId(docId: string, docsById: Map<string, Documento>): string {
  const d = docsById.get(docId);
  if (!d) return '';
  type DocComCanonico = Documento & { canonicoId?: string | null; canonico_id?: string | null };
  const dc = d as DocComCanonico;
  const canonicoId = dc.canonicoId ?? dc.canonico_id;
  // Identidade EXATA por documento_id (ou canonico_id de agrupamento). Evita
  // falsos positivos entre documentos homônimos. Como etapa_documentos sempre
  // grava documento_id, ambos os lados (saída/entrada) resolvem por id aqui.
  // Fallback para nome canônico só em referências livres sem id (raro).
  if (canonicoId && docsById.has(canonicoId)) return `doc:${canonicoId}`;
  return `doc:${docId}`;
}

/**
 * BFS jusante a partir de N etapas-origem.
 *
 * Algoritmo:
 *   1. Etapas-origem entram em visitedStages e contribuem com docs_saida
 *      como seeds iniciais.
 *   2. Loop BFS por camadas:
 *      - Para cada doc da camada atual: acha etapas onde doc ∈ entrada
 *        (excluindo as já visitadas).
 *      - Para cada etapa nova: marca como afetada, coleta seus docs de
 *        saída, enfileira os ainda não visitados.
 *   3. Classifica cada processo como TOTAL ou PARCIAL pela razão
 *      etapas_afetadas / etapas_totais.
 */
export function derivarCascataPorEtapas(
  seedEtapaIds: string[],
  todasEtapas: Etapa[],
  todosDocumentos: Documento[],
  todosProcessos: Processo[],
  opts: DerivarOpts = {},
): DerivacaoCascata {
  const thresholdTotal = opts.thresholdTotal ?? 0.6;

  const docsById = new Map(todosDocumentos.map((d) => [d.id, d]));
  const etapaById = new Map(todasEtapas.map((e) => [e.id, e]));

  // Pré-calcula canon de entrada/saída por etapa
  const etapasIndex: EtapaIndexada[] = todasEtapas.map((e) => {
    const entradaCanon = new Set<string>();
    const saidaCanon = new Set<string>();
    for (const de of e.docsEntrada ?? []) {
      if (de.documentoId) entradaCanon.add(canonDocId(de.documentoId, docsById));
      else if (de.nome)    entradaCanon.add(canon(de.nome));
    }
    for (const ds of e.docsSaida ?? []) {
      if (ds.documentoId) saidaCanon.add(canonDocId(ds.documentoId, docsById));
      else if (ds.nome)    saidaCanon.add(canon(ds.nome));
    }
    entradaCanon.delete('');
    saidaCanon.delete('');
    return { etapa: e, entradaCanon, saidaCanon };
  });
  const indexByEtapaId = new Map(etapasIndex.map((ei) => [ei.etapa.id, ei]));

  const canonToDocId = new Map<string, string>();
  for (const d of todosDocumentos) {
    const c = canonDocId(d.id, docsById);
    if (c && !canonToDocId.has(c)) canonToDocId.set(c, d.id);
  }

  // ─── Inicialização: etapas-origem entram + seedam docs ──────────────
  const validSeedEtapaIds = seedEtapaIds.filter((id) => etapaById.has(id));
  if (validSeedEtapaIds.length === 0) {
    return {
      stageIds: [], origemStageIds: [], processos: [],
      documentoIds: [], edges: [], profundidadeMax: 0,
    };
  }

  const visitedStages = new Set<string>();
  const orderedStages: string[] = [];
  const visitedDocs = new Set<string>(); // canons
  const orderedDocs: string[] = [];
  const edges: CascataEdge[] = [];

  let seedDocsCanons: string[] = [];

  for (const eid of validSeedEtapaIds) {
    visitedStages.add(eid);
    orderedStages.push(eid);

    const ei = indexByEtapaId.get(eid);
    if (!ei) continue;

    for (const outCanon of ei.saidaCanon) {
      const outDocId = canonToDocId.get(outCanon);
      if (outDocId) {
        edges.push({
          from: { kind: 'stage', id: eid },
          to:   { kind: 'doc',   id: outDocId },
          depth: 1,
        });
      }
      if (!visitedDocs.has(outCanon)) {
        visitedDocs.add(outCanon);
        if (outDocId) orderedDocs.push(outDocId);
        seedDocsCanons.push(outCanon);
      }
    }
  }

  // ─── BFS por camadas (a partir de seedDocsCanons) ─────────────────
  let layer: string[] = seedDocsCanons;
  let depth = 1; // camada 1 já populada acima
  let profundidadeMax = 1;

  while (layer.length > 0) {
    const nextLayer: string[] = [];

    for (const docCanon of layer) {
      const docId = canonToDocId.get(docCanon);
      const consumidoras = etapasIndex.filter((ei) => ei.entradaCanon.has(docCanon));

      for (const ei of consumidoras) {
        const stageId = ei.etapa.id;
        if (visitedStages.has(stageId)) continue;

        // Aresta doc → stage
        if (docId) {
          edges.push({
            from: { kind: 'doc',   id: docId },
            to:   { kind: 'stage', id: stageId },
            depth,
          });
        }

        visitedStages.add(stageId);
        orderedStages.push(stageId);
        profundidadeMax = Math.max(profundidadeMax, depth + 1);

        // Adiciona saídas dessa etapa à próxima camada
        for (const outCanon of ei.saidaCanon) {
          const outDocId = canonToDocId.get(outCanon);
          if (outDocId) {
            edges.push({
              from: { kind: 'stage', id: stageId },
              to:   { kind: 'doc',   id: outDocId },
              depth: depth + 1,
            });
          }
          if (!visitedDocs.has(outCanon)) {
            visitedDocs.add(outCanon);
            if (outDocId) orderedDocs.push(outDocId);
            nextLayer.push(outCanon);
          }
        }
      }
    }

    layer = nextLayer;
    depth += 1;
  }

  // ─── Agrupa por processo + classifica TOTAL/PARCIAL ───────────────
  const etapasPorProcesso = new Map<string, Etapa[]>();
  for (const e of todasEtapas) {
    const arr = etapasPorProcesso.get(e.process_id) ?? [];
    arr.push(e);
    etapasPorProcesso.set(e.process_id, arr);
  }

  const procsAfetadosMap = new Map<string, string[]>();
  for (const sid of orderedStages) {
    const e = etapaById.get(sid);
    if (!e) continue;
    const arr = procsAfetadosMap.get(e.process_id) ?? [];
    arr.push(sid);
    procsAfetadosMap.set(e.process_id, arr);
  }

  const processos: ProcessoAfetado[] = [];
  for (const [pid, etapasAfetadas] of procsAfetadosMap.entries()) {
    const etapasTotaisP = etapasPorProcesso.get(pid)?.length ?? etapasAfetadas.length;
    const razao = etapasTotaisP > 0 ? etapasAfetadas.length / etapasTotaisP : 0;
    processos.push({
      processId: pid,
      etapasAfetadas,
      etapasTotais: etapasTotaisP,
      intensidade: razao >= thresholdTotal ? 'TOTAL' : 'PARCIAL',
      razao,
    });
  }
  void todosProcessos; // pode ser usado depois para ordenação

  return {
    stageIds: orderedStages,
    origemStageIds: validSeedEtapaIds,
    processos,
    documentoIds: orderedDocs,
    edges,
    profundidadeMax,
  };
}
