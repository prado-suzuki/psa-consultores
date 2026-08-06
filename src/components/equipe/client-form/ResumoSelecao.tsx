// Resumo de uma seleção no formulário: quantidade em destaque, os nomes que
// couberem numa linha, e a lista inteira ao passar o mouse.
//
// Existe porque produtos e centros de custo têm o mesmo problema: a lista
// completa não cabe no formulário, mas esconder tudo atrás de um botão obriga a
// abrir o diálogo só para conferir. O meio-termo é a quantidade sempre visível,
// uma amostra do que couber, e o detalhe no hover.
//
// O corte dos nomes é feito em JS, e não só por CSS: a string com todos os nomes
// é larga o bastante para esticar o painel inteiro antes de qualquer `truncate`
// entrar em ação, e aí os campos da direita saem de alcance.
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** Tamanho máximo da amostra de nomes exibida na linha do formulário. */
const AMOSTRA_MAX = 90;

export interface ItemResumo {
  /** Nome exibido na amostra e no detalhe. */
  rotulo: string;
  /** Complemento do detalhe: percentual, horas. */
  detalhe?: string;
}

export interface ResumoSelecaoProps {
  itens: ItemResumo[];
  /** Palavra no singular. O plural sai com "s". */
  substantivo: string;
  /** Texto quando não há nada escolhido. */
  vazio: string;
  /** Linha extra no rodapé do detalhe, como o total do rateio. */
  rodape?: string;
}

export default function ResumoSelecao({ itens, substantivo, vazio, rodape }: ResumoSelecaoProps) {
  if (itens.length === 0) {
    return <p className="text-xs italic text-muted-foreground">{vazio}</p>;
  }

  const nomes = itens.map((i) => i.rotulo).join(', ');
  const amostra = nomes.length > AMOSTRA_MAX ? `${nomes.slice(0, AMOSTRA_MAX).trimEnd()}…` : nomes;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <p className="flex min-w-0 cursor-help items-baseline gap-1.5">
          <span className="shrink-0 text-sm font-bold text-foreground">
            {itens.length} {itens.length === 1 ? substantivo : `${substantivo}s`}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{amostra}</span>
        </p>
      </TooltipTrigger>
      {/* Maior e mais espaçada do que o padrão: aqui a tooltip não é uma dica
          curta, é a lista inteira que não coube no formulário, e precisa ser
          lida com calma. */}
      <TooltipContent side="bottom" align="start" className="max-w-md px-3 py-2.5">
        <ul className="space-y-1.5">
          {itens.map((item, idx) => (
            <li key={idx} className="flex items-baseline justify-between gap-4 text-sm leading-snug">
              <span className="min-w-0 break-words">{item.rotulo}</span>
              {item.detalhe && <span className="shrink-0 font-bold tabular-nums">{item.detalhe}</span>}
            </li>
          ))}
        </ul>
        {rodape && <p className="mt-2 border-t pt-2 text-sm font-bold">{rodape}</p>}
      </TooltipContent>
    </Tooltip>
  );
}
