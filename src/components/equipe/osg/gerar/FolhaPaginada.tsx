import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TextoFormatado } from '@/components/equipe/osg/TextoFormatado';

// Prévia paginada no formato A4 (96 dpi), como uma página do Word: o texto que
// passa do miolo flui para a próxima página via colunas CSS — cada "coluna" é
// o miolo de uma página e o deslocamento horizontal escolhe a página visível.
//
// Mantido em componente próprio (usado só pelo estado 'pronto' da
// FolhaDocumento) para a paginação ser fácil de remover sem afetar o resto.

const FONTE_DOCUMENTO = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif";

const PAGINA_LARGURA = 794; // A4 em px @96dpi (21cm)
const PAGINA_ALTURA = 1123; // 29,7cm
const MARGEM_X = 88;
const MARGEM_Y = 84;
const MIOLO_LARGURA = PAGINA_LARGURA - MARGEM_X * 2;
const MIOLO_ALTURA = PAGINA_ALTURA - MARGEM_Y * 2;
// Vão entre colunas = soma das margens laterais: deslocar uma página inteira
// (miolo + vão) alinha o miolo seguinte exatamente na janela visível.
const VAO = MARGEM_X * 2;

interface FolhaPaginadaProps {
  titulo: string;
  texto: string;
}

export const FolhaPaginada = ({ titulo, texto }: FolhaPaginadaProps) => {
  const externoRef = useRef<HTMLDivElement>(null);
  const mioloRef = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);

  // A folha tem largura física fixa; em colunas mais estreitas que um A4,
  // escala para caber (como o zoom "largura da página" dos editores).
  useLayoutEffect(() => {
    const el = externoRef.current;
    if (!el) return;
    const medir = () => setEscala(Math.min(1, el.clientWidth / PAGINA_LARGURA));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Conta as páginas pelo overflow horizontal das colunas; refaz quando o
  // texto muda e quando as fontes carregam (a medida do texto muda junto).
  useLayoutEffect(() => {
    const medir = () => {
      const el = mioloRef.current;
      if (!el) return;
      const total = Math.max(1, Math.round((el.scrollWidth + VAO) / (MIOLO_LARGURA + VAO)));
      setTotalPaginas(total);
      setPagina((p) => Math.min(p, total - 1));
    };
    medir();
    document.fonts?.ready.then(medir);
  }, [texto]);

  return (
    <div ref={externoRef} className="min-w-0 space-y-4">
      <div className="overflow-hidden" style={{ height: PAGINA_ALTURA * escala }}>
        <div className="flex justify-center">
          <article
            className="shrink-0 rounded-sm border border-osg-200/70 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.06),0_16px_40px_-20px_rgba(68,52,40,0.35)] animate-osg-card-in motion-reduce:animate-none"
            style={{
              width: PAGINA_LARGURA,
              height: PAGINA_ALTURA,
              padding: `${MARGEM_Y}px ${MARGEM_X}px`,
              transform: `scale(${escala})`,
              transformOrigin: 'top center',
            }}
          >
            {/* Janela do miolo: mostra exatamente uma página por vez. */}
            <div className="overflow-hidden" style={{ width: MIOLO_LARGURA, height: MIOLO_ALTURA }}>
              <div
                ref={mioloRef}
                className="transition-transform duration-300 ease-out motion-reduce:transition-none"
                style={{
                  height: MIOLO_ALTURA,
                  columnWidth: MIOLO_LARGURA,
                  columnGap: VAO,
                  columnFill: 'auto',
                  transform: `translateX(-${pagina * (MIOLO_LARGURA + VAO)}px)`,
                  fontFamily: FONTE_DOCUMENTO,
                }}
              >
                <header className="mb-8 text-center">
                  <p className="font-sans text-[10px] font-bold uppercase tracking-[0.3em] text-osg-500">
                    Prévia do documento
                  </p>
                  <h3 className="mt-1.5 text-lg font-semibold text-slate-900">{titulo}</h3>
                  <span aria-hidden className="mx-auto mt-3 block h-[3px] w-12 rounded-full bg-osg-moss" />
                </header>
                <div className="whitespace-pre-wrap text-justify text-[15px] leading-[1.9] text-stone-800">
                  <TextoFormatado texto={texto} />
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>

      {totalPaginas > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="Páginas da prévia">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={pagina === 0}
            onClick={() => setPagina((p) => Math.max(0, p - 1))}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs tabular-nums text-slate-600">
            Página {pagina + 1} de {totalPaginas}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={pagina >= totalPaginas - 1}
            onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
      )}
    </div>
  );
};
