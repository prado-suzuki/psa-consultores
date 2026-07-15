import type {
  Processo,
  Etapa,
  Documento,
  Sistema,
  Responsavel,
  Gargalo,
  Melhoria,
  Projeto,
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

const STYLES = [
  // Duas cores + 1 acento (gargalo). Mesma linguagem do consolidado: card claro
  // com borda teal; etapa com gargalo ganha acento âmbar (warning), não vermelho.
  '  classDef etapa        fill:#f8fafc,color:#0f172a,stroke:#0d9488,stroke-width:1.5px',
  '  classDef etapaGargalo fill:#fff7ed,color:#0f172a,stroke:#ea580c,stroke-width:2px',
  '  classDef vazio        fill:#f1f5f9,color:#64748b,stroke:#cbd5e1,stroke-width:1px,stroke-dasharray:4 3',
];

/** Texto seguro DENTRO de uma markdown string do mermaid: sem crases/aspas nem
 * marcadores de markdown (*, _, #, |, <, >) que bagunçam o parser; 1 linha. */
function mdText(s: string): string {
  return (s || '')
    .replace(/[`"]/g, "'")
    .replace(/[*_#~|<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Junta nomes com ' · ', cortando em `max` e somando "+N" no excedente. */
function joinCap(itens: string[], max: number): string {
  const limpos = itens.map(mdText).filter(Boolean);
  if (limpos.length === 0) return '';
  if (limpos.length <= max) return limpos.join(' · ');
  return `${limpos.slice(0, max).join(' · ')} +${limpos.length - max}`;
}

/** Monta o rótulo (markdown string) e a classe de UM card de etapa. O card é
 * enxuto de propósito: só o TÍTULO da etapa (negrito) + os responsáveis em texto
 * puro. Sem emojis, sem documentos e sem sistemas (vivem na aba AS-IS). `num` é o
 * número exibido (1-based, na ordem do fluxo). A etapa com gargalo (As-Is) ganha
 * só o acento de borda — sem linha de texto. */
function etapaCard(e: Etapa, num: number, useFicou: boolean, gargalos: Gargalo[]): { label: string; cls: string } {
  const f = useFicou ? e.ficou : null;
  const exec = (useFicou ? (f?.executadoPor ?? e.executadoPor) : e.executadoPor) || [];

  const temGargalo = !useFicou && (e.gargalos || []).some(gId => gargalos.some(g => g.id === gId));

  const card: string[] = [`**${num} · ${mdText(e.name)}**`];
  const resp = joinCap(exec.map(r => r.nome || r.responsavelId || ''), 4);
  if (resp) card.push(resp);

  return { label: card.join('\n'), cls: temGargalo ? 'etapaGargalo' : 'etapa' };
}

/**
 * Emite UM processo como uma SERPENTINA de cards ricos (um esquema 2D, não uma
 * tira). A sequência de etapas quebra em linhas: linhas pares fluem → e ímpares
 * ← (boustrophedon), então o fluxo "dobra" e preenche o espaço em 2D, cabendo
 * deitado mesmo com muitas etapas.
 *  - Cada etapa é UM card enxuto: título + responsáveis (sem emojis; docs/sistemas
 *    ficam de fora, na aba AS-IS). Sem nós/arestas de entidade → nada de espaguete.
 *  - Cada linha é um subgraph com `direction LR|RL`, empilhadas por link INVISÍVEL
 *    entre subgraphs (`row0 ~~~ row1`) — NUNCA entre nós: aresta nó→nó cruzando a
 *    borda faz o mermaid IGNORAR a direção interna e colapsar tudo numa coluna.
 *    A seta EXATA de "dobra" (último card → primeiro da próxima linha) é desenhada
 *    pelo DiagramViewer por cima do SVG, a partir dos metadados `%% FOLD a b`.
 *  - Texto multilinha via markdown string (```): sob `htmlLabels:false` rende como
 *    <tspan> (SVG puro, exporta bem). Listas longas cortam com "+N".
 *  - Gargalos só no As-Is (no To-Be são considerados resolvidos).
 * `ns` namespaceia os ids.
 */
function emitProcesso(lines: string[], input: BuildDiagramInput, ns: string): void {
  const { processo, etapas, gargalos } = input;
  const useFicou = input.mode === 'ficou';
  const eid = (e: Etapa) => safeId('E', `${ns}_${e.id}`);
  const rowId = (r: number) => safeId('ROW', `${ns}_${r}`);

  const vis = etapas
    .filter(e => !(useFicou && isEtapaEliminada(e)))
    .sort((a, b) => (a.stage_order ?? 0) - (b.stage_order ?? 0));

  if (vis.length === 0) {
    lines.push(`  ${safeId('EMPTY', `${ns}_${processo.id}`)}["${safeLabel(processo.name)} · sem etapas"]:::vazio`);
    return;
  }

  // Colunas por linha ~ raiz do dobro (tende a landscape), entre 3 e 6.
  const n = vis.length;
  const cols = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(n * 2))));
  const nRows = Math.ceil(n / cols);

  for (let r = 0; r < nRows; r++) {
    const linha = vis.slice(r * cols, r * cols + cols);
    lines.push(`  subgraph ${rowId(r)}[" "]`);
    lines.push(`    direction ${r % 2 === 0 ? 'LR' : 'RL'}`);
    linha.forEach((e, k) => {
      const { label, cls } = etapaCard(e, r * cols + k + 1, useFicou, gargalos);
      lines.push(`    ${eid(e)}["\`${label}\`"]:::${cls}`);
      if (k > 0) lines.push(`    ${eid(linha[k - 1])} --> ${eid(e)}`);
    });
    lines.push('  end');
  }

  // Empilha as linhas com link INVISÍVEL ENTRE OS SUBGRAPHS (não colapsa a
  // direção interna — aresta nó→nó cruzando a borda colapsaria).
  for (let r = 1; r < nRows; r++) lines.push(`  ${rowId(r - 1)} ~~~ ${rowId(r)}`);
  // Caixas das linhas invisíveis — só a serpentina de cards aparece.
  for (let r = 0; r < nRows; r++) lines.push(`  style ${rowId(r)} fill:none,stroke:none`);
  // Metadados das "dobras": último card de uma linha → primeiro da próxima. O
  // mermaid/dagre não liga nó→nó entre linhas sem colapsar a serpentina, então o
  // DiagramViewer desenha a seta EXATA etapa→etapa por cima do SVG (aparece no
  // viewer e nas exportações PNG/SVG). No .mmd fica como comentário.
  for (let r = 1; r < nRows; r++) {
    const prevLast = vis[r * cols - 1];
    const curFirst = vis[r * cols];
    if (prevLast && curFirst) lines.push(`  %% FOLD ${eid(prevLast)} ${eid(curFirst)}`);
  }
}

