import React from 'react';
import {
  TAX_COIN,
  TAX_PIG_BODY_PATH,
  TAX_PIG_TAIL_PATH,
} from '@/components/equipe/fiscal/taxPiggyGlyph';

interface TaxLoaderProps {
  /** Lado do quadrado do loader, em px. Default 64. */
  size?: number;
  /** Cor do porquinho vem de `currentColor` — troque via classe de texto. */
  className?: string;
  /** Texto lido por leitores de tela. */
  label?: string;
}

// Layout do quadro (viewBox quadrado 1024×1024): o porquinho vai para o rodapé
// em 0.74 e o terço de cima fica livre para a queda da moeda. A moeda começa
// FORA do viewBox (translateY negativo) e o próprio SVG a recorta, então o
// loader nunca vaza para o layout em volta.
const PIG_TRANSFORM = 'translate(133 266) scale(0.74)';

// Ordem de pintura importa: a moeda é desenhada ANTES do corpo, então ao descer
// ela desaparece atrás do lombo — é isso que dá a leitura de "entrou no cofre",
// sem clipPath.
const COIN_FILL = '#e0b978';
const COIN_RING = '#c08f4e';
// Ciano do brilho: mesmo acento do glow do selo em `TaxIcon`, um tom mais fundo
// para não estourar sobre fundo claro.
const GLINT_FILL = '#0e9bb5';

// Estrelinha de 4 pontas do "ka-ching", centrada na origem.
const GLINT_PATH = 'M0 -30 L11 -11 30 0 11 11 0 30 -11 11 -30 0 -11 -11Z';

/**
 * Loader da área Tax: uma moeda cai girando dentro do cofrinho (o mesmo glyph do
 * `TaxIcon`), o porquinho absorve o impacto com um pulinho e dois brilhos
 * piscam. Ciclo de 1s (keyframes `tax-*` no tailwind.config).
 *
 * Com `prefers-reduced-motion` as animações são desligadas e a moeda para em
 * repouso sobre o lombo — o resultado é o ícone Tax estático.
 */
const TaxLoader: React.FC<TaxLoaderProps> = ({
  size = 64,
  className = 'text-[#0e4b5a] dark:text-slate-200',
  label = 'Carregando',
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1024 1024"
    width={size}
    height={size}
    role="status"
    aria-label={label}
    className={`inline-block ${className}`}
  >
    <g transform={PIG_TRANSFORM}>
      <g
        className="animate-tax-coin-fall motion-reduce:animate-none"
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      >
        <g
          className="animate-tax-coin-spin motion-reduce:animate-none"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
          <circle cx={TAX_COIN.cx} cy={TAX_COIN.cy} r={TAX_COIN.r} fill={COIN_FILL} />
          <circle
            cx={TAX_COIN.cx}
            cy={TAX_COIN.cy}
            r={TAX_COIN.r}
            fill="none"
            stroke={COIN_RING}
            strokeWidth="26"
          />
          <circle
            cx={TAX_COIN.cx}
            cy={TAX_COIN.cy}
            r={58}
            fill="none"
            stroke={COIN_RING}
            strokeWidth="22"
          />
        </g>
      </g>

      <g
        className="animate-tax-pig-bounce motion-reduce:animate-none"
        style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
        fill="currentColor"
      >
        <path d={TAX_PIG_BODY_PATH} />
        <path d={TAX_PIG_TAIL_PATH} />
      </g>

      <g fill={GLINT_FILL}>
        <path
          className="animate-tax-glint motion-reduce:animate-none"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          transform="translate(300 118) scale(1.15)"
          d={GLINT_PATH}
        />
        <path
          className="animate-tax-glint motion-reduce:animate-none"
          style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: '70ms' }}
          transform="translate(618 86) scale(0.8)"
          d={GLINT_PATH}
        />
      </g>
    </g>
  </svg>
);

export default TaxLoader;
