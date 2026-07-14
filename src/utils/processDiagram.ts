import type {
  Processo,
  Etapa,
  Documento,
  Sistema,
  Responsavel,
  Gargalo,
  Melhoria,
  Projeto,
  DocRef,
} from '../types';
import { isEtapaEliminada } from './pdf/helpers';

export interface BuildDiagramInput {
  processo: Processo;
  etapas: Etapa[];
  documentos: Documento[];
  sistemas: Sistema[];
  responsaveis: Responsavel[];
  gargalos: Gargalo[];
  melhorias: Melhoria[];
  projeto?: Projeto | null;
  /**
   * Cenário do diagrama:
   * - `'era'` (padrão): As-Is — fluxo das etapas atuais; mostra Gargalos por etapa.
   * - `'ficou'`: To-Be — usa os campos do `etapa.ficou` (fallback ao As-Is quando
   *   não projetado), ignora etapas eliminadas e oculta Gargalos (resolvidos).
   */
  mode?: 'era' | 'ficou';
}

/** Sanitiza um id para o Mermaid (sem hífen, espaços ou pontuação). */
export function safeId(prefix: string, raw: string): string {
  return `${prefix}_${raw.replace(/[^A-Za-z0-9_]/g, '_')}`;
}

/** Escapa caracteres que confundem o parser do mermaid em labels entre aspas. */
export function safeLabel(s: string): string {
  return s
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\|/g, '&#124;')
    .replace(/\n/g, ' ');
}

function docKey(d: DocRef | string): string {
  return typeof d === 'string' ? d : (d.documentoId || d.nome);
}
function docNome(d: DocRef | string): string {
  return typeof d === 'string' ? d : (d.nome || d.documentoId || '');
}

const STYLES = [
  '  classDef proc        fill:#0d9488,color:#fff,stroke:#0f766e,stroke-width:2px,font-weight:bold',
  '  classDef etapa       fill:#0f172a,color:#fff,stroke:#0d9488,stroke-width:2px,font-weight:bold',
  '  classDef documento   fill:#fef3c7,color:#78350f,stroke:#f59e0b,stroke-width:1px',
  '  classDef responsavel fill:#dbeafe,color:#1e3a8a,stroke:#3b82f6,stroke-width:1px',
  '  classDef sistema     fill:#ede9fe,color:#4c1d95,stroke:#8b5cf6,stroke-width:1px',
  '  classDef gargalo     fill:#fee2e2,color:#7f1d1d,stroke:#dc2626,stroke-width:1px',
  '  classDef vazio       fill:#f1f5f9,color:#64748b,stroke:#cbd5e1,stroke-width:1px,stroke-dasharray:4 3',
];

/**
 * Emite UM processo como um MODELO DE ENTIDADES (sem repetição):
 *  - Etapas = a espinha do processo (encadeadas por stage_order, esquerda→direita).
 *  - Responsáveis / Sistemas / Documentos = entidades ÚNICAS, cada uma aparece
 *    UMA vez, agrupadas por tipo em subgraphs. As etapas se RELACIONAM com elas
 *    por ligações (resp → etapa; etapa → sistema; doc → etapa / etapa → doc).
 *  - Gargalos (só As-Is) apontam para a etapa que impactam.
 * `ns` namespaceia os ids (visão consolidada do projeto).
 */
function emitProcesso(lines: string[], input: BuildDiagramInput, ns: string): void {
  const { processo, etapas, gargalos } = input;
  const useFicou = input.mode === 'ficou';
  const nid = (kind: string, raw: string) => safeId(kind, `${ns}_${raw}`);
  const eid = (e: Etapa) => nid('E', e.id);
  const rid = (k: string) => nid('R', k);
  const sid = (k: string) => nid('S', k);
  const did = (k: string) => nid('D', k);
  const gid = (k: string) => nid('G', k);

  const vis = etapas
    .filter(e => !(useFicou && isEtapaEliminada(e)))
    .sort((a, b) => (a.stage_order ?? 0) - (b.stage_order ?? 0));

  if (vis.length === 0) {
    lines.push(`  ${nid('EMPTY', processo.id)}["${safeLabel(processo.name)} · sem etapas"]:::vazio`);
    return;
  }

  // Espinha das etapas (horizontal).
  vis.forEach((e, i) => {
    lines.push(`  ${eid(e)}["${i + 1} · ${safeLabel(e.name)}"]:::etapa`);
    if (i > 0) lines.push(`  ${eid(vis[i - 1])} ==> ${eid(e)}`);
  });

  // Coleta entidades ÚNICAS + as relações (uma aresta por (etapa, entidade)).
  const resp = new Map<string, string>();
  const sis = new Map<string, string>();
  const doc = new Map<string, string>();
  const gar = new Map<string, string>();
  const rel: string[] = [];
  for (const e of vis) {
    const f = useFicou ? e.ficou : null;
    const exec = (useFicou ? (f?.executadoPor ?? e.executadoPor) : e.executadoPor) || [];
    const sist = (useFicou ? (f?.sistemas ?? e.sistemas) : e.sistemas) || [];
    const dEnt = (useFicou ? (f?.docsEntrada ?? e.docsEntrada) : e.docsEntrada) || [];
    const dSai = (useFicou ? (f?.docsSaida ?? e.docsSaida) : e.docsSaida) || [];

    for (const r of exec) { const k = r.responsavelId || r.nome; if (!k?.trim()) continue; resp.set(k, r.nome || k); rel.push(`  ${rid(k)} -.-> ${eid(e)}`); }
    for (const s of sist) { if (!s?.trim()) continue; sis.set(s, s); rel.push(`  ${eid(e)} -.-> ${sid(s)}`); }
    for (const d of dEnt) { const k = docKey(d); if (!k) continue; doc.set(k, docNome(d)); rel.push(`  ${did(k)} --> ${eid(e)}`); }
    for (const d of dSai) { const k = docKey(d); if (!k) continue; doc.set(k, docNome(d)); rel.push(`  ${eid(e)} --> ${did(k)}`); }
    if (!useFicou) {
      for (const gId of e.gargalos || []) {
        const g = gargalos.find(x => x.id === gId);
        if (g) { gar.set(g.id, g.nome); rel.push(`  ${gid(g.id)} -. impacta .-> ${eid(e)}`); }
      }
    }
  }

  // Cada tipo num grupo (entidades únicas).
  const grupo = (sgId: string, titulo: string, itens: Map<string, string>, cls: string, idFn: (k: string) => string) => {
    if (itens.size === 0) return;
    lines.push(`  subgraph ${sgId}["${titulo}"]`);
    lines.push('    direction TB');
    itens.forEach((nome, k) => lines.push(`    ${idFn(k)}["${safeLabel(nome)}"]:::${cls}`));
    lines.push('  end');
  };
  grupo(nid('SGR', 'x'), 'Responsáveis', resp, 'responsavel', rid);
  grupo(nid('SGS', 'x'), 'Sistemas', sis, 'sistema', sid);
  grupo(nid('SGD', 'x'), 'Documentos', doc, 'documento', did);
  gar.forEach((nome, k) => lines.push(`  ${gid(k)}["${safeLabel(nome)}"]:::gargalo`));

  rel.forEach(l => lines.push(l));
}

