import React from 'react';

interface OsgProjectsIconProps {
  className?: string;
  size?: number;
}

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
            d="M 256 60 L 404 144 L 404 328 L 256 412 L 108 328 L 108 144 Z"
            fill="#0a1024"
            opacity="0.12"
            transform="translate(0, 5)"
          />

          {/* Selo hexagonal/diamante expandido */}
          <path
            d="M 256 60 L 404 144 L 404 328 L 256 412 L 108 328 L 108 144 Z"
            fill="#141a36"
            stroke="#c49a6c"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Borda interna decorativa */}
          <path
            d="M 256 78 L 388 154 L 388 318 L 256 394 L 124 318 L 124 154 Z"
            fill="none"
            stroke="#c49a6c"
            strokeWidth="1.5"
            opacity="0.4"
          />

          {/* Texto OSG — CENTRALIZADO NO HEXÁGONO */}
          <text
            x="256"
            y="228"
            fontFamily="Georgia, 'Times New Roman', serif"
            fontSize="72"
            fontWeight="bold"
            fill="#f1f5f9"
            textAnchor="middle"
            dominantBaseline="central"
            letterSpacing="2"
          >
            OSG
          </text>

          {/* Gráfico de projetos — 3 barras verticais crescentes */}
          <rect x="220" y="290" width="14" height="28" rx="3" fill="#c49a6c" opacity="0.9" />
          <rect x="242" y="278" width="14" height="40" rx="3" fill="#c49a6c" opacity="0.9" />
          <rect x="264" y="266" width="14" height="52" rx="3" fill="#c49a6c" opacity="0.9" />

          {/* Brilho no topo do selo */}
          <circle cx="256" cy="60" r="9" fill="#0d9488" opacity="0.12" />
          <circle cx="256" cy="60" r="2.5" fill="#0d9488" opacity="0.5" />
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
            d="M 256 60 L 404 144 L 404 328 L 256 412 L 108 328 L 108 144 Z"
            fill="#000000"
            opacity="0.35"
            transform="translate(0, 5)"
          />

          {/* Selo hexagonal/diamante expandido */}
          <path
            d="M 256 60 L 404 144 L 404 328 L 256 412 L 108 328 L 108 144 Z"
            fill="#141a36"
            stroke="#c49a6c"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Borda interna decorativa */}
          <path
            d="M 256 78 L 388 154 L 388 318 L 256 394 L 124 318 L 124 154 Z"
            fill="none"
            stroke="#c49a6c"
            strokeWidth="1.5"
            opacity="0.35"
          />

          {/* Texto OSG — CENTRALIZADO NO HEXÁGONO */}
          <text
            x="256"
            y="228"
            fontFamily="Georgia, 'Times New Roman', serif"
            fontSize="72"
            fontWeight="bold"
            fill="#e2e8f0"
            textAnchor="middle"
            dominantBaseline="central"
            letterSpacing="2"
          >
            OSG
          </text>

          {/* Gráfico de projetos — 3 barras verticais crescentes */}
          <rect x="220" y="290" width="14" height="28" rx="3" fill="#c49a6c" opacity="0.85" />
          <rect x="242" y="278" width="14" height="40" rx="3" fill="#c49a6c" opacity="0.85" />
          <rect x="264" y="266" width="14" height="52" rx="3" fill="#c49a6c" opacity="0.85" />

          {/* Brilho no topo do selo */}
          <circle cx="256" cy="60" r="9" fill="#00bfa5" opacity="0.1" />
          <circle cx="256" cy="60" r="2.5" fill="#00bfa5" opacity="0.45" />
        </g>
      </g>
    </svg>
  );
};

export default OsgProjectsIcon;
