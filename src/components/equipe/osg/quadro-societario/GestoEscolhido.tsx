import { AjudaSocietaria } from './AjudaSocietaria';
import type { ChaveDaAjuda } from './ajudaSocietaria';

// O GESTO JÁ ESCOLHIDO, dentro do formulário que ele abriu.
//
// Depois que a escolha saiu do formulário e virou uma porta única, o formulário
// precisa dizer em que gesto o consultor está — senão quatro telas quase iguais
// (aporte, cessão, doação, redução) passam a depender da memória de qual botão
// foi apertado. Diz o nome, oferece a mesma ajuda do seletor e devolve o caminho
// de volta.
//
// "Trocar movimento" é ação TEXTUAL secundária de propósito: um segundo botão
// primário ao lado de "Registrar" competiria com a gravação no mesmo canto da
// janela. O descarte do draft é decidido por quem chama, pelo guard de
// alterações pendentes.

interface GestoEscolhidoProps {
  rotulo: string;
  ajuda: ChaveDaAjuda;
  /** Volta ao seletor. Ausente quando o formulário não foi aberto por ele. */
  onTrocar?: () => void;
  /** Durante o envio a troca fica indisponível: o draft já está a caminho. */
  disabled?: boolean;
}

export function GestoEscolhido({ rotulo, ajuda, onTrocar, disabled }: GestoEscolhidoProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-osg-200/80 bg-osg-50/40 px-3 py-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Movimento
      </span>
      <span className="text-sm font-semibold text-osg-700">{rotulo}</span>
      <AjudaSocietaria chave={ajuda} rotulo={rotulo} />
      {onTrocar && (
        <button
          type="button"
          onClick={onTrocar}
          disabled={disabled}
          className="ml-auto text-xs font-medium text-osg-700 underline-offset-2 hover:underline disabled:opacity-50"
        >
          Trocar movimento
        </button>
      )}
    </div>
  );
}
