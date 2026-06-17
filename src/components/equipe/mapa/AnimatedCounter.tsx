import { useEffect, useState } from 'react';
import { animate, useMotionValue, useTransform } from 'framer-motion';

interface AnimatedCounterProps {
  /** Valor-alvo. Se string não-numérica, é exibida sem animação. */
  value: number | string;
  /** Duração da contagem em segundos. */
  duration?: number;
  /** Formatador opcional para o valor (ex.: thousands, currency). */
  format?: (n: number) => string;
}

/**
 * Conta de 0 ao `value` com easing suave usando framer-motion.
 * Se `value` não for numérico, exibe a string como está.
 */
export default function AnimatedCounter({ value, duration = 0.8, format }: AnimatedCounterProps) {
  const target = typeof value === 'number' ? value : Number(value);
  const isNumeric = Number.isFinite(target);

  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, latest => Math.round(latest));
  const [display, setDisplay] = useState(isNumeric ? 0 : value);

  useEffect(() => {
    if (!isNumeric) {
      setDisplay(value);
      return;
    }
    const controls = animate(motionValue, target, { duration, ease: [0.16, 1, 0.3, 1] });
    const unsubscribe = rounded.on('change', latest => {
      setDisplay(format ? format(latest) : latest);
    });
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [target, duration, format, isNumeric, motionValue, rounded, value]);

  return <>{display}</>;
}
