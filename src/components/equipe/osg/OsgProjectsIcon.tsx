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

          {/* Ícone de projetos (sitemap) — CENTRALIZADO NO HEXÁGONO */}
          <g transform="translate(122, 148) scale(0.42)">
            <path
              d="M384 320H256c-17.67 0-32 14.33-32 32v128c0 17.67 14.33 32 32 32h128c17.67 0 32-14.33 32-32V352c0-17.67-14.33-32-32-32zM192 32c0-17.67-14.33-32-32-32H32C14.33 0 0 14.33 0 32v128c0 17.67 14.33 32 32 32h95.72l73.16 128.04C211.98 300.98 232.4 288 256 288h.28L192 175.51V128h224V64H192V32zM608 0H480c-17.67 0-32 14.33-32 32v128c0 17.67 14.33 32 32 32h128c17.67 0 32-14.33 32-32V32c0-17.67-14.33-32-32-32z"
              fill="#f1f5f9"
            />
          </g>

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

          {/* Ícone de projetos (sitemap) — CENTRALIZADO NO HEXÁGONO */}
          <g transform="translate(122, 148) scale(0.42)">
            <path
              d="M384 320H256c-17.67 0-32 14.33-32 32v128c0 17.67 14.33 32 32 32h128c17.67 0 32-14.33 32-32V352c0-17.67-14.33-32-32-32zM192 32c0-17.67-14.33-32-32-32H32C14.33 0 0 14.33 0 32v128c0 17.67 14.33 32 32 32h95.72l73.16 128.04C211.98 300.98 232.4 288 256 288h.28L192 175.51V128h224V64H192V32zM608 0H480c-17.67 0-32 14.33-32 32v128c0 17.67 14.33 32 32 32h128c17.67 0 32-14.33 32-32V32c0-17.67-14.33-32-32-32z"
              fill="#e2e8f0"
            />
          </g>

          {/* Brilho no topo do selo */}
          <circle cx="256" cy="40" r="9" fill="#00bfa5" opacity="0.1" />
          <circle cx="256" cy="40" r="2.5" fill="#00bfa5" opacity="0.45" />
        </g>
      </g>
    </svg>
  );
};

export default OsgProjectsIcon;
