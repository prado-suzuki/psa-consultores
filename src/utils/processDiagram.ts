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

/** Um card da serpentina: id (pronto), rótulo (markdown string) e classe CSS. */
interface SerpentineCard {
  id: string;
  label: string;
  cls: string;
}

/**
 * Núcleo da SERPENTINA (esquema 2D, não uma tira): quebra os cards em linhas que
 * fluem → (pares) e ← (ímpares, boustrophedon); o fluxo "dobra" e preenche o
 * espaço deitado mesmo com muitos cards. É a MESMA estrutura para o diagrama de
 * processo (cards = etapas) e para o consolidado (cards = processos).
 *  - Cada linha é um subgraph com `direction LR|RL`, empilhadas por link INVISÍVEL
 *    entre subgraphs (`row0 ~~~ row1`) — NUNCA entre nós: aresta nó→nó cruzando a
 *    borda faz o mermaid IGNORAR a direção interna e colapsar tudo numa coluna.
 *  - A seta EXATA de "dobra" (último card de uma linha → primeiro da próxima) é
 *    desenhada pelo DiagramViewer por cima do SVG, a partir de `%% FOLD a b`.
 * `ns` namespaceia os ids das LINHAS; os ids dos CARDS vêm prontos do chamador
 * (cada diagrama mantém o seu esquema de id).
 */
function emitSerpentine(lines: string[], cards: SerpentineCard[], ns: string): void {
  const rowId = (r: number) => safeId('ROW', `${ns}_${r}`);
  const n = cards.length;
  // Colunas por linha ~ raiz do dobro (tende a landscape), entre 3 e 6.
  const cols = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(n * 2))));
  const nRows = Math.ceil(n / cols);

  for (let r = 0; r < nRows; r++) {
    const linha = cards.slice(r * cols, r * cols + cols);
    lines.push(`  subgraph ${rowId(r)}[" "]`);
    lines.push(`    direction ${r % 2 === 0 ? 'LR' : 'RL'}`);
    linha.forEach((c, k) => {
      lines.push(`    ${c.id}["\`${c.label}\`"]:::${c.cls}`);
      if (k > 0) lines.push(`    ${linha[k - 1].id} --> ${c.id}`);
    });
    lines.push('  end');
  }

  // Empilha as linhas com link INVISÍVEL ENTRE OS SUBGRAPHS (não colapsa a direção).
  for (let r = 1; r < nRows; r++) lines.push(`  ${rowId(r - 1)} ~~~ ${rowId(r)}`);
  // Caixas das linhas invisíveis — só a serpentina de cards aparece.
  for (let r = 0; r < nRows; r++) lines.push(`  style ${rowId(r)} fill:none,stroke:none`);
  // Metadados das "dobras": último card de uma linha → primeiro da próxima (o
  // DiagramViewer desenha a seta EXATA por cima do SVG — viewer e exports).
  for (let r = 1; r < nRows; r++) {
    const prevLast = cards[r * cols - 1];
    const curFirst = cards[r * cols];
    if (prevLast && curFirst) lines.push(`  %% FOLD ${prevLast.id} ${curFirst.id}`);
  }
}

/**
 * Emite UM processo como serpentina de cards de ETAPA (título + responsáveis; sem
 * emojis/docs/sistemas). Gargalos só no As-Is. `ns` namespaceia os ids.
 */
