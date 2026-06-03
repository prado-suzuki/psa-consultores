import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface Pos { top: number; left: number; openUp: boolean; }

// Estado e posicionamento do popover de hover/foco. Calcula a posição via
// getBoundingClientRect e mantém atualizada com scroll/resize. Genérico no
// elemento-âncora — use HTMLSpanElement (default), HTMLButtonElement etc.
export function useHoverPopover<T extends HTMLElement = HTMLSpanElement>() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const ref = useRef<T>(null);

  const recompute = () => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const openUp = r.top > 56;
    setPos({
      top: (openUp ? r.top : r.bottom) + window.scrollY,
      left: r.left + r.width / 2 + window.scrollX,
      openUp,
    });
  };

  useLayoutEffect(() => { if (open) recompute(); }, [open]);

  useEffect(() => {
    if (!open) return;
    const onMove = () => recompute();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return { open, setOpen, pos, ref };
}
