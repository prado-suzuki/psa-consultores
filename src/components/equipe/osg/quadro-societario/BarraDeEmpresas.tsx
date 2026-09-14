import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Building2, ChevronLeft, ChevronRight, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';

// A barra que escolhe a empresa do quadro.
//
// Era um `TabsList` simples, e ele não aguentava o tamanho real do problema:
// um cliente tem dezenas de PJ (o maior da base tem 28 Proprietárias e
// Controladoras), e a fila de abas estourava a largura da página — a última
// aba ficava cortada na borda direita, sem barra de rolagem nem qualquer sinal
// de que havia mais empresa depois dela.
//
// Agora a fila ROLA, com um esmaecido em cada ponta que só aparece quando há o
// que ver daquele lado, e setas para quem não rola com trackpad. O sublinhado
// verde-musgo virou um traço ÚNICO que desliza da aba que sai para a que entra:
// é a mesma informação de antes (qual está ativa) e, de quebra, aponta para
// onde a atenção foi.
//
// Não usa Radix Tabs porque não há painel a controlar: o conteúdo de cada
// empresa é o mesmo componente remontado pelo `key`, e o papel semântico certo
// aqui é o de uma lista de botões de rádio — que é o que `radiogroup` diz.

export interface EmpresaDaBarra {
  id: string;
  denominacao: string | null;
  tipo_empresa: string | null;
}

const RÓTULO_DO_TIPO: Record<string, string> = {
  PR: 'Proprietária',
  CN: 'Controladora',
};

export const BarraDeEmpresas = ({ empresas, ativa, onEscolher }: {
  empresas: EmpresaDaBarra[];
  ativa: string;
  onEscolher: (id: string) => void;
}) => {
  const trilho = useRef<HTMLDivElement>(null);
  const botoes = useRef(new Map<string, HTMLButtonElement>());
  const [traco, setTraco] = useState<{ esquerda: number; largura: number } | null>(null);
  const [pontas, setPontas] = useState({ esquerda: false, direita: false });

  const medirPontas = useCallback(() => {
    const el = trilho.current;
    if (!el) return;
    setPontas({
      esquerda: el.scrollLeft > 4,
      direita: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  // O traço mede a aba ativa DENTRO do trilho, em coordenadas de conteúdo: ele
  // rola junto, então a rolagem não precisa remedi-lo.
  useLayoutEffect(() => {
    const botao = botoes.current.get(ativa);
    const el = trilho.current;
    if (!botao || !el) return;
    setTraco({ esquerda: botao.offsetLeft, largura: botao.offsetWidth });
    botao.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    medirPontas();
  }, [ativa, empresas, medirPontas]);

  useEffect(() => {
    medirPontas();
    const el = trilho.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(medirPontas);
    obs.observe(el);
    return () => obs.disconnect();
  }, [medirPontas]);

  const rolar = (sentido: 1 | -1) =>
    trilho.current?.scrollBy({ left: sentido * 280, behavior: 'smooth' });

  return (
    <div className="relative">
      {/* `relative` no próprio trilho, e não só no invólucro: é o que faz o
          traço deslizante ser posicionado em coordenadas de CONTEÚDO e rolar
          junto com as abas, e o que faz `offsetLeft` medir a partir daqui. */}
      <div
        ref={trilho}
        onScroll={medirPontas}
        role="radiogroup"
        aria-label="Empresas do cliente"
        className="relative flex gap-1 overflow-x-auto border-b border-osg-100 pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {empresas.map((e) => {
          const selecionada = e.id === ativa;
          const Icone = e.tipo_empresa === 'CN' ? Landmark : Building2;
          return (
            <button
              key={e.id}
              ref={(n) => {
                if (n) botoes.current.set(e.id, n);
                else botoes.current.delete(e.id);
              }}
              type="button"
              role="radio"
              aria-checked={selecionada}
              onClick={() => onEscolher(e.id)}
              className={cn(
                'group relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-md px-3 pb-2.5 pt-2',
                'text-sm font-semibold transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss/40',
                selecionada
                  ? 'bg-osg-50 text-osg-700'
                  : 'text-muted-foreground hover:bg-osg-50/60 hover:text-osg-700',
              )}
            >
              <Icone
                className={cn(
                  'h-3.5 w-3.5 shrink-0 transition-colors',
                  selecionada ? 'text-osg-moss' : 'text-muted-foreground/70 group-hover:text-osg-moss/70',
                )}
              />
              {e.denominacao}
              <span
                className={cn(
                  'rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors',
                  selecionada ? 'bg-osg-moss/12 text-osg-moss' : 'bg-osg-100/70 text-osg-700/70',
                )}
              >
                {RÓTULO_DO_TIPO[e.tipo_empresa ?? ''] ?? e.tipo_empresa}
              </span>
            </button>
          );
        })}

        {/* O traço da aba ativa: um só, deslizando entre elas. */}
        {traco && (
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-0 h-[3px] rounded-full bg-osg-moss transition-[left,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ left: traco.esquerda, width: traco.largura }}
          />
        )}
      </div>

      {/* Esmaecidos e setas: só existem do lado que ainda tem empresa escondida. */}
      {(['esquerda', 'direita'] as const).map((lado) => {
        const visivel = pontas[lado];
        const esquerda = lado === 'esquerda';
        const Seta = esquerda ? ChevronLeft : ChevronRight;
        return (
          <div
            key={lado}
            className={cn(
              'pointer-events-none absolute bottom-[3px] top-0 flex items-center transition-opacity duration-200',
              esquerda
                ? 'left-0 justify-start bg-gradient-to-r pl-1'
                : 'right-0 justify-end bg-gradient-to-l pr-1',
              'w-16 from-osg-canvas via-osg-canvas/80 to-transparent',
              visivel ? 'opacity-100' : 'opacity-0',
            )}
          >
            <button
              type="button"
              tabIndex={-1}
              aria-hidden={!visivel}
              onClick={() => rolar(esquerda ? -1 : 1)}
              className={cn(
                'rounded-full border border-osg-200 bg-background p-1 text-osg-700 shadow-sm transition-colors hover:bg-osg-50',
                visivel && 'pointer-events-auto',
              )}
            >
              <Seta className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