function emitProcesso(lines: string[], input: BuildDiagramInput, ns: string): void {
  const { processo, etapas, gargalos } = input;
  const useFicou = input.mode === 'ficou';
  const eid = (e: Etapa) => safeId('E', `${ns}_${e.id}`);

  const vis = etapas
    .filter(e => !(useFicou && isEtapaEliminada(e)))
    .sort((a, b) => (a.stage_order ?? 0) - (b.stage_order ?? 0));

  if (vis.length === 0) {
    lines.push(`  ${safeId('EMPTY', `${ns}_${processo.id}`)}["${safeLabel(processo.name)} · sem etapas"]:::vazio`);
    return;
  }

  const cards: SerpentineCard[] = vis.map((e, i) => {
    const { label, cls } = etapaCard(e, i + 1, useFicou, gargalos);
    return { id: eid(e), label, cls };
  });
  emitSerpentine(lines, cards, ns);
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
 * Mapa CONSOLIDADO do projeto: a MESMA estrutura do diagrama por-processo — uma
 * SERPENTINA que dobra em linhas (LR/RL) + conectores de dobra — só que os cards
 * são os PROCESSOS (numerados, SEM as etapas), não as etapas. Reaproveita o mesmo
 * `emitSerpentine`. O detalhe das etapas vive no diagrama POR-processo.
 *
 * Decisão (07/2026): consolidar os PROCESSOS na MESMA serpentina do processo (NÃO
 * uma lista vertical). Cards de processo em teal; o projeto vai no título (fora do SVG).
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

  if (ordenados.length === 0) {
    lines.push(`  ${safeId('EMPTY', 'projeto')}["${safeLabel(projeto?.name || 'Projeto')} · sem processos"]:::vazio`);
  } else {
    // Cada PROCESSO é um card da serpentina — só o nome numerado (sem etapas).
    const cards: SerpentineCard[] = ordenados.map((p, i) => ({
      id: safeId('PROC', p.id),
      label: `**${i + 1} · ${mdText(p.name)}**`,
      cls: 'procHead',
    }));
    emitSerpentine(lines, cards, 'PROC');
  }

  lines.push('  %% ===== estilos =====');
  lines.push('  classDef procHead fill:#0d9488,color:#fff,stroke:#0f766e,stroke-width:2px,font-weight:bold');
  STYLES.forEach(s => lines.push(s)); // classe 'vazio' p/ projeto sem processos
  return lines.join('\n');
}

// ═════════════════════════════════════════════════════════════════════════
//  COMPARATIVOS (Como Era × Como Ficou) — modelo por-cenário
//
//  Paridade no grão de PROCESSO; etapas independentes por cenário (colunas
//  despareadas, o TO-BE costuma ser mais enxuto). Reproduz, dentro do app, os
//  .mmd já validados (Etapas AS-IS×TO-BE e Consolidado Gargalo×Melhoria).
//  Não usa `.ficou` (que parearia por id) — recebe listas AS-IS e TO-BE cruas.
// ═════════════════════════════════════════════════════════════════════════

// Paleta validada (mesma linguagem visual dos .mmd): cinza tracejado = "Como Era",
// lime = "Como Ficou", teal = cabeçalho do processo.
const CMP_STYLES = [
  '  classDef rootHead fill:#f9fafb,color:#0d9488,stroke:#0d9488,stroke-width:2px,font-weight:bold',
  '  classDef procHead fill:#0f766e,color:#ffffff,stroke:#0d9488,stroke-width:2px,font-weight:bold',
  '  classDef tagAS    fill:#4b5563,color:#ffffff,stroke:#374151,stroke-width:1px,font-weight:bold',
  '  classDef tagTO    fill:#84cc16,color:#ffffff,stroke:#65a30d,stroke-width:1px,font-weight:bold',
  '  classDef etapaAS  fill:#f9fafb,color:#374151,stroke:#9ca3af,stroke-width:1.5px,stroke-dasharray:3 3',
  '  classDef etapaTO  fill:#f0fff4,color:#111827,stroke:#84cc16,stroke-width:1.5px',
  '  classDef gargalo  fill:#f9fafb,color:#374151,stroke:#9ca3af,stroke-width:1.5px,stroke-dasharray:3 3',
  '  classDef melhoria fill:#f0fff4,color:#111827,stroke:#84cc16,stroke-width:1.5px',
  '  classDef vazio    fill:#f1f5f9,color:#64748b,stroke:#cbd5e1,stroke-width:1px,stroke-dasharray:4 3',
];

/** Rótulo humano da execução (enum do banco → texto). */
function execLabel(execution?: string | null): string {
  switch ((execution || '').toLowerCase()) {
    case 'manual': return 'Manual';
    case 'semi_automatica': return 'Semi-automática';
    case 'automatica': return 'Automática';
    default: return execution ? mdText(execution) : '';
  }
}

