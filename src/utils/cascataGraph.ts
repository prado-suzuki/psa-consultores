// Grafo executivo da Cascata — transforma a DerivacaoCascata (invalidação
// documental BFS) em um grafo nível-processo organizado em ondas de
// profundidade, pronto para renderização visual (colunas + arestas
// processo→processo):
//
//   ROOT (gargalo) → onda 0 (processos das etapas-origem) → onda 1 → ...
//
// As arestas entre processos são derivadas do fluxo real de documentos
// (stage→doc→stage), agregadas por par de processos, com os nomes dos
// documentos preservados para exibição (tooltip).

import type { Documento, Etapa, Processo } from '@/types';
import type { DerivacaoCascata, MotivoEtapa } from '@/utils/cascataDocumento';

export const CASCATA_ROOT_ID = '__root__';

export interface CascataEtapaNode {
  id: string;
  nome: string;
  ordem: number;
  origem: boolean;
  motivo: MotivoEtapa;
  /** Nome do documento invalidado que a etapa consome (motivo 'documento'). */
  viaDocNome?: string;
  depth: number;
}

export interface CascataProcessNode {
  processId: string;
  nome: string;
  /** Coluna do nó: menor profundidade BFS entre suas etapas afetadas. */
  wave: number;
  intensidade: 'TOTAL' | 'PARCIAL';
  razao: number;
  etapasAfetadas: CascataEtapaNode[];
  etapasTotais: number;
  /** Documentos do processo que ficam desatualizados (nomes, p/ exibição). */
  docsAfetados: string[];
}

export interface CascataProcessEdge {
  id: string;
  /** processId de origem ou CASCATA_ROOT_ID. */
  from: string;
  to: string;
  /** Documentos que fluem nessa aresta (nomes, para tooltip). */
  docNomes: string[];
  /** true quando o fluxo não tem documento rastreável (fallback da raiz). */
  indireto: boolean;
}

export interface CascataGraph {
  /** waves[i] = nós de processo da onda i, ordenados por razão desc. */
  waves: CascataProcessNode[][];
  edges: CascataProcessEdge[];
  totalProcessos: number;
  totalEtapas: number;
  totalDocs: number;
}

export function buildCascataGraph(
  derivacao: DerivacaoCascata,
  etapas: Etapa[],
  processos: Processo[],
  documentos: Documento[],
): CascataGraph {
  const etapaById = new Map(etapas.map((e) => [e.id, e]));
  const procNomeById = new Map(processos.map((p) => [p.id, p.name]));
  const docNomeById = new Map(documentos.map((d) => [d.id, d.nome]));
  const docsInvalidados = new Set(derivacao.documentoIds);

  const nodes: CascataProcessNode[] = derivacao.processos.map((p) => {
    const etapasNode: CascataEtapaNode[] = p.etapasAfetadas
      .map((sid) => {
        const et = etapaById.get(sid);
        const det = derivacao.detalhes[sid];
        const viaDocNome = det?.viaDocumentoId
          ? docNomeById.get(det.viaDocumentoId)
          : undefined;
        return {
          id: sid,
          nome: et?.name ?? sid,
          ordem: et?.stage_order ?? 0,
          origem: det?.motivo === 'origem',
          motivo: det?.motivo ?? 'documento',
          ...(viaDocNome ? { viaDocNome } : {}),
          depth: det?.depth ?? 0,
        };
      })
      .sort((a, b) => a.ordem - b.ordem);

    // Documentos do processo invalidados pela cascata (saídas das afetadas)
    const docsAfetados: string[] = [];
    const vistos = new Set<string>();
    for (const sid of p.etapasAfetadas) {
      for (const ds of etapaById.get(sid)?.docsSaida ?? []) {
        if (ds.documentoId && !docsInvalidados.has(ds.documentoId)) continue;
        const nome = (ds.documentoId ? docNomeById.get(ds.documentoId) : undefined) ?? ds.nome;
        if (nome && !vistos.has(nome)) {
          vistos.add(nome);
          docsAfetados.push(nome);
        }
      }
    }

    return {
      processId: p.processId,
      nome: procNomeById.get(p.processId) ?? p.processId,
      wave: Math.min(...etapasNode.map((e) => e.depth)),
      intensidade: p.intensidade,
      razao: p.razao,
      etapasAfetadas: etapasNode,
      etapasTotais: p.etapasTotais,
      docsAfetados,
    };
  });

  const maxWave = nodes.reduce((m, n) => Math.max(m, n.wave), 0);
  const waves: CascataProcessNode[][] = Array.from({ length: maxWave + 1 }, () => []);
  for (const n of nodes) waves[n.wave].push(n);
  for (const col of waves) {
    col.sort((a, b) => b.razao - a.razao || a.nome.localeCompare(b.nome));
  }

  // ─── Arestas processo→processo via fluxo de documentos ────────────────
  const processByStage = new Map<string, string>();
  for (const e of etapas) processByStage.set(e.id, e.process_id);

  const producersByDoc = new Map<string, Set<string>>();
  for (const e of derivacao.edges) {
    if (e.from.kind === 'stage' && e.to.kind === 'doc') {
      const set = producersByDoc.get(e.to.id) ?? new Set<string>();
      set.add(e.from.id);
      producersByDoc.set(e.to.id, set);
    }
  }

  const edgeMap = new Map<string, CascataProcessEdge>();
  const addEdge = (from: string, to: string, docNome?: string, indireto = false) => {
    if (from === to) return;
    const key = `${from}→${to}`;
    let edge = edgeMap.get(key);
    if (!edge) {
      edge = { id: key, from, to, docNomes: [], indireto };
      edgeMap.set(key, edge);
    }
    if (docNome && !edge.docNomes.includes(docNome)) edge.docNomes.push(docNome);
    if (!indireto) edge.indireto = false;
  };

  for (const e of derivacao.edges) {
    if (e.from.kind !== 'doc' || e.to.kind !== 'stage') continue;
    const toProc = processByStage.get(e.to.id);
    if (!toProc) continue;
    const producers = producersByDoc.get(e.from.id);
    if (!producers) continue;
    const docNome = docNomeById.get(e.from.id);
    for (const prodStage of producers) {
      const fromProc = processByStage.get(prodStage);
      if (fromProc) addEdge(fromProc, toProc, docNome);
    }
  }

  // Raiz: gargalo manifesta-se nos processos da onda 0.
  for (const n of waves[0] ?? []) addEdge(CASCATA_ROOT_ID, n.processId);

  // Fallback: nó em onda > 0 sem aresta de entrada (doc sem id rastreável)
  // recebe ligação indireta da raiz para não ficar órfão no desenho.
  const hasIncoming = new Set(Array.from(edgeMap.values()).map((e) => e.to));
  for (const n of nodes) {
    if (n.wave > 0 && !hasIncoming.has(n.processId)) {
      addEdge(CASCATA_ROOT_ID, n.processId, undefined, true);
    }
  }

  return {
    waves,
    edges: Array.from(edgeMap.values()),
    totalProcessos: nodes.length,
    totalEtapas: derivacao.stageIds.length,
    totalDocs: derivacao.documentoIds.length,
  };
}
