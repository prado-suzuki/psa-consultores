import React from 'react';
import { TaxSeal } from '@/components/equipe/fiscal/TaxSeal';
import {
  TAX_PIG_BODY_PATH,
  TAX_PIG_COIN_DY,
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
    {/* A moeda desce para pousar no lombo; o porquê está em `TAX_PIG_COIN_DY`. */}
    <g transform={`translate(0 ${TAX_PIG_COIN_DY})`}>
      <path d={TAX_PIG_COIN_PATH} />
    </g>
  </g>
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
      <g className="block">
        <TaxSeal glowOpacity={0.12}>
          <TaxGlyph fill="#f1f5f9" />
        </TaxSeal>
      </g>

      {/* VERSÃO DARK */}
      <g className="hidden">
        <TaxSeal glowOpacity={0.12}>
          <TaxGlyph fill="#e2e8f0" />
        </TaxSeal>
      </g>
    </svg>
  );
};

export default TaxIcon;