/** Card de etapa do comparativo — a "pegada": só nome + execução + sistemas.
 *  `e.sistemas` já vem com NOMES resolvidos (enrichEtapas). */
function comparativoEtapaCard(e: Etapa, num: number): string {
  const linhas = [`**${num} · ${mdText(e.name)}**`];
  const exec = execLabel(e.execution);
  if (exec) linhas.push(exec);
  const sis = joinCap(e.sistemas || [], 3);
  if (sis) linhas.push(sis);
  return linhas.join('\n');
}

/** Emite 1 processo como bloco vertical: cabeçalho → colunas Como Era | Como Ficou. */
function emitProcessoComparativo(lines: string[], processo: Processo, idx: number, asis: Etapa[], tobe: Etapa[]): void {
  const pid = processo.id;
  const H = safeId('H', pid);
  const aT = safeId('AT', pid);
  const tT = safeId('TT', pid);
  lines.push(`  subgraph ${safeId('PR', pid)}[" "]`);
  lines.push('    direction TB');
  lines.push(`    ${H}["\`**${idx + 1} · ${mdText(processo.name)}** · ${asis.length} → ${tobe.length}\`"]:::procHead`);
  lines.push(`    ${aT}["\`Como Era\`"]:::tagAS`);
  lines.push(`    ${tT}["\`Como Ficou\`"]:::tagTO`);
  lines.push(`    ${H} --> ${aT}`);
  lines.push(`    ${H} --> ${tT}`);
  const coluna = (tag: string, etapas: Etapa[], prefixo: string, cls: string) => {
    if (etapas.length === 0) {
      const id = safeId(prefixo, `${pid}_vazio`);
      lines.push(`    ${id}["\`sem etapas\`"]:::vazio`);
      lines.push(`    ${tag} --> ${id}`);
      return;
    }
    let prev = tag;
    etapas.forEach((e, i) => {
      const id = safeId(prefixo, `${pid}_${e.id}`);
      lines.push(`    ${id}["\`${comparativoEtapaCard(e, i + 1)}\`"]:::${cls}`);
      lines.push(`    ${prev} --> ${id}`);
      prev = id;
    });
  };
  coluna(aT, asis, 'A', 'etapaAS');
  coluna(tT, tobe, 'T', 'etapaTO');
  lines.push('  end');
}

export interface BuildProcessComparisonInput {
  /** 1 processo (visão por-processo) ou vários (todos lado a lado). */
  processos: Processo[];
  /** Etapas AS-IS por processo — já enriquecidas (sistemas = nomes). */
  asisPorProcesso: Map<string, Etapa[]>;
  /** Etapas TO-BE por processo — já enriquecidas (sistemas = nomes). */
  tobePorProcesso: Map<string, Etapa[]>;
}

/**
 * Comparativo de ETAPAS (Como Era × Como Ficou). Cada processo é um bloco
 * vertical com duas colunas; os processos ficam lado a lado (fileira). Passe
 * `[processo]` para a visão por-processo ou todos para o consolidado.
 * Reproduz `Diagrama_P1_Etapas_AS-IS_x_TO-BE.mmd`.
 */
export function buildProcessComparison(input: BuildProcessComparisonInput): string {
  const { processos, asisPorProcesso, tobePorProcesso } = input;
  const lines: string[] = [];
  lines.push('%% Comparativo de Etapas (Como Era × Como Ficou) — gerado pelo MAPA');
  lines.push('flowchart LR');
  const ordenados = [...processos].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0) || a.name.localeCompare(b.name),
  );
  if (ordenados.length === 0) {
    lines.push(`  ${safeId('EMPTY', 'cmp')}["sem processos"]:::vazio`);
  }
  const boxes: string[] = [];
  ordenados.forEach((p, i) => {
    emitProcessoComparativo(lines, p, i, asisPorProcesso.get(p.id) || [], tobePorProcesso.get(p.id) || []);
    boxes.push(safeId('PR', p.id));
  });
  // Alinha os processos lado a lado (link invisível entre os subgraphs).
  for (let i = 1; i < boxes.length; i++) lines.push(`  ${boxes[i - 1]} ~~~ ${boxes[i]}`);
  lines.push('  %% ===== estilos =====');
  CMP_STYLES.forEach(s => lines.push(s));
  boxes.forEach(id => lines.push(`  style ${id} fill:none,stroke:none`));
  return lines.join('\n');
}

