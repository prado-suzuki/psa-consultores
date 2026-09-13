import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AJUDA_SOCIETARIA, type ChaveDaAjuda } from './ajudaSocietaria';

// O ÍCONE DE INFORMAÇÃO dos gestos societários: o rótulo escolhe, o ícone
// explica.
//
// A ajuda mora num botão PRÓPRIO, e não no item inteiro nem num `title=`, por
// três razões medidas nesta tela: `title` nativo não abre por teclado e não
// formata dois parágrafos; hover no item inteiro obriga a apontar para a opção
// que talvez não se queira escolher; e um botão dentro do `<label>` que alterna
// um checkbox dispararia o controle ao pedir ajuda. Por isso o consumidor
// coloca este componente FORA do label, como irmão do rótulo.
//
// O Escape fecha a ajuda ANTES do diálogo: o listener é de captura no
// documento, que roda antes do `DismissableLayer` do Radix (bolha) e interrompe
// a propagação. Sem isso, pedir ajuda dentro de um modal e apertar Escape
// fecharia o formulário inteiro, com o draft junto.

interface AjudaSocietariaProps {
  chave: ChaveDaAjuda;
  /** Nome do gesto: compõe o nome acessível "Sobre {rótulo}". */
  rotulo: string;
  className?: string;
}

export function AjudaSocietaria({ chave, rotulo, className }: AjudaSocietariaProps) {
  // DUAS aberturas, e não uma. `porPonteiro` é a do Radix (hover e foco), que
  // ele abre e fecha sozinho; `fixada` é a do clique, que sobrevive aos
  // fechamentos dele. Uma só variável não funciona: o gatilho do Radix fecha a
  // dica no pointerdown E no click, e o `Slot` roda o handler dele depois do
  // nosso sem olhar `defaultPrevented` — alternar um único estado no clique é
  // desfeito no mesmo evento, e a ajuda nunca abre no toque.
  const [porPonteiro, setPorPonteiro] = useState(false);
  const [fixada, setFixada] = useState(false);
  const aberta = porPonteiro || fixada;
  const ajuda = AJUDA_SOCIETARIA[chave];

  const fechar = () => {
    setFixada(false);
    setPorPonteiro(false);
  };

  useEffect(() => {
    if (!aberta) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      fechar();
    };
    document.addEventListener('keydown', aoTeclar, true);
    return () => document.removeEventListener('keydown', aoTeclar, true);
  }, [aberta]);

  return (
    <Tooltip open={aberta} onOpenChange={setPorPonteiro} delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Sobre ${rotulo}`}
          // `preventDefault` e `stopPropagation` são o que impede o clique de
          // marcar a opção de rádio ou alternar o interruptor ao lado: pedir
          // ajuda não é escolher.
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setFixada((v) => !v);
          }}
          className={cn(
            'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground',
            'transition-colors hover:bg-osg-50 hover:text-osg-700',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss/40',
            className,
          )}
        >
          <Info className="h-3.5 w-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        collisionPadding={12}
        // O wrapper global limita em 280px, largura que corta estes dois
        // parágrafos. Aqui a dica vai a 360px, sempre presa ao viewport, sem
        // alterar o wrapper para as outras telas.
        className="max-w-[min(360px,calc(100vw-2rem))] space-y-1.5 py-2 text-left text-xs font-normal leading-relaxed"
      >
        <p>
          <span className="font-semibold">No quadro:</span> {ajuda.quadro}
        </p>
        <p>
          <span className="font-semibold">No contrato:</span> {ajuda.contrato}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
