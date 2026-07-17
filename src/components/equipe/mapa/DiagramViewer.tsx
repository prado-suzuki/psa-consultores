import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { toast } from 'sonner';
import Modal from './Modal';

// Torna o SVG do mermaid bem-formado em XML (necessário pra abrir o .svg
// standalone e pra rasterizar em canvas → PNG). O mermaid pode emitir tags HTML
// (void) que são válidas em HTML mas quebram o parser XML: <br> sem fechamento
// e a entidade &nbsp; (indefinida em XML puro).
function toXmlSafeSvg(svg: string): string {
  return svg
    .replace(/<br\s*>/gi, '<br/>')
    .replace(/&nbsp;/g, ' ');
}

// Base64 URL-safe (sem padding) de um array de bytes — formato do hash do mermaid.live.
function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Monta a URL do mermaid.live (editor) com o diagrama já carregado. O editor lê o
// state (code + config) do hash: `#pako:<base64url(zlib-deflate(json))>`. Usa o
// CompressionStream nativo (deflate = zlib, mesmo formato do pako). Se indisponível,
// cai no formato `#base64:<base64url(json)>` (sem compressão), também aceito.
async function toMermaidLiveUrl(code: string): Promise<string> {
  const state = JSON.stringify({
    code,
    mermaid: '{"theme":"default"}',
    autoSync: true,
    updateDiagram: true,
    // Abre com pan & zoom ligado — o editor usa svg-pan-zoom com fit+center,
    // então o diagrama já aparece ajustado à tela (igual ao fit do preview do MAPA).
    panZoom: true,
  });
  const jsonBytes = new TextEncoder().encode(state);
  try {
    if (typeof CompressionStream !== 'undefined') {
      const cs = new CompressionStream('deflate');
      const writer = cs.writable.getWriter();
      void writer.write(jsonBytes);
      void writer.close();
      const buf = await new Response(cs.readable).arrayBuffer();
      return `https://mermaid.live/edit#pako:${bytesToBase64Url(new Uint8Array(buf))}`;
    }
  } catch {
    /* cai no fallback base64 abaixo */
  }
  return `https://mermaid.live/edit#base64:${bytesToBase64Url(jsonBytes)}`;
}

let mermaidInitialized = false;
function ensureMermaidInit() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    // 'strict' re-habilita o sanitizer do Mermaid (DOMPurify) — protege contra XSS
    // ao injetarmos o SVG via dangerouslySetInnerHTML.
    securityLevel: 'strict',
    // Labels via <text> SVG (não foreignObject/HTML) — exportação .svg válida em
    // XML e PNG rasterizável. Reforçado no topo e no flowchart.
    htmlLabels: false,
    theme: 'base',
    themeVariables: {
      fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
      fontSize: '14px',
      primaryColor: '#0d9488',
      primaryTextColor: '#0f172a',
      primaryBorderColor: '#0f766e',
      lineColor: '#64748b',
      secondaryColor: '#f8fafc',
      tertiaryColor: '#ffffff',
    },
    flowchart: {
      // htmlLabels:false força labels via <text> SVG — evita decodificação
      // de entidades HTML em labels controlados por usuário.
      htmlLabels: false,
      curve: 'basis',
      padding: 14,
    },
  });
  mermaidInitialized = true;
}