/** Card de gargalo/melhoria do consolidado. Teto de tamanho (defensivo) p/ o card
 *  não estourar caso o texto venha longo (ex.: melhoria ainda sem nome curto). */
function gmCard(prefixo: string, texto: string): string {
  const t = mdText(texto);
  const curto = t.length > 120 ? `${t.slice(0, 118).trimEnd()}…` : t;
  return `**${prefixo}** — ${curto}`;
}

export interface BuildProjectComparisonInput {
  projetoNome: string;
  /** Processos do projeto — só para filtrar os gargalos/melhorias vinculados. */
  processos: Processo[];
  gargalos: Gargalo[];
  melhorias: Melhoria[];
}

/**
 * Consolidado do PROJETO: um único card do projeto ramificando direto em
 * Gargalos (Como Era) | Melhorias (Como Ficou). Sem cards intermediários de
 * processo — visão executiva do projeto inteiro.
 */
export function buildProjectComparison(input: BuildProjectComparisonInput): string {
  const { projetoNome, processos, gargalos, melhorias } = input;
  const procIds = new Set(processos.map(p => p.id));
  // Ordena as duas colunas pela ordem do processo vinculado — assim gargalo e
  // melhoria do mesmo processo ficam na mesma linha (1:1 por processo no P1).
  const ordem = new Map(processos.map((p, i) => [p.id, p.order_index ?? i]));
  const ordenarPorProcesso = (vinc: string[]) =>
    Math.min(Infinity, ...(vinc || []).filter(id => procIds.has(id)).map(id => ordem.get(id) ?? Infinity));
  const gs = gargalos
    .filter(g => (g.processos || []).some(id => procIds.has(id)))
    .sort((a, b) => ordenarPorProcesso(a.processos) - ordenarPorProcesso(b.processos));
  const ms = melhorias
    .filter(m => (m.processos || []).some(id => procIds.has(id)))
    .sort((a, b) => ordenarPorProcesso(a.processos) - ordenarPorProcesso(b.processos));

  const lines: string[] = [];
  lines.push('%% Comparativo Consolidado do Projeto · Gargalo (Como Era) × Melhoria (Como Ficou) — gerado pelo MAPA');
  lines.push('flowchart TB');
  const ROOT = safeId('ROOT', projetoNome || 'projeto');
  const GA = safeId('GA', 'root');
  const ME = safeId('ME', 'root');
  lines.push(`  ${ROOT}["\`**${mdText(projetoNome)}**\`"]:::rootHead`);
  lines.push(`  ${GA}["\`Como Era\`"]:::tagAS`);
  lines.push(`  ${ME}["\`Como Ficou\`"]:::tagTO`);
  lines.push(`  ${ROOT} --> ${GA}`);
  lines.push(`  ${ROOT} --> ${ME}`);

  const coluna = <T,>(tag: string, itens: T[], prefixo: string, cls: string, card: (x: T) => string, vazio: string) => {
    if (itens.length === 0) {
      const id = safeId(prefixo, 'vazio');
      lines.push(`  ${id}["\`${vazio}\`"]:::vazio`);
      lines.push(`  ${tag} --> ${id}`);
      return;
    }
    let prev = tag;
    itens.forEach((x, i) => {
      const id = safeId(prefixo, `${i}`);
      lines.push(`  ${id}["\`${card(x)}\`"]:::${cls}`);
      lines.push(`  ${prev} --> ${id}`);
      prev = id;
    });
  };
  coluna(GA, gs, 'G', 'gargalo', (g) => gmCard('Gargalo', g.nome || g.descricao), 'sem gargalo mapeado');
  coluna(ME, ms, 'M', 'melhoria', (m) => gmCard('Melhoria', m.improvement_description), 'sem melhoria mapeada');

  lines.push('  %% ===== estilos =====');
  CMP_STYLES.forEach(s => lines.push(s));
  return lines.join('\n');
}
