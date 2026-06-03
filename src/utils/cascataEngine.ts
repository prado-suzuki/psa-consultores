// Motor de cascata em TypeScript — roda 100% no client.
//
// Antes, a derivação processo→processo vivia em SQL (server/cascade-sql.mjs).
// Com o banco no Supabase e a API Express descontinuada, reescrevemos a
// heurística aqui para que a UI funcione com os dados que ela já busca via
// `supabase.from(...).select(...)` — não precisa de RPC/Edge Function nem
// que o banco esteja populado.
//
// Sinais que pesam no grafo (replicam o SQL antigo):
//   • handoff canônico de documento  → peso 3   (forte)
//   • co-ocorrência de doc canônico  → peso 1.5 (médio)
//   • sistema/responsável em comum   → peso 0.6 (fraco; não propaga via BFS)
//
// IDF (Inverse Document Frequency) filtra ruído (E-mail, Word genérico).
// `idfMin` default 0.5 — em clusters pequenos (N ≤ 3), passe 0.

import type { Documento, Etapa, Processo, Sistema, Responsavel } from '@/types';

export interface CascataAresta {
  origemId: string;
  destinoId: string;
  peso: number;
  motivos: string[];
}

export interface CascataGrafo {
  processos: Processo[];
  arestas: CascataAresta[];
}

export interface ImpactoNode {
  id: string;
  nome: string;
  distancia: number;
  caminho?: string[];
}

export interface ImpactoProcesso {
  jusante: ImpactoNode[];
  montante: ImpactoNode[];
}

interface DadosCascata {
  processos: Processo[];
  etapas: Etapa[];
  documentos: Documento[];
  sistemas?: Sistema[];
  responsaveis?: Responsavel[];
}

interface DeriveOpts {
  cluster?: string;
  idfMin?: number;
}

