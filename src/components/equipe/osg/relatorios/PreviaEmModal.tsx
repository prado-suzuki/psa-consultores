import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { FileBarChart2, Minus, Plus, Scan } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/equipe/osg/OsgDialog';
import { ButtonTooltip } from '@/components/ui/button-tooltip';
import { cn } from '@/lib/utils';

/**
 * A prévia de um relatório de tela, num modal que não cresce.
 *
 * MESMO MOLDE DO VISUALIZADOR DE DOCUMENTOS do Cadastro por Documento: a mesma
 * largura, o mesmo cabeçalho com título à esquerda e ações à direita, o corpo
 * rolável embaixo. Quem já abriu um contrato ali reconhece esta janela.
 *
 * ALTURA QUE ACOMPANHA O CONTEÚDO, e aí ele difere do visualizador. Lá a altura
 * é fixa porque o que entra é um iframe, que precisa de espaço reservado. Aqui
 * entra um organograma de 300px ou uma tabela de trinta linhas — com altura
 * fixa, o diagrama ficava no alto e sobrava meia tela vazia embaixo.
 *
 * ABRE AJUSTADO À LARGURA. O conteúdo mais largo desta tela é o organograma, que
 * passa de 1600px com uma dúzia de imóveis: abrir em 100% entregava o desenho
 * cortado e obrigava a rolar de lado para descobrir que havia mais. A janela
 * mede o conteúdo na primeira pintura e entra no zoom em que ele cabe inteiro.
 *
 * O ZOOM MEXE NO CONTEÚDO, NÃO NA JANELA — `transform: scale`, e não tamanho de
 * fonte: o SVG do organograma tem coordenadas em pixel, e mexer na fonte
 * esticaria só o texto, deixando os nomes vazando de caixas do mesmo tamanho.
 */
const PASSO = 0.1;
const MIN = 0.3;
const MAX = 2;

export function PreviaEmModal({
  aberta,
  onFechar,
  titulo,
  children,
}: {
  aberta: boolean;
  onFechar: () => void;
  titulo: string;
  children: ReactNode;
}) {
  const [zoom, setZoom] = useState(1);
  /** Depois que a pessoa mexe no zoom, o ajuste automático para de mandar. */
  const [manual, setManual] = useState(false);
  const caixaRef = useRef<HTMLDivElement>(null);
  const conteudoRef = useRef<HTMLDivElement>(null);

  /**
   * Mede SÓ em zoom 1, e é isso que impede a medição de morder o próprio rabo:
   * a largura do embrulho é `100/zoom`%, então medir depois de escalar devolveria
   * um número que muda com a resposta.
   *
   * Roda mais de uma vez de propósito — o relatório busca os dados depois de
   * montar, e a largura só existe quando o desenho chega.
   */
  const ajustar = useCallback(() => {
    if (manual) return;
    const caixa = caixaRef.current;
    const dentro = conteudoRef.current;
    if (!caixa || !dentro) return;

    const natural = dentro.scrollWidth;
    const disponivel = caixa.clientWidth;
    if (natural <= disponivel || natural === 0) return;

    setZoom(Math.max(MIN, Math.floor((disponivel / natural) * 100) / 100));
  }, [manual]);

  useEffect(() => {
    if (!aberta) {
      setZoom(1);
      setManual(false);
      return;
    }
    const dentro = conteudoRef.current;
    if (!dentro) return;

    const observador = new ResizeObserver(ajustar);
    observador.observe(dentro);
    return () => observador.disconnect();
  }, [aberta, ajustar]);

  const mexer = (proximo: number) => {
    setManual(true);
    setZoom(Math.min(MAX, Math.max(MIN, Math.round(proximo * 100) / 100)));
  };

  return (
    <Dialog open={aberta} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="flex max-h-[92vh] w-[94vw] max-w-[1400px] flex-col gap-0 p-0">
        <div className="flex shrink-0 items-center gap-2 border-b border-osg-100 px-5 py-3">
          <FileBarChart2 className="h-4 w-4 shrink-0 text-osg-600" aria-hidden />
          <DialogHeader className="min-w-0 flex-1 space-y-0 text-left">
            <DialogTitle className="min-w-0 truncate text-[14px] font-semibold text-osg-700">
              {titulo}
            </DialogTitle>
          </DialogHeader>

          <div className="mr-8 flex shrink-0 items-center gap-0.5 rounded-lg border border-osg-200 bg-osg-50/70 p-0.5">
            <BotaoDeZoom rotulo="Diminuir o conteúdo" onClick={() => mexer(zoom - PASSO)} desligado={zoom <= MIN}>
              <Minus className="h-3.5 w-3.5" aria-hidden />
            </BotaoDeZoom>
            <span className="w-11 text-center text-[11px] font-semibold tabular-nums text-osg-700">
              {Math.round(zoom * 100)}%
            </span>
            <BotaoDeZoom rotulo="Aumentar o conteúdo" onClick={() => mexer(zoom + PASSO)} desligado={zoom >= MAX}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
            </BotaoDeZoom>
            <BotaoDeZoom
              rotulo="Ajustar à largura"
              onClick={() => {
                setManual(false);
                setZoom(1);
              }}
              desligado={false}
            >
              <Scan className="h-3.5 w-3.5" aria-hidden />
            </BotaoDeZoom>
          </div>
        </div>

        <div ref={caixaRef} className="min-h-0 flex-1 overflow-auto bg-osg-50/40 p-5">
          {/* `origin-top-left` e a largura compensada: sem isso o conteúdo
              ampliado cresceria para os dois lados e a rolagem começaria no meio
              dele. Com a origem no canto, o que entra na tela primeiro é o começo
              do relatório. */}
          <div
            ref={conteudoRef}
            style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%` }}
            className="origin-top-left"
          >
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BotaoDeZoom({
  rotulo,
  onClick,
  desligado,
  children,
}: {
  rotulo: string;
  onClick: () => void;
  desligado: boolean;
  children: ReactNode;
}) {
  // Botão só de ícone: o `ButtonTooltip` dá o nome (`aria-label`) e o balão de
  // uma vez, que é o par que o `title` fazia mal — ver `ui/button-tooltip.tsx`.
  return (
    <ButtonTooltip text={rotulo}>
      <button
        type="button"
        onClick={onClick}
        disabled={desligado}
        aria-label={rotulo}
        className={cn(
          'rounded-md p-1.5 text-osg-600 transition-colors',
          'hover:bg-osg-100 hover:text-osg-700',
          'disabled:pointer-events-none disabled:opacity-35',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss',
        )}
      >
        {children}
      </button>
    </ButtonTooltip>
  );
}
