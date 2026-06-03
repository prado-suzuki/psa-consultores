import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { toast } from 'sonner';
import Modal from './Modal';

let mermaidInitialized = false;
function ensureMermaidInit() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
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
      htmlLabels: true,
      curve: 'basis',
      padding: 14,
    },
  });
  mermaidInitialized = true;
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

export default function DiagramViewer({ isOpen, onClose, code, filename, title }: DiagramViewerProps) {
  const renderRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [zoom, setZoom] = useState<number>(1);

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
        if (!cancelled) setSvg(svg);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, code]);

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
    downloadFile(`${filename}.svg`, svg, 'image/svg+xml;charset=utf-8');
  };
  const handleDownloadPng = async () => {
    if (!svg) return;
    try {
      // Converte SVG → canvas → PNG via Image + canvas.toBlob
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
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
      const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
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

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="modal" style={{ maxWidth: '95vw', width: '1100px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12 }}>
          <h2 style={{ margin: 0, flex: 1 }}>{title || 'Diagrama do Processo'}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              className="btn-action-sm"
              onClick={() => setZoom(z => Math.max(0.4, z - 0.2))}
              title="Diminuir zoom"
            >−</button>
            <span style={{ fontSize: '0.75rem', color: '#64748b', minWidth: 42, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              className="btn-action-sm"
              onClick={() => setZoom(z => Math.min(2.5, z + 0.2))}
              title="Aumentar zoom"
            >+</button>
            <button
              type="button"
              className="btn-action-sm"
              onClick={() => setZoom(1)}
              title="Resetar zoom"
              style={{ marginLeft: 4 }}
            >100%</button>
          </div>
        </div>

        <div
          ref={renderRef}
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 18,
            overflow: 'auto',
            maxHeight: '65vh',
            minHeight: 320,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
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
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                transition: 'transform 0.15s ease',
              }}
              dangerouslySetInnerHTML={{ __html: svg }}
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
              onClick={handleDownloadPng}
              disabled={!svg}
              title="PNG raster 2x (apresentações)"
            >
              ⬇ Baixar PNG
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
