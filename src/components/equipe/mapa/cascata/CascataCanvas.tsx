// Canvas da Cascata — "Impact Flow".
//
// Renderiza o CascataGraph como colunas de ondas (gargalo → origem → ondas
// seguintes) com cards HTML e conectores SVG bezier medidos em tempo real
// (offsets de layout, imunes a transforms de animação). Recursos:
//
//   • Entrada escalonada por onda (efeito cascata literal) + replay
//   • Conectores desenhados com animação pathLength + fluxo direcional
//   • Arestas de retorno (ciclos de atualização documental) em traço próprio
//   • Hover destaca o caminho conectado e esmaece o restante
//   • Zoom (− / % / + / ajustar) para caber na tela
//   • Expansão granular por card: docs a atualizar + etapas com motivo
//     (origem / consome doc / reexecução sequencial)

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  ChevronDown,
  CornerDownRight,
  FileInput,
  FileStack,
  Maximize2,
  Minus,
  Plus,
  Radio,
  RotateCcw,
} from 'lucide-react';
import {
  CASCATA_ROOT_ID,
  type CascataGraph,
  type CascataProcessNode,
} from '@/utils/cascataGraph';
import type { Gargalo } from '@/types';

interface MeasuredEdge {
  id: string;
  from: string;
  to: string;
  d: string;
  docNomes: string[];
  indireto: boolean;
  /** Aresta que volta para uma onda anterior (ciclo de atualização). */
  retorno: boolean;
  targetWave: number;
}

interface CascataCanvasProps {
  gargalo: Gargalo;
  graph: CascataGraph;
  expandedIds: Set<string>;
  onToggleProcess: (processId: string) => void;
}

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

function waveLabel(i: number): string {
  return i === 0 ? 'Origem do impacto' : `${i}ª onda`;
}

const clampScale = (s: number) => Math.min(1.5, Math.max(0.4, Math.round(s * 20) / 20));