/**
 * Diagrama de UM processo (As-Is/To-Be): uma SERPENTINA de cards enxutos, um por
 * etapa (título + responsáveis). O fluxo dobra em linhas → preenche o espaço 2D
 * (esquema), não vira tira. Mesma linguagem visual do consolidado (2 cores +
 * acento de gargalo). Documentos/sistemas ficam fora do diagrama (aba AS-IS).
 */
export function buildProcessDiagram(input: BuildDiagramInput): string {
  const useFicou = input.mode === 'ficou';
  const lines: string[] = [];
  lines.push(`%% Diagrama do Processo (${useFicou ? 'To-Be · Como Ficou' : 'As-Is · Como Era'}) — gerado pelo MAPA`);
  // TB: as LINHAS da serpentina empilham de cima p/ baixo; dentro de cada linha
  // o fluxo é LR/RL (a direção fica no subgraph de cada linha).
  lines.push('flowchart TB');
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
 * Mapa CONSOLIDADO do projeto: uma LISTA vertical dos PROCESSOS — SEM as etapas.
 * O projeto é o cabeçalho do topo; cada processo é um card numerado, empilhados de
 * cima p/ baixo e ligados por setas ↓ (próximo processo). Em `flowchart TB` os nós
 * empilham naturalmente e as arestas saem verticais — sem precisar de subgraphs.
 *
 * Decisão (07/2026): o consolidado mostra só os PROCESSOS; o detalhe das etapas
 * vive no diagrama POR-processo (`buildProcessDiagram`). Headers em teal, mesma
 * linguagem visual dos demais diagramas do MAPA.
 */
export function buildProjectDiagram(input: BuildProjectDiagramInput): string {
  const { projeto, processos } = input;
  const useFicou = input.mode === 'ficou';
  const lines: string[] = [];
  lines.push(`%% Mapa do Projeto${projeto ? ` · ${safeLabel(projeto.name)}` : ''} (${useFicou ? 'To-Be' : 'As-Is'}) — gerado pelo MAPA`);
  lines.push('flowchart TB');

  const ordenados = [...processos].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0) || a.name.localeCompare(b.name),
  );

  // Projeto no topo + um card por processo (só o nome, numerado).
  const nodeIds: string[] = ['PROJ'];
  lines.push(`  PROJ["\`**${mdText(projeto?.name || 'Projeto')}**\`"]:::projHead`);
  ordenados.forEach((p, i) => {
    lines.push(`  PC_${i}["\`**${i + 1} · ${mdText(p.name)}**\`"]:::procHead`);
    nodeIds.push(`PC_${i}`);
  });

  // Setas ↓: projeto → 1º processo → … → último (fluxo vertical limpo).
  for (let r = 1; r < nodeIds.length; r++) lines.push(`  ${nodeIds[r - 1]} --> ${nodeIds[r]}`);

  lines.push('  %% ===== estilos =====');
  lines.push('  classDef projHead fill:#0d9488,color:#fff,stroke:#0f766e,stroke-width:3px,font-weight:bold');
  lines.push('  classDef procHead fill:#0d9488,color:#fff,stroke:#0f766e,stroke-width:2px,font-weight:bold');
  return lines.join('\n');
}
