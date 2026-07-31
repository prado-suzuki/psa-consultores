import React from 'react';
import {
  TAX_PIG_BODY_PATH,
  TAX_PIG_COIN_PATH,
  TAX_PIG_TAIL_PATH,
} from '@/components/equipe/fiscal/taxPiggyGlyph';

interface TaxIconProps {
  className?: string;
  size?: number;
}

// Glyph do ícone Tax (paths em `taxPiggyGlyph`, viewBox original 0 0 1024 1024)
// — reposicionado e escalado para caber centralizado no selo hexagonal (512×512).
// translate(146,150) leva o canto para dentro do hexágono; scale(0.215) reduz
// os 1024 do glyph para ~220px, deixando respiro nas bordas do selo.
const TaxGlyph = ({ fill }: { fill: string }) => (
  <g transform="translate(146, 150) scale(0.215)" fill={fill}>
    <path d={TAX_PIG_BODY_PATH} />
    <path d={TAX_PIG_TAIL_PATH} />
    <path d={TAX_PIG_COIN_PATH} />
  </g>
);

// Selo hexagonal Tax — fundo teal (sem caixa/fundo quadrado ao redor).
// `glyphFill` alterna com o tema para manter contraste com o teal escuro.
const TaxSeal = ({ glyphFill, glowOpacity }: { glyphFill: string; glowOpacity: number }) => (
  <>
    {/* Sombra do selo */}
    <path
      d="M 256 40 L 443 148 L 443 364 L 256 472 L 69 364 L 69 148 Z"
      fill="#032630"
      opacity="0.2"
      transform="translate(0, 5)"
    />

    {/* Selo hexagonal/diamante — fundo teal (azulado, não verde) */}
    <path
      d="M 256 40 L 443 148 L 443 364 L 256 472 L 69 364 L 69 148 Z"
      fill="#0e4b5a"
      stroke="#c49a6c"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />

    {/* Borda interna decorativa */}
    <path
      d="M 256 60 L 425 158 L 425 354 L 256 452 L 87 354 L 87 158 Z"
      fill="none"
      stroke="#c49a6c"
      strokeWidth="1.5"
      opacity="0.4"
    />

    {/* Glyph Tax — CENTRALIZADO NO HEXÁGONO */}
    <TaxGlyph fill={glyphFill} />

    {/* Brilho no topo do selo */}
    <circle cx="256" cy="40" r="9" fill="#22d3ee" opacity={glowOpacity} />
    <circle cx="256" cy="40" r="2.5" fill="#22d3ee" opacity="0.6" />
  </>
);

const TaxIcon: React.FC<TaxIconProps> = ({ className = '', size = 64 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={`inline-block ${className}`}
    >
      {/* VERSÃO LIGHT */}
      <g className="block dark:hidden">
        <TaxSeal glyphFill="#f1f5f9" glowOpacity={0.18} />
      </g>

      {/* VERSÃO DARK */}
      <g className="hidden dark:block">
        <TaxSeal glyphFill="#e2e8f0" glowOpacity={0.14} />
      </g>
    </svg>
  );
};

export default TaxIcon;
