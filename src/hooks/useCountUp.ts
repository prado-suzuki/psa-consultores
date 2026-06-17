import { useEffect, useRef, useState } from 'react';

// Anima um número até o alvo via requestAnimationFrame com ease-out-expo:
// no mount conta de 0 ao alvo; quando o alvo muda, parte do valor exibido no
// momento (sem saltar). Respeita prefers-reduced-motion (vai direto ao alvo).
// Formatar o retorno fica a cargo do chamador (BRL, inteiro etc.).
export function useCountUp(target: number, durationMs = 650): number {
  const [value, setValue] = useState(0);
  const valueRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      valueRef.current = target;
      setValue(target);
      return;
    }
    const from = valueRef.current;
    if (from === target) return;

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const v = from + (target - from) * eased;
      valueRef.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}
