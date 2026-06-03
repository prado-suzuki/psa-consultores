// Tooltip de ajuda — dinâmico (hover + foco) e animado, posicionado via portal
// para nunca ser cortado por modais/overflow. Espelha o padrão de
// createPortal + useLayoutEffect já usado em Select.tsx.
//
// Uso:
//   <Tooltip text="...">{qualquer elemento}</Tooltip>   → envolve título/rótulo de leitura (sublinhado pontilhado + cursor de ajuda)
//   <DicaIcon text="..." />                              → ícone ⓘ ao lado de rótulos de formulário/filtro

import { useId } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useHoverPopover, type Pos } from './useHoverPopover';

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
  const id = useId();
  const { open, setOpen, pos, ref } = useHoverPopover();
  if (!text) return <>{children}</>;
  return (
    <span
      ref={ref}
      className={`has-dica ${className}`}
      tabIndex={0}
      aria-describedby={open ? id : undefined}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && pos && <Popover id={id} text={text} pos={pos} />}
    </span>
  );
}

// Ícone ⓘ discreto, para colar ao lado de rótulos de formulário/filtro.
export function DicaIcon({ text }: { text: string }) {
  const id = useId();
  const { open, setOpen, pos, ref } = useHoverPopover();
  if (!text) return null;
  return (
    <span
      ref={ref}
      className="dica-icon"
      role="img"
      tabIndex={0}
      aria-label={`Ajuda: ${text}`}
      aria-describedby={open ? id : undefined}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      {open && pos && <Popover id={id} text={text} pos={pos} />}
    </span>
  );
}

export default Tooltip;
