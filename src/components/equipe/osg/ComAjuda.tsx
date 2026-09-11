import type { ReactNode } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Rótulo com explicação no hover.
 *
 * **Vale só onde o rótulo é vocabulário de quem já sabe.** "Hierarquia",
 * "Vigência", "Alçada" e "Exceção" não dizem o efeito que têm; onde o texto da
 * tela já explica, tooltip vira ruído. A regra é da Patricia, em 04/09/2026: o
 * fluxo principal precisa ser compreensível sem tooltip, e o tooltip serve para
 * dúvida pontual, nunca para explicar a tela inteira.
 *
 * Nasceu dentro da tela de Órgãos (GOV-01) e saiu para cá quando a Matriz
 * precisou do mesmo, para as duas não divergirem no pontilhado nem no tamanho.
 */
export function ComAjuda({ texto, children }: { texto: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help border-b border-dotted border-muted-foreground/40">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-relaxed">{texto}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Ajuda de CAMPO de formulário: a bolinha com "i" ao lado do rótulo.
 *
 * **Duas formas para dois lugares, e não por gosto.** Em cabeçalho de tabela o
 * espaço é apertado e o pontilhado do `ComAjuda` cabe; ao lado de um rótulo de
 * campo o app inteiro usa o ícone, e é o que a pessoa já aprendeu a procurar.
 * A forma é a mesma do `FieldTooltip` da Digital, que 22 telas já usam.
 */
export function AjudaDoCampo({ texto }: { texto: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-3.5 w-3.5 shrink-0 cursor-help text-muted-foreground" />
      </TooltipTrigger>
      <TooltipPrimitive.Portal>
        <TooltipContent
          side="top"
          sideOffset={6}
          collisionPadding={12}
          className="z-[100] max-w-[280px] text-xs font-normal leading-relaxed"
        >
          {texto}
        </TooltipContent>
      </TooltipPrimitive.Portal>
    </Tooltip>
  );
}
