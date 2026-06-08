// Derivação de Cascata por Documento — calculada em tempo real (sem
// persistência). Dado N documentos-semente (vindos de gargalo.documentosAfetados),
// faz BFS jusante pelo grafo:
//
//   doc → etapas que TÊM doc como entrada → docs de saída dessas etapas →
//         etapas que CONSUMEM essas saídas → ... (até esgotar)
//
// Comparação canônica via canon() — equivalente ao cascataEngine — reusa
// canonico_id quando disponível para agrupar variações ("Matrícula" /
// "Matrícula atualizada" etc.).
//
// Não há limite de profundidade nem persistência: cada chamada recalcula.

import type { Documento, Etapa, Processo } from '@/types';
import { canon } from '@/utils/cascataEngine';

export interface DerivacaoCascata {
  /** IDs de etapas afetadas, na ordem em que entraram na BFS. */
  stageIds: string[];
  /** IDs de processos afetados (deduplicado de stageIds). */
  processIds: string[];
  /** IDs de documentos visitados (inclui os seeds). */
  documentoIds: string[];
  /** Arestas para renderização. */
  edges: CascataEdge[];
  /** Profundidade máxima alcançada pela BFS (0 = só seeds, 1 = primeiras etapas). */
  profundidadeMax: number;
}

export interface CascataEdge {
  from: { kind: 'doc' | 'stage'; id: string };
  to:   { kind: 'doc' | 'stage'; id: string };
  /** Distância da semente (camada da BFS). */
  depth: number;
}

interface DerivarOpts {
  /** Limita escopo aos processos de um cluster específico (opcional). */
  clusterId?: string | null;
}

interface EtapaIndexada {
  etapa: Etapa;
  entradaCanon: Set<string>;
  saidaCanon: Set<string>;
}

/**
 * Calcula o nome canônico de um documento, considerando canonico_id quando
 * presente (agrupa "Matrícula" e "Matrícula atualizada" sob o mesmo canon).
 */
function canonDocId(docId: string, docsById: Map<string, Documento>): string {
  const d = docsById.get(docId);
  if (!d) return '';
  // Documento pode ter canonico_id apontando ao "pai" canônico.
  type DocComCanonico = Documento & { canonicoId?: string | null; canonico_id?: string | null };
  const dc = d as DocComCanonico;
  const canonicoId = dc.canonicoId ?? dc.canonico_id;
  if (canonicoId && docsById.has(canonicoId)) {
    return canon(docsById.get(canonicoId)!.nome);
  }
  return canon(d.nome);
}

/**
 * BFS jusante a partir de N documentos-semente.
 *
 * Algoritmo:
 *   1. Para cada doc-semente, calcula seu canon e adiciona à fila de docs.
 *   2. Loop BFS por camadas:
 *      - Para cada doc da camada atual: acha etapas onde doc ∈ entrada.
 *      - Para cada etapa nova: marca como afetada, coleta seus docs de saída.
 *      - Docs de saída ainda não visitados entram na próxima camada.
 *   3. Para quando não há mais docs novos para processar.
 *
 * Não persiste nada — apenas devolve estrutura para renderização.
 */
