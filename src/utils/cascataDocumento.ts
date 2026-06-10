// Derivação de Cascata por Etapa-origem — invalidação documental calculada
// em tempo real (sem persistência). Dado N etapas-origem (vindas de
// gargalo.etapasOrigem), propaga pelo grafo:
//
//   etapa afetada → invalida seus docs de saída E os docs produzidos pelas
//   etapas SEGUINTES do mesmo processo (o processo re-executa daquele ponto
//   em diante para regenerar suas entregas) → etapas de outros processos que
//   CONSOMEM esses docs invalidados → ... (até esgotar)
//
// Cada etapa afetada carrega um motivo:
//   • origem     — apontada pelo gargalo (gargalo_etapas)
//   • documento  — consome um documento invalidado rio acima
//   • sequencial — vem depois de uma etapa afetada no mesmo processo
//                  (re-executa para regenerar os documentos a jusante)
//
// Resultado vem com duas classificações:
//   • granular: etapas afetadas com motivo/via/profundidade (detalhes)
//   • macro: processos únicos com intensidade Total/Parcial baseada em
//     etapas_afetadas / etapas_totais do processo
//
// Comparação canônica de documentos via canon() — reusa cascataEngine.

import type { Documento, Etapa, Processo } from '@/types';
import { canon } from '@/utils/cascataEngine';

export type IntensidadeProcesso = 'TOTAL' | 'PARCIAL';

export type MotivoEtapa = 'origem' | 'documento' | 'sequencial';

