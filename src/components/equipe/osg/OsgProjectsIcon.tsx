import React from 'react';

interface OsgProjectsIconProps {
  className?: string;
  size?: number;
}

// Path do novo ícone (viewBox 0 -16 544 544) — usado dentro do selo hexagonal
const ProjectsGlyph = ({ fill }: { fill: string }) => (
  <g transform="translate(142, 148) scale(0.42)" fill={fill}>
    <path d="M146 32h380c9.9 0 18 8.1 18 18v108c0 9.9-8.1 18-18 18H146c-9.9 0-18-8.1-18-18V50c0-9.9 8.1-18 18-18zm14 32v80h352V64H160zM32 256v80h224v-80H32zm96 112v80h224v-80H128zM18 224h252c9.9 0 18 8.1 18 18v94h78c9.9 0 18 8.1 18 18v108c0 9.9-8.1 18-18 18H114c-9.9 0-18-8.1-18-18v-94H18c-9.9 0-18-8.1-18-18V242c0-9.9 8.1-18 18-18z" />
  </g>
);

// Selo hexagonal OSG — sem caixa/fundo quadrado ao redor.
// `glyphFill` e `glowColor` alternam com o tema.
const ProjectsSeal = ({ glyphFill, glowColor }: { glyphFill: string; glowColor: string }) => (
  <>
    {/* Sombra do selo */}
    <path
      d="M 256 40 L 443 148 L 443 364 L 256 472 L 69 364 L 69 148 Z"
      fill="#0a1024"
      opacity="0.2"
      transform="translate(0, 5)"
    />

    {/* Selo hexagonal/diamante expandido */}
    <path
      d="M 256 40 L 443 148 L 443 364 L 256 472 L 69 364 L 69 148 Z"
      fill="#141a36"
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

    {/* Ícone de projetos — CENTRALIZADO NO HEXÁGONO */}
    <ProjectsGlyph fill={glyphFill} />

    {/* Brilho no topo do selo */}
    <circle cx="256" cy="40" r="9" fill={glowColor} opacity="0.12" />
    <circle cx="256" cy="40" r="2.5" fill={glowColor} opacity="0.5" />
  </>
);

const OsgProjectsIcon: React.FC<OsgProjectsIconProps> = ({ className = '', size = 64 }) => {
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
        <ProjectsSeal glyphFill="#f1f5f9" glowColor="#0d9488" />
      </g>

      {/* VERSÃO DARK */}
      <g className="hidden dark:block">
        <ProjectsSeal glyphFill="#e2e8f0" glowColor="#00bfa5" />
      </g>
    </svg>
  );
};

export default OsgProjectsIcon;