export default function CascataCanvas({
  gargalo,
  graph,
  expandedIds,
  onToggleProcess,
}: CascataCanvasProps) {
  const reduceMotion = useReducedMotion();
  const [scale, setScale] = useState(1);
  const [replayKey, setReplayKey] = useState(0);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [paths, setPaths] = useState<MeasuredEdge[]>([]);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const nodeEls = useRef(new Map<string, HTMLElement>());
  const roRef = useRef<ResizeObserver | null>(null);

  const waveByProcess = useMemo(() => {
    const m = new Map<string, number>();
    graph.waves.forEach((col, wi) => col.forEach((n) => m.set(n.processId, wi)));
    return m;
  }, [graph]);

  // Vizinhança do nó em hover (para destacar caminho e esmaecer o resto)
  const hoverNeighbors = useMemo(() => {
    if (!hoverId) return null;
    const s = new Set<string>([hoverId]);
    for (const e of graph.edges) {
      if (e.from === hoverId) s.add(e.to);
      if (e.to === hoverId) s.add(e.from);
    }
    return s;
  }, [hoverId, graph]);

  const measure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // Pré-calcula posições de todos os nós uma única vez por chamada (evita
    // múltiplas forçadas de layout por aresta via offsetLeft/offsetTop repetidos).
    const posById = new Map<string, { x: number; y: number; w: number; h: number }>();
    nodeEls.current.forEach((el, id) => {
      let x = 0;
      let y = 0;
      let n: HTMLElement | null = el;
      while (n && n !== stage) {
        x += n.offsetLeft;
        y += n.offsetTop;
        n = n.offsetParent as HTMLElement | null;
      }
      posById.set(id, { x, y, w: el.offsetWidth, h: el.offsetHeight });
    });
    const next: MeasuredEdge[] = [];
    for (const e of graph.edges) {
      const f = posById.get(e.from);
      const t = posById.get(e.to);
      if (!f || !t) continue;
      const y1 = f.y + f.h / 2;
      const y2 = t.y + t.h / 2;
      // Retorno: destino à esquerda da origem (ciclo de atualização
      // documental, ex.: matrícula atualizada reabre o DP). Sai pela
      // borda esquerda e entra pela direita, com bezier espelhado.
      const retorno = t.x + t.w < f.x + f.w;
      let d: string;
      if (retorno) {
        const x1 = f.x;
        const x2 = t.x + t.w;
        const dx = Math.max(36, (x1 - x2) * 0.5);
        d = `M ${x1} ${y1} C ${x1 - dx} ${y1}, ${x2 + dx} ${y2}, ${x2} ${y2}`;
      } else {
        const x1 = f.x + f.w;
        const x2 = t.x;
        const dx = Math.max(36, (x2 - x1) * 0.5);
        d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
      }
      next.push({
        id: e.id,
        from: e.from,
        to: e.to,
        docNomes: e.docNomes,
        indireto: e.indireto,
        retorno,
        targetWave: waveByProcess.get(e.to) ?? 0,
        d,
      });
    }
    setPaths(next);
    setStageSize((prev) =>
      prev.w === stage.offsetWidth && prev.h === stage.offsetHeight
        ? prev
        : { w: stage.offsetWidth, h: stage.offsetHeight },
    );
  }, [graph, waveByProcess]);

  // Ref para measure: permite que o ResizeObserver estável chame sempre a versão
  // atual sem precisar ser recriado quando graph/waveByProcess mudam.
  const measureRef = useRef(measure);
  useLayoutEffect(() => { measureRef.current = measure; }, [measure]);

  useLayoutEffect(() => {
    measure();
  }, [measure, expandedIds, replayKey]);

  // ResizeObserver criado uma única vez — estável, não recria em cada expand/colapso.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => measureRef.current());
    });
    roRef.current = ro;
    ro.observe(stage);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      roRef.current = null;
    };
  }, []);

  const fitToView = useCallback(() => {
    const vp = viewportRef.current;
    const stage = stageRef.current;
    if (!vp || !stage || stage.offsetWidth === 0) return;
    setScale(clampScale((vp.clientWidth - 12) / stage.offsetWidth));
  }, []);

  const nodeRef = useCallback((id: string) => (el: HTMLElement | null) => {
    if (el) {
      nodeEls.current.set(id, el);
      roRef.current?.observe(el);
    } else {
      nodeEls.current.delete(id);
    }
  }, []);

  const cardTransition = (wave: number, idx: number) => ({
    delay: reduceMotion ? 0 : 0.12 + wave * 0.26 + Math.min(idx, 6) * 0.06,
    duration: reduceMotion ? 0.15 : 0.45,
    ease: EASE_OUT,
  });

  const totalOrigens = (gargalo.etapasOrigem ?? []).length;

  return (
    <div className="cascata-canvas-shell">
      <div className="cascata-toolbar" role="toolbar" aria-label="Controles do diagrama">
        <button
          type="button"
          className="casc-tool-btn"
          title="Reduzir zoom"
          aria-label="Reduzir zoom"
          onClick={() => setScale((s) => clampScale(s - 0.1))}
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          className="casc-tool-pct"
          title="Restaurar 100%"
          aria-label="Restaurar zoom para 100%"
          onClick={() => setScale(1)}
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          type="button"
          className="casc-tool-btn"
          title="Aumentar zoom"
          aria-label="Aumentar zoom"
          onClick={() => setScale((s) => clampScale(s + 0.1))}
        >
          <Plus size={15} />
        </button>
        <span className="casc-tool-sep" />
        <button
          type="button"
          className="casc-tool-btn"
          title="Ajustar à tela"
          aria-label="Ajustar diagrama à tela"
          onClick={fitToView}
        >
          <Maximize2 size={14} />
        </button>
        <button
          type="button"
          className="casc-tool-btn"
          title="Reproduzir animação da cascata"
          aria-label="Reproduzir animação da cascata"
          onClick={() => setReplayKey((k) => k + 1)}
        >
          <RotateCcw size={14} />
        </button>
      </div>

      <div className="cascata-viewport" ref={viewportRef}>
        <div
          style={{
            width: stageSize.w ? stageSize.w * scale : undefined,
            height: stageSize.h ? stageSize.h * scale : undefined,
          }}
        >
          <div
            key={replayKey}
            className="cascata-stage"
            ref={stageRef}
            style={{ transform: `scale(${scale})` }}
            onMouseLeave={() => setHoverId(null)}
          >
            <svg className="cascata-edges" width={stageSize.w || 1} height={stageSize.h || 1}>
              {paths.map((p) => {
                const active = hoverId !== null && (p.from === hoverId || p.to === hoverId);
                const dim = hoverId !== null && !active;
                const drawDelay = reduceMotion ? 0 : 0.3 + p.targetWave * 0.26;
                const tooltip = p.docNomes.length
                  ? `${p.retorno ? 'Ciclo de atualização — documentos: ' : 'Documentos: '}${p.docNomes.join(', ')}`
                  : p.indireto
                    ? 'Fluxo indireto (documento não rastreável)'
                    : 'Manifestação direta do gargalo';
                return (
                  <g
                    key={p.id}
                    className={`casc-edge${active ? ' is-active' : ''}${dim ? ' is-dim' : ''}${p.indireto ? ' is-indireto' : ''}${p.retorno ? ' is-retorno' : ''}`}
                  >
                    <title>{tooltip}</title>
                    <motion.path
                      className="casc-edge-base"
                      d={p.d}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ delay: drawDelay, duration: reduceMotion ? 0.1 : 0.5, ease: 'easeOut' }}
                    />
                    <motion.path
                      className="casc-edge-flow"
                      d={p.d}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.75 }}
                      transition={{ delay: drawDelay + 0.4, duration: 0.4 }}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Coluna raiz: o gargalo */}
            <div className="cascata-col cascata-col--root">
              <motion.div
                ref={nodeRef(CASCATA_ROOT_ID)}
                className={`casc-root${hoverNeighbors && !hoverNeighbors.has(CASCATA_ROOT_ID) ? ' is-dim' : ''}`}
                onMouseEnter={() => setHoverId(CASCATA_ROOT_ID)}
                onMouseLeave={() => setHoverId(null)}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05, duration: 0.4, ease: EASE_OUT }}
              >
                <div className="casc-root-top">
                  <span className="casc-root-pulse">
                    <AlertTriangle size={17} />
                  </span>
                  <span className="casc-root-label">Gargalo</span>
                </div>
                <div className="casc-root-nome">{gargalo.nome}</div>
                <div className="casc-root-meta">
                  <span>
                    <Radio size={11} />
                    {totalOrigens} {totalOrigens === 1 ? 'etapa-origem' : 'etapas-origem'}
                  </span>
                  {gargalo.clusterName && <span>{gargalo.clusterName}</span>}
                </div>
              </motion.div>
            </div>

            {/* Colunas de ondas */}
            {graph.waves.map((col, wi) => (
              <div className="cascata-col" key={`wave-${wi}`}>
                <motion.div
                  className="cascata-col-header"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: reduceMotion ? 0 : 0.1 + wi * 0.26, duration: 0.3 }}
                >
                  <span className="wave-dot" />
                  {waveLabel(wi)}
                  <span className="wave-count">{col.length}</span>
                </motion.div>

                {col.map((node: CascataProcessNode, idx) => {
                  const open = expandedIds.has(node.processId);
                  const dim = hoverNeighbors !== null && !hoverNeighbors.has(node.processId);
                  return (
                    <motion.div
                      key={node.processId}
                      ref={nodeRef(node.processId)}
                      className={`casc-node casc-node--${node.intensidade.toLowerCase()}${dim ? ' is-dim' : ''}`}
                      onMouseEnter={() => setHoverId(node.processId)}
                      onMouseLeave={() => setHoverId(null)}
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={cardTransition(wi, idx)}
                    >
                      <button
                        type="button"
                        className="casc-node-head"
                        onClick={() => onToggleProcess(node.processId)}
                        aria-expanded={open}
                        title={open ? 'Recolher etapas' : 'Expandir etapas afetadas'}
                      >
                        <span className="casc-node-nome">{node.nome}</span>
                        <ChevronDown size={16} className={`casc-chev${open ? ' open' : ''}`} />
                      </button>

                      <div className="casc-node-meta">
                        <span className={`casc-badge casc-badge--${node.intensidade.toLowerCase()}`}>
                          {node.intensidade}
                        </span>
                        <span className="casc-node-count">
                          {node.etapasAfetadas.length}/{node.etapasTotais} etapas
                        </span>
                        <span className="casc-node-pct">{Math.round(node.razao * 100)}%</span>
                      </div>

                      <div className="casc-progress">
                        <motion.div
                          className="casc-progress-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(4, Math.round(node.razao * 100))}%` }}
                          transition={{
                            delay: reduceMotion ? 0 : 0.35 + wi * 0.26,
                            duration: reduceMotion ? 0.15 : 0.6,
                            ease: EASE_OUT,
                          }}
                        />
                      </div>

                      {node.docsAfetados.length > 0 && (
                        <div
                          className="casc-node-docs"
                          title={`Docs a atualizar: ${node.docsAfetados.join(', ')}`}
                        >
                          <FileStack size={12} />
                          {node.docsAfetados.length}{' '}
                          {node.docsAfetados.length === 1 ? 'doc a atualizar' : 'docs a atualizar'}
                        </div>
                      )}

                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            className="casc-etapas-wrap"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.28, ease: 'easeInOut' }}
                          >
                            {node.docsAfetados.length > 0 && (
                              <div className="casc-docs">
                                {node.docsAfetados.map((nome) => (
                                  <span key={nome} className="casc-doc-tag">
                                    {nome}
                                  </span>
                                ))}
                              </div>
                            )}
                            <ul className="casc-etapas">
                              {node.etapasAfetadas.map((et) => (
                                <li
                                  key={et.id}
                                  className={`casc-etapa casc-etapa--${et.motivo}`}
                                >
                                  <span className="casc-etapa-num">{et.ordem || '–'}</span>
                                  <span className="casc-etapa-nome">{et.nome}</span>
                                  {et.motivo === 'origem' && (
                                    <span className="casc-origem-chip">
                                      <Radio size={10} />
                                      origem
                                    </span>
                                  )}
                                  {et.motivo === 'documento' && (
                                    <span
                                      className="casc-doc-chip"
                                      title={et.viaDocNome ? `Consome: ${et.viaDocNome}` : 'Consome documento alterado'}
                                    >
                                      <FileInput size={10} />
                                      consome doc
                                    </span>
                                  )}
                                  {et.motivo === 'sequencial' && (
                                    <span
                                      className="casc-seq-chip"
                                      title="Re-executa para regenerar os documentos seguintes do processo"
                                    >
                                      <CornerDownRight size={10} />
                                      reexecução
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