// Caixa (centro + meias-dimensões) de cada nó, lida do TEXTO do SVG acumulando os
// transforms dos <g> aninhados (cada linha da serpentina é um <g class="root"
// transform=...>). Determinístico — não depende do DOM/getCTM/timing. Chave = eid
// (id do mermaid sem o prefixo `flowchart-` e o sufixo `-<n>`).
function parseNodeBoxes(svg: string): Record<string, { cx: number; cy: number; hw: number; hh: number }> {
  const boxes: Record<string, { cx: number; cy: number; hw: number; hh: number }> = {};
  const stack: Array<{ x: number; y: number }> = [{ x: 0, y: 0 }];
  const tagRe = /<g\b([^>]*)>|<\/g>|<rect\b([^>]*?)\/?>/g;
  const attr = (s: string | null, n: string) => { const m = s?.match(new RegExp(`${n}="([^"]*)"`)); return m ? m[1] : null; };
  const translate = (s: string | null) => { const m = s?.match(/translate\(\s*([-\d.]+)[ ,]+([-\d.]+)/); return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : null; };
  let pending: { eid: string; cx: number; cy: number } | null = null;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(svg))) {
    if (m[0] === '</g>') { if (stack.length > 1) stack.pop(); continue; }
    if (m[1] !== undefined) { // <g ...>
      const at = m[1];
      const cur = stack[stack.length - 1];
      const t = translate(attr(at, 'transform'));
      const next = { x: cur.x + (t?.x ?? 0), y: cur.y + (t?.y ?? 0) };
      const id = attr(at, 'id');
      const cls = attr(at, 'class') ?? '';
      // O mermaid PREFIXA os ids com o id do render (`mermaid-svg-<ts>-flowchart-<eid>-<n>`),
      // então casamos `flowchart-` em QUALQUER posição, não só no início.
      if (cls.includes('node') && id?.includes('flowchart-')) {
        pending = { eid: id.replace(/^.*?flowchart-/, '').replace(/-\d+$/, ''), cx: next.x, cy: next.y };
      }
      stack.push(next);
      continue;
    }
    if (m[2] !== undefined && pending) { // primeiro <rect> do nó = container
      const w = parseFloat(attr(m[2], 'width') ?? '0');
      const h = parseFloat(attr(m[2], 'height') ?? '0');
      if (w > 0 && h > 0) { boxes[pending.eid] = { cx: pending.cx, cy: pending.cy, hw: w / 2, hh: h / 2 }; pending = null; }
    }
  }
  return boxes;
}

// Injeta as setas de "dobra" (etapa→etapa entre linhas da serpentina) no TEXTO do
// SVG, a partir dos metadados `%% FOLD a b` do código. O dagre não liga esses nós
// sem colapsar a serpentina, então desenhamos a seta em cotovelo por cima, já na
// posição real. Fica no state → aparece no viewer E nas exportações SVG/PNG.
function withFoldEdges(svg: string, code: string): string {
  const pairs = [...code.matchAll(/%%\s*FOLD\s+(\S+)\s+(\S+)/g)];
  if (pairs.length === 0) return svg;
  const boxes = parseNodeBoxes(svg);
  const paths: string[] = [];
  for (const [, a, b] of pairs) {
    const A = boxes[a]; const B = boxes[b];
    if (!A || !B) continue;
    const ay = A.cy + A.hh;      // base do card de origem
    const by = B.cy - B.hh;      // topo do card de destino
    const midY = (ay + by) / 2;  // cotovelo no meio vertical
    paths.push(`<path d="M ${A.cx} ${ay} L ${A.cx} ${midY} L ${B.cx} ${midY} L ${B.cx} ${by}" fill="none" stroke="#64748b" stroke-width="1.5" marker-end="url(#fold-arrow)"/>`);
  }
  if (paths.length === 0) return svg;
  const defs = '<defs class="fold-defs"><marker id="fold-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#64748b"/></marker></defs>';
  const inject = `${defs}<g class="fold-edges">${paths.join('')}</g>`;
  const idx = svg.lastIndexOf('</svg>');
  return idx === -1 ? svg : svg.slice(0, idx) + inject + svg.slice(idx);
}

export interface DiagramViewerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Código mermaid (entrada do renderizador). */
  code: string;
  /** Nome-base para download (sem extensão). */
  filename: string;
  /** Título exibido no header do modal. */
  title?: string;
}

const ZOOM_MIN = 0.1;   // 10%
const ZOOM_MAX = 3.5;   // 350%
const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