export interface EtapaAfetadaDetalhe {
  motivo: MotivoEtapa;
  /** Onda BFS da etapa (0 = etapa-origem). */
  depth: number;
  /** Documento invalidado que a etapa consome (motivo 'documento'). */
  viaDocumentoId?: string;
  /** Etapa afetada anterior do mesmo processo (motivo 'sequencial'). */
  viaEtapaId?: string;
}

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
  /** Motivo/via/profundidade por etapa afetada. */
  detalhes: Record<string, EtapaAfetadaDetalhe>;
  /** Processos afetados com intensidade Total/Parcial. */
  processos: ProcessoAfetado[];
  /** Documentos invalidados pela BFS (canon → primeiro docId encontrado). */
  documentoIds: string[];
  /** Arestas para renderização do grafo. */
  edges: CascataEdge[];
  /** Profundidade máxima alcançada pela BFS (1 = só etapas-origem). */
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
 * BFS de invalidação documental a partir de N etapas-origem.
 *
 * Algoritmo:
 *   1. Cada etapa-origem é "contaminada": entra como afetada, invalida seus
 *      docs de saída e contamina as etapas seguintes do mesmo processo
 *      (motivo 'sequencial'), cujos docs de saída também são invalidados —
 *      o processo precisa re-executar daquele ponto para regenerar entregas.
 *   2. Loop BFS por documentos invalidados: cada etapa (de qualquer
 *      processo) que CONSOME um doc invalidado é contaminada com motivo
 *      'documento' (repetindo o passo 1 nela).
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

  // Etapas de cada processo ordenadas por stage_order (re-execução a jusante)
  const etapasPorProcesso = new Map<string, Etapa[]>();
  for (const e of todasEtapas) {
    const arr = etapasPorProcesso.get(e.process_id) ?? [];
    arr.push(e);
    etapasPorProcesso.set(e.process_id, arr);
  }
  for (const arr of etapasPorProcesso.values()) {
    arr.sort((a, b) => (a.stage_order ?? 0) - (b.stage_order ?? 0));
  }

  // ─── Inicialização ──────────────────────────────────────────────────
  const validSeedEtapaIds = seedEtapaIds.filter((id) => etapaById.has(id));
  if (validSeedEtapaIds.length === 0) {
    return {
      stageIds: [], origemStageIds: [], detalhes: {}, processos: [],
      documentoIds: [], edges: [], profundidadeMax: 0,
    };
  }

  const detalhes: Record<string, EtapaAfetadaDetalhe> = {};
  const orderedStages: string[] = [];
  const visitedDocs = new Set<string>();   // canons
  const orderedDocs: string[] = [];
  const edges: CascataEdge[] = [];
  const docConsumoVisto = new Set<string>(); // `${canon}→${etapaId}` (dedupe de arestas)
  const docQueue: Array<{ canon: string; depth: number }> = [];

  /** Invalida os docs de saída da etapa, enfileirando os inéditos. */
  const invalidarSaidas = (etapaId: string, depth: number) => {
    const ei = indexByEtapaId.get(etapaId);
    if (!ei) return;
    for (const outCanon of ei.saidaCanon) {
      const outDocId = canonToDocId.get(outCanon);
      if (outDocId) {
        edges.push({
          from: { kind: 'stage', id: etapaId },
          to:   { kind: 'doc',   id: outDocId },
          depth,
        });
      }
      if (!visitedDocs.has(outCanon)) {
        visitedDocs.add(outCanon);
        if (outDocId) orderedDocs.push(outDocId);
        docQueue.push({ canon: outCanon, depth });
      }
    }
  };

  /** Marca a etapa como afetada e re-executa o processo dela rio abaixo. */
  const contaminar = (
    etapaId: string,
    motivo: MotivoEtapa,
    depth: number,
    via?: { documentoId?: string; etapaId?: string },
  ) => {
    const existente = detalhes[etapaId];
    if (existente) {
      // Upgrade de metadado: etapa que entrou "de carona" sequencial e depois
      // se mostra consumidora direta de doc invalidado.
      if (existente.motivo === 'sequencial' && motivo === 'documento') {
        existente.motivo = 'documento';
        existente.viaDocumentoId = via?.documentoId;
        delete existente.viaEtapaId;
      }
      return;
    }
    detalhes[etapaId] = {
      motivo,
      depth,
      ...(via?.documentoId ? { viaDocumentoId: via.documentoId } : {}),
      ...(via?.etapaId ? { viaEtapaId: via.etapaId } : {}),
    };
    orderedStages.push(etapaId);
    invalidarSaidas(etapaId, depth + 1);

    const e = etapaById.get(etapaId);
    if (!e) return;
    for (const seq of etapasPorProcesso.get(e.process_id) ?? []) {
      if ((seq.stage_order ?? 0) <= (e.stage_order ?? 0) || detalhes[seq.id]) continue;
      detalhes[seq.id] = { motivo: 'sequencial', depth, viaEtapaId: etapaId };
      orderedStages.push(seq.id);
      edges.push({
        from: { kind: 'stage', id: etapaId },
        to:   { kind: 'stage', id: seq.id },
        depth,
      });
      invalidarSaidas(seq.id, depth + 1);
    }
  };

  for (const eid of validSeedEtapaIds) contaminar(eid, 'origem', 0);

  // ─── BFS por documentos invalidados ─────────────────────────────────
  while (docQueue.length > 0) {
    const { canon: docCanon, depth } = docQueue.shift()!;
    const docId = canonToDocId.get(docCanon);
    for (const ei of etapasIndex) {
      if (!ei.entradaCanon.has(docCanon)) continue;
      const stageId = ei.etapa.id;
      // Aresta doc → stage (mesmo se a etapa já foi visitada por outra via:
      // o fluxo documental entre processos continua real e vai para o grafo)
      if (docId && stageId !== undefined) {
        const key = `${docCanon}→${stageId}`;
        if (!docConsumoVisto.has(key)) {
          docConsumoVisto.add(key);
          edges.push({
            from: { kind: 'doc',   id: docId },
            to:   { kind: 'stage', id: stageId },
            depth,
          });
        }
      }
      contaminar(stageId, 'documento', depth, { documentoId: docId });
    }
  }

  // ─── Agrupa por processo + classifica TOTAL/PARCIAL ───────────────
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

  const profundidadeMax =
    orderedStages.reduce((m, sid) => Math.max(m, detalhes[sid].depth), 0) + 1;

  return {
    stageIds: orderedStages,
    origemStageIds: validSeedEtapaIds,
    detalhes,
    processos,
    documentoIds: orderedDocs,
    edges,
    profundidadeMax,
  };
}
