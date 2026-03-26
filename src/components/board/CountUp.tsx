import { useState, useEffect } from 'react';

interface CountUpProps {
  value: number | string;
  prefix?: string;
  suffix?: string;
  animate?: boolean;
  duration?: number;
}

export function CountUp({ value, prefix = '', suffix = '', animate = true, duration = 1000 }: CountUpProps) {
  const [display, setDisplay] = useState<number | string>(animate && typeof value === 'number' ? 0 : value);

  useEffect(() => {
    if (!animate || typeof value !== 'number') {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const target = value;
    let rafId: number;
    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * target));
      if (p < 1) rafId = requestAnimationFrame(tick);
    }
    const id = setTimeout(() => { rafId = requestAnimationFrame(tick); }, 100);
    return () => { clearTimeout(id); cancelAnimationFrame(rafId); };
  }, [value, animate, duration]);

  return <>{prefix}{typeof display === 'number' ? display.toLocaleString('pt-BR') : display}{suffix}</>;
}