export function derivarCascataPorDocumentos(
  seedDocIds: string[],
  todasEtapas: Etapa[],
  todosDocumentos: Documento[],
  todosProcessos: Processo[],
  opts: DerivarOpts = {},
): DerivacaoCascata {
  // ─── Índices ────────────────────────────────────────────────────────
  const docsById = new Map(todosDocumentos.map((d) => [d.id, d]));
  const processosById = new Map(todosProcessos.map((p) => [p.id, p]));

  // Se houver clusterId, filtra etapas cujos processos pertencem ao cluster.
  const etapasEscopo = opts.clusterId
    ? todasEtapas.filter((e) => {
        const p = processosById.get(e.process_id);
        type ProcessoComCluster = Processo & { cluster_id?: string | null; cluster?: string | null };
        const pc = p as ProcessoComCluster | undefined;
        return pc?.cluster_id === opts.clusterId || pc?.cluster === opts.clusterId;
      })
    : todasEtapas;

  // Pré-calcula canon de entrada/saída de cada etapa
  const etapasIndex: EtapaIndexada[] = etapasEscopo.map((e) => {
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

  // Map canon → docId real (primeiro encontrado) para reconstituir docs de saída
  const canonToDocId = new Map<string, string>();
  for (const d of todosDocumentos) {
    const c = canonDocId(d.id, docsById);
    if (c && !canonToDocId.has(c)) canonToDocId.set(c, d.id);
  }

  // ─── BFS por camadas ───────────────────────────────────────────────
  const seedCanons = new Set(seedDocIds.map((id) => canonDocId(id, docsById)).filter(Boolean));
  if (seedCanons.size === 0) {
    return { stageIds: [], processIds: [], documentoIds: [], edges: [], profundidadeMax: 0 };
  }

  const visitedDocs = new Set<string>(); // canons já enfileirados
  const visitedStages = new Set<string>(); // etapa ids
  const orderedStages: string[] = [];
  const orderedDocs: string[] = [];
  const edges: CascataEdge[] = [];

  let layer: string[] = []; // canons na camada atual
  for (const c of seedCanons) {
    visitedDocs.add(c);
    layer.push(c);
    const docId = canonToDocId.get(c);
    if (docId) orderedDocs.push(docId);
  }

  let depth = 0;
  let profundidadeMax = 0;

  while (layer.length > 0) {
    const nextLayer: string[] = [];

    for (const docCanon of layer) {
      // Acha todas as etapas que TÊM esse doc como entrada
      const consumidoras = etapasIndex.filter((ei) => ei.entradaCanon.has(docCanon));

      for (const ei of consumidoras) {
        const stageId = ei.etapa.id;
        // Aresta doc → stage
        const docId = canonToDocId.get(docCanon);
        if (docId) {
          edges.push({
            from: { kind: 'doc',   id: docId },
            to:   { kind: 'stage', id: stageId },
            depth,
          });
        }

        if (visitedStages.has(stageId)) continue;
        visitedStages.add(stageId);
        orderedStages.push(stageId);
        profundidadeMax = Math.max(profundidadeMax, depth + 1);

        // Adiciona saídas desta etapa à próxima camada
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

  // Processos derivados das etapas afetadas (deduplicados, mantendo ordem)
  const processIds: string[] = [];
  const seenProc = new Set<string>();
  for (const sid of orderedStages) {
    const e = etapasIndex.find((ei) => ei.etapa.id === sid);
    const pid = e?.etapa.process_id;
    if (pid && !seenProc.has(pid)) {
      seenProc.add(pid);
      processIds.push(pid);
    }
  }

  return {
    stageIds: orderedStages,
    processIds,
    documentoIds: orderedDocs,
    edges,
    profundidadeMax,
  };
}

/**
 * Agrupa as arestas granulares (doc↔stage) em arestas macro (doc↔processo).
 *
 * Para o modo "macro" do toggle: substitui cada nó-stage pelo seu processo
 * pai e deduplica arestas resultantes.
 */
export function agruparPorProcesso(
  derivacao: DerivacaoCascata,
  todasEtapas: Etapa[],
): DerivacaoCascata {
  const stageToProc = new Map(todasEtapas.map((e) => [e.id, e.process_id]));

  const edgeKey = (e: CascataEdge) =>
    `${e.from.kind}:${e.from.id}->${e.to.kind}:${e.to.id}`;

  const seen = new Set<string>();
  const edgesMacro: CascataEdge[] = [];

  for (const ed of derivacao.edges) {
    const fromMacro = ed.from.kind === 'stage'
      ? { kind: 'stage' as const, id: stageToProc.get(ed.from.id) ?? ed.from.id }
      : ed.from;
    const toMacro = ed.to.kind === 'stage'
      ? { kind: 'stage' as const, id: stageToProc.get(ed.to.id) ?? ed.to.id }
      : ed.to;

    // No modo macro o nó "stage" representa o processo. Marcamos kind='stage'
    // mas o id é processId — para o renderer saber, retornamos como 'stage'
    // ainda; a UI sabe que está em modo macro e busca pelo processId.
    const newEdge: CascataEdge = { from: fromMacro, to: toMacro, depth: ed.depth };
    const k = edgeKey(newEdge);
    if (seen.has(k)) continue;
    if (newEdge.from.id === newEdge.to.id) continue; // self-loop dedupado
    seen.add(k);
    edgesMacro.push(newEdge);
  }

  return {
    stageIds: derivacao.processIds,  // no modo macro, "stages" = processos
    processIds: derivacao.processIds,
    documentoIds: derivacao.documentoIds,
    edges: edgesMacro,
    profundidadeMax: derivacao.profundidadeMax,
  };
}
