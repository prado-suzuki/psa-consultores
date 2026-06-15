import { useEffect, useRef, useState, type RefObject } from 'react';

const ZONA = 90; // px da borda que disparam o scroll
const VEL_MAX = 22; // px por frame na borda extrema

/** Sobe a árvore até achar o ancestral que de fato rola na vertical. */
function acharScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * Enquanto um bloco é arrastado, rola o container quando o ponteiro chega às
 * bordas de cima/baixo da área visível. Cobre tanto o drag nativo (arrastar da
 * Biblioteca, via `dragover`) quanto o drag por ponteiro do framer-motion
 * (reordenar, sinalizado por `arrastandoPointer`).
 */
export function useAutoScrollNaBorda(arrastandoPointer: boolean, refAncora: RefObject<HTMLElement>) {
  // O drag nativo (HTML5) se auto-arma por dragstart/dragend na janela.
  const [arrastandoNativo, setArrastandoNativo] = useState(false);
  useEffect(() => {
    const armar = () => setArrastandoNativo(true);
    const desarmar = () => setArrastandoNativo(false);
    window.addEventListener('dragstart', armar);
    window.addEventListener('dragend', desarmar);
    window.addEventListener('drop', desarmar);
    return () => {
      window.removeEventListener('dragstart', armar);
      window.removeEventListener('dragend', desarmar);
      window.removeEventListener('drop', desarmar);
    };
  }, []);

  const ativo = arrastandoPointer || arrastandoNativo;
  const yRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ativo) return;

    const scroller = acharScrollParent(refAncora.current);
    const registrarY = (e: PointerEvent | DragEvent) => { yRef.current = e.clientY; };
    window.addEventListener('pointermove', registrarY);
    window.addEventListener('dragover', registrarY);

    const tick = () => {
      const y = yRef.current;
      if (y != null) {
        const topo = scroller ? scroller.getBoundingClientRect().top : 0;
        const base = scroller ? scroller.getBoundingClientRect().bottom : window.innerHeight;
        let delta = 0;
        if (y < topo + ZONA) delta = -VEL_MAX * (1 - Math.max(y - topo, 0) / ZONA);
        else if (y > base - ZONA) delta = VEL_MAX * (1 - Math.max(base - y, 0) / ZONA);
        if (delta) (scroller ?? window).scrollBy(0, delta);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', registrarY);
      window.removeEventListener('dragover', registrarY);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      yRef.current = null;
    };
  }, [ativo, refAncora]);
}
