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

const OsgProjectsIcon: React.FC<OsgProjectsIconProps> = ({ className = '', size = 64 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={`inline-block ${className}`}
    >
      <defs>
        <clipPath id="projRoundedSquareLight">
          <rect x="0" y="0" width="512" height="512" rx="64" ry="64" />
        </clipPath>
        <clipPath id="projRoundedSquareDark">
          <rect x="0" y="0" width="512" height="512" rx="64" ry="64" />
        </clipPath>
      </defs>

      {/* ============================================= */}
      {/* VERSÃO LIGHT                                  */}
      {/* ============================================= */}
      <g className="block dark:hidden">
        {/* Fundo quadrado com cantos arredondados */}
        <rect x="0" y="0" width="512" height="512" rx="64" ry="64" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="3" />
        <rect x="6" y="6" width="500" height="500" rx="58" ry="58" fill="none" stroke="#cbd5e1" strokeWidth="1.5" opacity="0.6" />

        <g clipPath="url(#projRoundedSquareLight)">
          {/* Sombra do selo */}
          <path
            d="M 256 40 L 443 148 L 443 364 L 256 472 L 69 364 L 69 148 Z"
            fill="#0a1024"
            opacity="0.12"
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
          <ProjectsGlyph fill="#f1f5f9" />

          {/* Brilho no topo do selo */}
          <circle cx="256" cy="40" r="9" fill="#0d9488" opacity="0.12" />
          <circle cx="256" cy="40" r="2.5" fill="#0d9488" opacity="0.5" />
        </g>
      </g>

      {/* ============================================= */}
      {/* VERSÃO DARK                                   */}
      {/* ============================================= */}
      <g className="hidden dark:block">
        {/* Fundo quadrado com cantos arredondados */}
        <rect x="0" y="0" width="512" height="512" rx="64" ry="64" fill="#0a1024" stroke="#1e293b" strokeWidth="3" />
        <rect x="6" y="6" width="500" height="500" rx="58" ry="58" fill="none" stroke="#141a36" strokeWidth="1.5" opacity="0.6" />

        <g clipPath="url(#projRoundedSquareDark)">
          {/* Sombra do selo */}
          <path
            d="M 256 40 L 443 148 L 443 364 L 256 472 L 69 364 L 69 148 Z"
            fill="#000000"
            opacity="0.35"
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
            opacity="0.35"
          />

          {/* Ícone de projetos — CENTRALIZADO NO HEXÁGONO */}
          <ProjectsGlyph fill="#e2e8f0" />

          {/* Brilho no topo do selo */}
          <circle cx="256" cy="40" r="9" fill="#00bfa5" opacity="0.1" />
          <circle cx="256" cy="40" r="2.5" fill="#00bfa5" opacity="0.45" />
        </g>
      </g>
    </svg>
  );
};

export default OsgProjectsIcon;
