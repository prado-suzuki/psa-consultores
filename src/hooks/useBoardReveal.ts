import { useEffect, useRef } from 'react';

export function useBoardReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const els = ref.current.querySelectorAll('[data-reveal]');
    els.forEach((el, i) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.animationDelay = `${i * 55}ms`;
      htmlEl.classList.add('fu');
    });
  }, []);

  return ref;
}
