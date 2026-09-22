import React from 'react';

import { TaxSeal } from '@/components/equipe/fiscal/TaxSeal';
import {
  TETRIS_BLOCO,
  TETRIS_PECA,
  TETRIS_RAIO,
} from '@/components/equipe/fiscal/taxTetrisGlyph';

interface TaxWorkIconProps {
  className?: string;
  size?: number;
}

/**
 * O selo do TAX Work: o mesmo hexágono do `TaxIcon`, com o Tetris no lugar do
 * porquinho. Selo e paleta vivem no `TaxSeal`; a cena vive no
 * `taxTetrisGlyph`, com o porquê da escolha escrito lá.
 */
const TetrisGlyph = ({ fill }: { fill: string }) => (
  <g fill={fill}>
    {TETRIS_PECA.map((bloco) => (
      <rect
        key={`${bloco.x}-${bloco.y}`}
        x={bloco.x}
        y={bloco.y}
        width={TETRIS_BLOCO}
        height={TETRIS_BLOCO}
        rx={TETRIS_RAIO}
      />
    ))}
  </g>
);

const TaxWorkIcon: React.FC<TaxWorkIconProps> = ({ className = '', size = 64 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    width={size}
    height={size}
    className={`inline-block ${className}`}
    role="img"
    aria-label="Tax Work"
  >
    {/* Mesma dobra clara/escura do `TaxIcon`: o glyph muda de tom, o selo não. */}
    <g className="block">
      <TaxSeal glowOpacity={0.12}>
        <TetrisGlyph fill="#ffffff" />
      </TaxSeal>
    </g>

    <g className="hidden">
      <TaxSeal glowOpacity={0.12}>
        <TetrisGlyph fill="#ffffff" />
      </TaxSeal>
    </g>
  </svg>
);

export default TaxWorkIcon;