// Tamanho natural do diagrama a partir do viewBox (aceita offsets negativos/
// decimais — o mermaid às vezes emite `viewBox="-8 -8 W H"`; o regex antigo
// falhava e caía no default, bugando o zoom inicial).
function svgNaturalSize(svg: string): { w: number; h: number } {
  const m = svg.match(/viewBox="\s*[-\d.]+\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)"/i);
  return { w: m ? Math.abs(parseFloat(m[1])) || 1200 : 1200, h: m ? Math.abs(parseFloat(m[2])) || 600 : 600 };
}

// Prepara o SVG p/ o viewport: no <svg> raiz, remove max-width e width/height
// antigos e crava o tamanho NATURAL (px). Assim o zoom (transform scale) é
// previsível — o SVG tem tamanho fixo conhecido e o wrapper escala/move.
function prepSvg(svg: string, w: number, h: number): string {
  return svg.replace(/<svg\b[^>]*>/i, (tag) => {
    const t = tag
      .replace(/\swidth="[^"]*"/i, '')
      .replace(/\sheight="[^"]*"/i, '')
      .replace(/max-width:\s*[\d.]+px;?/gi, '');
    return t.replace(/<svg\b/i, `<svg width="${Math.round(w)}" height="${Math.round(h)}"`);
  });
}

