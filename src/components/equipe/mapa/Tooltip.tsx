// Adaptadores de tooltip do MAPA sobre o componente shadcn/Radix global.
// Mantém a API histórica do módulo:
//   <Tooltip text="...">{conteúdo}</Tooltip>
//   <DicaIcon text="..." />

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  Tooltip as TooltipRoot,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Pos } from './useHoverPopover';

export function Popover({ id, text, pos, className = '' }: { id: string; text: string; pos: Pos; className?: string }) {
  return createPortal(
    <div
      id={id}
      role="tooltip"
      className={`tooltip-pop ${pos.openUp ? 'opens-up' : 'opens-down'}${className ? ` ${className}` : ''}`}
      style={{ position: 'absolute', top: pos.top, left: pos.left }}
    >
      {text}
    </div>,
    document.body,
  );
}

interface TooltipProps {
  text: string;
  children: ReactNode;
  className?: string;
}

// Envolve qualquer conteúdo (título, subtítulo, rótulo de leitura, cabeçalho).
export function Tooltip({ text, children, className = '' }: TooltipProps) {
  if (!text) return <>{children}</>;
  return (
    <TooltipProvider delayDuration={0}>
      <TooltipRoot>
        <TooltipTrigger asChild>
          <span className={`has-dica ${className}`} tabIndex={0}>
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent
          showArrow
          side="top"
          sideOffset={8}
          collisionPadding={12}
          className="z-[100] py-2 text-xs font-normal leading-snug normal-case tracking-normal shadow-lg"
        >
          {text}
        </TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  );
}

// Ícone ⓘ discreto, para colar ao lado de rótulos de formulário/filtro.
export function DicaIcon({ text }: { text: string }) {
  if (!text) return null;
  return (
    <TooltipProvider delayDuration={0}>
      <TooltipRoot>
        <TooltipTrigger asChild>
          <span
            className="dica-icon"
            role="img"
            tabIndex={0}
            aria-label={`Ajuda: ${text}`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </span>
        </TooltipTrigger>
        <TooltipContent
          showArrow
          side="top"
          sideOffset={8}
          collisionPadding={12}
          className="z-[100] py-2 text-xs font-normal leading-snug normal-case tracking-normal shadow-lg"
        >
          {text}
        </TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  );
}

// Tooltip para ícones em barras verticais / laterais (sidebar colapsada,
// handles de drag, toolbars). Posiciona o conteúdo ao lado ou abaixo do
// gatilho, seguindo o padrão side="right" para barras verticais e
// side="bottom" para ações inline.
interface IconTooltipProps {
  label: string;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function IconTooltip({ label, children, side = 'bottom' }: IconTooltipProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <TooltipRoot>
        <TooltipTrigger asChild>
          <span aria-label={label}>
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent
          showArrow
          side={side}
          sideOffset={8}
          collisionPadding={12}
          className="z-[100] px-2 py-1 text-xs font-normal leading-snug shadow-lg"
        >
          {label}
        </TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  );
}

export default Tooltip;