/**
 * Diagrama de UM processo (As-Is/To-Be): o fluxo das suas etapas com docs,
 * responsáveis, sistemas e gargalos. Rótulos em TEXTO PURO (sem HTML) para o
 * SVG/PNG exportados não quebrarem.
 */
export function buildProcessDiagram(input: BuildDiagramInput): string {
  const useFicou = input.mode === 'ficou';
  const lines: string[] = [];
  lines.push(`%% Diagrama do Processo (${useFicou ? 'To-Be · Como Ficou' : 'As-Is · Como Era'}) — gerado pelo MAPA`);
  // LR (horizontal): monitor é mais largo que alto — o fluxo lê melhor da
  // esquerda p/ direita; docs/responsáveis/sistemas se distribuem ao redor.
  lines.push('flowchart LR');
  emitProcesso(lines, input, 'P');
  lines.push('  %% ===== estilos =====');
  STYLES.forEach(s => lines.push(s));
  return lines.join('\n');
}

export interface BuildProjectDiagramInput {
  projeto: Projeto | null;
  processos: Processo[];
  etapasPorProcesso: Map<string, Etapa[]>;
  documentos: Documento[];
  sistemas: Sistema[];
  responsaveis: Responsavel[];
  gargalos: Gargalo[];
  melhorias: Melhoria[];
  mode?: 'era' | 'ficou';
}

/**
 * Diagrama CONSOLIDADO do projeto: um subgraph por processo, cada um com o seu
 * fluxo de etapas. Ids namespaceados por processo (não colidem). Processos sem
 * etapa entram como nó "sem etapas".
 */
export function buildProjectDiagram(input: BuildProjectDiagramInput): string {
  const { projeto, processos, etapasPorProcesso } = input;
  const useFicou = input.mode === 'ficou';
  const lines: string[] = [];
  lines.push(`%% Diagrama do Projeto${projeto ? ` · ${safeLabel(projeto.name)}` : ''} (${useFicou ? 'To-Be' : 'As-Is'}) — gerado pelo MAPA`);
  // HORIZONTAL: cada processo é um subgraph (caixa rotulada) com suas etapas
  // fluindo da esquerda p/ direita (direction LR). As CAIXAS também ficam lado a
  // lado (esquerda→direita): um link invisível (~~~) entre a última etapa de um
  // processo e a primeira do próximo força esse alinhamento no flowchart LR
  // (senão o mermaid empilha subgraphs desconectados em linhas). Só a espinha.
  lines.push('flowchart LR');

  const ordenados = [...processos].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0) || a.name.localeCompare(b.name),
  );
  let prevLast: string | null = null;
  ordenados.forEach((p, i) => {
    const vis = (etapasPorProcesso.get(p.id) || [])
      .filter(e => !(useFicou && isEtapaEliminada(e)))
      .sort((a, b) => (a.stage_order ?? 0) - (b.stage_order ?? 0));
    lines.push(`  subgraph SGP_${i}["${i + 1} · ${safeLabel(p.name)}"]`);
    lines.push('    direction LR');
    let first: string;
    let last: string;
    if (vis.length === 0) {
      first = last = `PEMPTY_${i}`;
      lines.push(`    ${first}["sem etapas"]:::vazio`);
    } else {
      vis.forEach((e, j) => lines.push(`    PE_${i}_${j}["${j + 1} · ${safeLabel(e.name)}"]:::etapa`));
      for (let j = 1; j < vis.length; j++) lines.push(`    PE_${i}_${j - 1} --> PE_${i}_${j}`);
      first = `PE_${i}_0`;
      last = `PE_${i}_${vis.length - 1}`;
    }
    lines.push('  end');
    if (prevLast) lines.push(`  ${prevLast} ~~~ ${first}`);
    prevLast = last;
  });

  lines.push('  %% ===== estilos =====');
  STYLES.forEach(s => lines.push(s));
  return lines.join('\n');
}
