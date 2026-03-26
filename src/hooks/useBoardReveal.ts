import { useCallback, useRef } from 'react';

export function useBoardReveal() {
  const applied = useRef(new WeakSet<Element>());

  const ref = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const els = node.querySelectorAll('[data-reveal]');
    let idx = 0;
    els.forEach((el) => {
      if (applied.current.has(el)) return;
      applied.current.add(el);
      const htmlEl = el as HTMLElement;
      htmlEl.style.animationDelay = `${idx * 40}ms`;
      htmlEl.classList.add('fu');
      idx++;
    });
  }, []);

  return ref;
}