// Normaliza nome de documento para comparação canônica (case/acentos/espaços).
export function canon(nome: string | null | undefined): string {
  if (!nome) return '';
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function canonDoc(docId: string, docsById: Map<string, Documento>): string {
  const d = docsById.get(docId);
  if (!d) return '';
  // Se houver `canonico_id` (agrupamento) usa o canônico — fallback p/ nome.
  type DocWithCanonico = Documento & { canonicoId?: string | null; canonico_id?: string | null };
  const withCanonico = d as DocWithCanonico;
  const canonicoId = withCanonico.canonicoId ?? withCanonico.canonico_id;
  if (canonicoId && docsById.has(canonicoId)) {
    return canon(docsById.get(canonicoId)!.nome);
  }
  return canon(d.nome);
}

function filtrarPorCluster(procs: Processo[], cluster?: string): Processo[] {
  if (!cluster) return procs;
  return procs.filter(p => {
    type ProcessoComCluster = Processo & { cluster?: string | null };
    return (p as ProcessoComCluster).cluster === cluster;
  });
}

// =====================================================================
// deriveCascadeGraph: monta as arestas processo→processo a partir dos dados.
// =====================================================================
export function deriveCascadeGraph(
  dados: DadosCascata,
  opts: DeriveOpts = {},
): CascataGrafo {
  const { idfMin = 0.5 } = opts;
  const processos = filtrarPorCluster(dados.processos, opts.cluster);
  const procIds = new Set(processos.map(p => p.id));
  const etapas = dados.etapas.filter(e => procIds.has(e.process_id));
  const docsById = new Map(dados.documentos.map(d => [d.id, d]));

  // Cada etapa contribui com doc-canônicos de entrada e saída.
  type EtapaSig = {
    etapa: Etapa;
    saida: Set<string>;
    entrada: Set<string>;
    sistemas: Set<string>;
    pessoas: Set<string>;
  };
  const sigs: EtapaSig[] = etapas.map(e => {
    const saida = new Set<string>();
    const entrada = new Set<string>();
    for (const ds of e.docsSaida ?? []) {
      if (ds.documentoId) saida.add(canonDoc(ds.documentoId, docsById));
      else if (ds.nome) saida.add(canon(ds.nome));
    }
    for (const de of e.docsEntrada ?? []) {
      if (de.documentoId) entrada.add(canonDoc(de.documentoId, docsById));
      else if (de.nome) entrada.add(canon(de.nome));
    }
    saida.delete(''); entrada.delete('');
    const sistemas = new Set((e.sistemas ?? []).map(s => s));
    const pessoas = new Set((e.executadoPor ?? []).map(r => r.responsavelId ?? r.nome).filter(Boolean) as string[]);
    return { etapa: e, saida, entrada, sistemas, pessoas };
  });

  // Document frequency (df) sobre o conjunto de processos do escopo.
  const dfDoc = new Map<string, number>();
  const procToTokens = new Map<string, Set<string>>();
  for (const s of sigs) {
    const set = procToTokens.get(s.etapa.process_id) ?? new Set<string>();
    for (const t of s.saida) set.add(t);
    for (const t of s.entrada) set.add(t);
    procToTokens.set(s.etapa.process_id, set);
  }
  for (const tokens of procToTokens.values()) {
    for (const t of tokens) dfDoc.set(t, (dfDoc.get(t) ?? 0) + 1);
  }
  const N = procToTokens.size;
  const idf = (t: string) => {
    const df = dfDoc.get(t) ?? 0;
    return Math.log((N + 1) / (df + 1));
  };

  // ── Sinais ─────────────────────────────────────────────────────────
  type EdgeAcc = { peso: number; motivos: Set<string> };
  const edges = new Map<string, EdgeAcc>(); // key = `${origem}::${destino}`

  const bump = (origem: string, destino: string, delta: number, motivo: string) => {
    if (origem === destino) return;
    const k = `${origem}::${destino}`;
    const cur = edges.get(k) ?? { peso: 0, motivos: new Set<string>() };
    cur.peso += delta;
    cur.motivos.add(motivo);
    edges.set(k, cur);
  };

  // Comparação par-a-par de etapas. O escopo é pequeno (centenas no MAPA),
  // então O(n²) é aceitável e mantém a regra próxima do SQL antigo.
  for (let i = 0; i < sigs.length; i++) {
    for (let j = 0; j < sigs.length; j++) {
      if (i === j) continue;
      const a = sigs[i], b = sigs[j];
      if (a.etapa.process_id === b.etapa.process_id) continue;

      // (1) Handoff canônico: saída de A coincide com entrada de B
      for (const t of a.saida) {
        if (!t || idf(t) < idfMin) continue;
        if (b.entrada.has(t)) {
          bump(a.etapa.process_id, b.etapa.process_id, 3, `Documento: ${t}`);
        }
      }
      // (2) Co-ocorrência de doc canônico (sem direção forte) — peso 1.5
      for (const t of a.saida) {
        if (!t || idf(t) < idfMin) continue;
        if (b.saida.has(t)) {
          // Dois processos produzem o mesmo doc → ambos influenciam o consumidor;
          // como não temos direção, conecta de A→B com peso reduzido.
          bump(a.etapa.process_id, b.etapa.process_id, 1.5, `Co-doc: ${t}`);
        }
      }
      // (3) Sistema/responsável em comum — peso fraco 0.6 (não propaga via BFS)
      for (const s of a.sistemas) {
        if (b.sistemas.has(s)) {
          bump(a.etapa.process_id, b.etapa.process_id, 0.6, `Sistema: ${s}`);
        }
      }
      for (const p of a.pessoas) {
        if (b.pessoas.has(p)) {
          bump(a.etapa.process_id, b.etapa.process_id, 0.6, `Responsável: ${p}`);
        }
      }
    }
  }

  const arestas: CascataAresta[] = [];
  for (const [k, v] of edges) {
    const [origemId, destinoId] = k.split('::');
    arestas.push({ origemId, destinoId, peso: v.peso, motivos: [...v.motivos] });
  }
  // Direção entre dois processos do mesmo projeto: prefere a ordem (P.ordem
  // crescente do origem para destino). Quando ambígua, mantém ambas.
  return { processos, arestas };
}

// =====================================================================
// deriveImpact: BFS jusante/montante a partir de um processo raiz.
// Sinais fracos (peso < 1) NÃO propagam — só usados na visualização do grafo.
// =====================================================================
export function deriveImpact(
  grafo: CascataGrafo,
  process_id: string,
): ImpactoProcesso {
  const procById = new Map(grafo.processos.map(p => [p.id, p]));
  const fortes = grafo.arestas.filter(a => a.peso >= 1);

  const adj = new Map<string, Set<string>>();
  const adjRev = new Map<string, Set<string>>();
  for (const a of fortes) {
    const o = adj.get(a.origemId) ?? new Set<string>();
    o.add(a.destinoId); adj.set(a.origemId, o);
    const r = adjRev.get(a.destinoId) ?? new Set<string>();
    r.add(a.origemId); adjRev.set(a.destinoId, r);
  }

  const bfs = (start: string, vizinhos: Map<string, Set<string>>): ImpactoNode[] => {
    const out: ImpactoNode[] = [];
    const visit = new Map<string, number>([[start, 0]]);
    const queue: string[] = [start];
    while (queue.length) {
      const cur = queue.shift()!;
      const dist = visit.get(cur)!;
      for (const v of vizinhos.get(cur) ?? []) {
        if (visit.has(v)) continue;
        visit.set(v, dist + 1);
        queue.push(v);
        const p = procById.get(v);
        out.push({ id: v, nome: p?.name ?? v, distancia: dist + 1 });
      }
    }
    return out;
  };

  return {
    jusante: bfs(process_id, adj),
    montante: bfs(process_id, adjRev),
  };
}
