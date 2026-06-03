// Campo numérico decimal (horas, volume) que NÃO reformata enquanto se digita.
// Inputs controlados que aplicam toLocaleString a cada tecla impedem digitar
// números > casa decimal (o dígito cai na fração e é arredondado). Aqui, enquanto
// o campo está focado, exibe-se o texto cru digitado; o valor numérico é propagado
// via onChange e a exibição só é normalizada quando o campo perde o foco.

import { useState, type CSSProperties } from 'react';

interface Props {
  value: number;
  onChange: (n: number) => void;
  placeholder?: string;
  title?: string;
  className?: string;
  style?: CSSProperties;
  min?: number;
  max?: number;
}

/** Aceita vírgula ou ponto como separador decimal. */
function parse(str: string): number {
  return parseFloat(str.replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;
}

/** Exibe em pt-BR; 0 vira string vazia para o placeholder aparecer. */
function fmt(n: number): string {
  if (!n) return '';
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

export default function DecimalInput({ value, onChange, placeholder, title, className, style, min, max }: Props) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);

  const clamp = (n: number) => {
    let v = n;
    if (min != null && v < min) v = min;
    if (max != null && v > max) v = max;
    return v;
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      style={style}
      placeholder={placeholder}
      title={title}
      value={focused ? text : fmt(value)}
      onFocus={() => { setText(fmt(value)); setFocused(true); }}
      onBlur={() => {
        setFocused(false);
        // Aplica clamp também no blur para corrigir entradas fora de range
        if (min != null || max != null) {
          const clamped = clamp(parse(text));
          if (clamped !== value) onChange(clamped);
        }
      }}
      onChange={(e) => {
        setText(e.target.value);
        onChange(clamp(parse(e.target.value)));
      }}
    />
  );
}