export default function DiagramViewer({ isOpen, onClose, code, filename, title }: DiagramViewerProps) {
  const renderRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  // Ajusta o diagrama pra caber no container (fit) e centraliza o pan.
  const fitToContainer = (svgStr: string = svg) => {
    const cont = renderRef.current;
    if (!cont || !svgStr) return;
    const { w, h } = svgNaturalSize(svgStr);
    const z = clampZoom(Math.min((cont.clientWidth - 24) / w, (cont.clientHeight - 24) / h));
    setZoom(z);
    setPan({
      x: Math.max(8, (cont.clientWidth - w * z) / 2),
      y: Math.max(8, (cont.clientHeight - h * z) / 2),
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    ensureMermaidInit();
    setError('');
    setSvg('');
    let cancelled = false;
    // ID único para evitar colisão entre renders consecutivos
    const id = `mermaid-svg-${Date.now()}`;
    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (cancelled) return;
        // Desenha as setas de "dobra" (etapa→etapa) da serpentina por cima do SVG.
        const finalSvg = withFoldEdges(svg, code);
        setSvg(finalSvg);
        requestAnimationFrame(() => { if (!cancelled) fitToContainer(finalSvg); });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, code]);

  // Zoom com o rolo do mouse (listener nativo p/ poder chamar preventDefault).
  useEffect(() => {
    const el = renderRef.current;
    if (!el || !isOpen) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setZoom(z => clampZoom(z * factor));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isOpen, svg]);

  // ----- Downloads -----

  const downloadFile = (filename: string, content: string | Blob, mime?: string) => {
    const blob = typeof content === 'string'
      ? new Blob([content], { type: mime || 'text/plain;charset=utf-8' })
      : content;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadMmd = () => {
    downloadFile(`${filename}.mmd`, code, 'text/plain;charset=utf-8');
  };
  const handleDownloadSvg = () => {
    if (!svg) return;
    downloadFile(`${filename}.svg`, toXmlSafeSvg(svg), 'image/svg+xml;charset=utf-8');
  };
  const handleDownloadPng = async () => {
    if (!svg) return;
    try {
      // Converte SVG → canvas → PNG via Image + canvas.toBlob
      const safeSvg = toXmlSafeSvg(svg);
      const svgBlob = new Blob([safeSvg], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Falha ao carregar SVG no Image'));
        img.src = svgUrl;
      });

      // Tenta extrair dimensões do <svg>
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(safeSvg, 'image/svg+xml');
      const svgEl = svgDoc.documentElement;
      const viewBox = svgEl.getAttribute('viewBox') || '';
      const vbParts = viewBox.split(/\s+/).map(Number);
      const baseW = vbParts.length === 4 && !isNaN(vbParts[2]) ? vbParts[2] : img.naturalWidth || 1400;
      const baseH = vbParts.length === 4 && !isNaN(vbParts[3]) ? vbParts[3] : img.naturalHeight || 900;
      // upscale 2x para PNG nítido
      const scale = 2;

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(baseW * scale);
      canvas.height = Math.round(baseH * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas sem contexto 2D');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      await new Promise<void>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('toBlob retornou null'));
          downloadFile(`${filename}.png`, blob, 'image/png');
          resolve();
        }, 'image/png', 0.95);
      });

      URL.revokeObjectURL(svgUrl);
    } catch (err) {
      toast.error('Falha ao gerar PNG', { description: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleOpenMermaidLive = async () => {
    try {
      const url = await toMermaidLiveUrl(code);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error('Falha ao abrir no Mermaid Live', { description: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="modal" style={{ width: '96vw', maxWidth: 'none', height: '92vh', maxHeight: '92vh', padding: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12 }}>
          <h2 style={{ margin: 0, flex: 1 }}>{title || 'Diagrama do Processo'}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="btn-action-sm"
              style={{ fontSize: 20, lineHeight: 1, width: 36, height: 36, padding: 0 }}
              onClick={() => setZoom(z => clampZoom(z / 1.25))}
              title="Diminuir (ou role o mouse sobre o diagrama)"
            >−</button>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', minWidth: 52, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              className="btn-action-sm"
              style={{ fontSize: 20, lineHeight: 1, width: 36, height: 36, padding: 0 }}
              onClick={() => setZoom(z => clampZoom(z * 1.25))}
              title="Aumentar (ou role o mouse sobre o diagrama)"
            >+</button>
            <button
              type="button"
              className="btn-action-sm"
              onClick={() => fitToContainer()}
              title="Ajustar à tela"
              style={{ marginLeft: 4 }}
            >Ajustar</button>
          </div>
        </div>

        <div
          ref={renderRef}
          onMouseDown={(e) => { dragRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; }}
          onMouseMove={(e) => { if (dragRef.current) setPan({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y }); }}
          onMouseUp={() => { dragRef.current = null; }}
          onMouseLeave={() => { dragRef.current = null; }}
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            overflow: 'hidden',
            flex: 1,
            minHeight: 320,
            position: 'relative',
            cursor: 'grab',
          }}
        >
          {error ? (
            <div style={{ color: '#dc2626', fontSize: '0.85rem', padding: 12, textAlign: 'center' }}>
              <strong>Erro ao renderizar o diagrama:</strong>
              <pre style={{ marginTop: 6, fontSize: '0.75rem', color: '#7f1d1d', whiteSpace: 'pre-wrap' }}>{error}</pre>
            </div>
          ) : svg ? (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
              }}
              dangerouslySetInnerHTML={{ __html: prepSvg(svg, svgNaturalSize(svg).w, svgNaturalSize(svg).h) }}
            />
          ) : (
            <div style={{ color: '#64748b', fontSize: '0.85rem', padding: 24 }}>
              <div className="spinner" style={{ display: 'inline-block', marginRight: 8 }} />
              Renderizando diagrama...
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn-cancel" onClick={onClose}>Fechar</button>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn-action"
              onClick={handleDownloadMmd}
              title="Código-fonte Mermaid (.mmd)"
            >
              ⬇ Baixar .mmd
            </button>
            <button
              className="btn-action"
              onClick={handleDownloadSvg}
              disabled={!svg}
              title="SVG vetorial (escalável)"
            >
              ⬇ Baixar SVG
            </button>
            <button
              className="btn-save"
              onClick={handleOpenMermaidLive}
              disabled={!code}
              title="Abre o diagrama no editor mermaid.live, em nova guia, já carregado"
            >
              ↗ Abrir no Mermaid Live
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
