import React from 'react';
import {
  OSG_SEAL_HEX_PATH,
  OSG_SEAL_INNER_PATH,
  OSG_SISYPHUS_PATH,
  OSG_SISYPHUS_TRANSFORM,
} from '@/components/equipe/osg/osgWorkGlyph';

interface OsgWorkIconProps {
  className?: string;
  size?: number;
}

// Sísifo empurrando a pedra — path vetorizado (substitui o antigo PNG externo
// que causava flash ao carregar). Path, transform do potrace e paths do selo
// vivem em `osgWorkGlyph`, compartilhados com o OsgWorkLoader.
const SisyphusGlyph: React.FC = () => (
  <g transform={OSG_SISYPHUS_TRANSFORM} fill="#ffffff">
    <path d={OSG_SISYPHUS_PATH} />
  </g>
);

// Selo hexagonal OSG Work — sem caixa/fundo quadrado ao redor.
// `glowColor` alterna com o tema (o Sísifo permanece branco em ambos).
const WorkSeal = ({ glowColor }: { glowColor: string }) => (
  <>
    {/* Sombra do selo */}
    <path
      d={OSG_SEAL_HEX_PATH}
      fill="#0a1024"
      opacity="0.2"
      transform="translate(0, 5)"
    />

    {/* Selo hexagonal/diamante expandido */}
    <path
      d={OSG_SEAL_HEX_PATH}
      fill="#141a36"
      stroke="#c49a6c"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />

    {/* Borda interna decorativa */}
    <path
      d={OSG_SEAL_INNER_PATH}
      fill="none"
      stroke="#c49a6c"
      strokeWidth="1.5"
      opacity="0.4"
    />

    {/* Sísifo empurrando a pedra — CENTRALIZADO NO HEXÁGONO */}
    <SisyphusGlyph />

    {/* Brilho no topo do selo */}
    <circle cx="256" cy="40" r="9" fill={glowColor} opacity="0.12" />
    <circle cx="256" cy="40" r="2.5" fill={glowColor} opacity="0.5" />
  </>
);

const OsgWorkIcon: React.FC<OsgWorkIconProps> = ({ className = '', size = 64 }) => {
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
        <WorkSeal glowColor="#0d9488" />
      </g>

      {/* VERSÃO DARK */}
      <g className="hidden">
        <WorkSeal glowColor="#00bfa5" />
      </g>
    </svg>
  );
};

export default OsgWorkIcon;
