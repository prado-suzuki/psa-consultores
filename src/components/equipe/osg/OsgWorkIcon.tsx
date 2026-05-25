import React from 'react';

interface OsgWorkIconProps {
  className?: string;
  size?: number;
}

const OsgWorkIcon: React.FC<OsgWorkIconProps> = ({ className = '', size = 64 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={`inline-block ${className}`}
    >
      <defs>
        <clipPath id="roundedSquareLight">
          <rect x="0" y="0" width="512" height="512" rx="64" ry="64" />
        </clipPath>
        <clipPath id="roundedSquareDark">
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

        <g clipPath="url(#roundedSquareLight)">
          {/* Duna de fundo — tons terrosos claros */}
          <path
            d="M -20 440 C 60 440, 80 380, 140 380 C 200 380, 220 300, 310 300 C 380 300, 400 360, 450 370 C 490 378, 520 400, 540 420 L 540 540 L -20 540 Z"
            fill="#d4a574"
            opacity="0.35"
          />

          {/* Olhos do Maker (Spice blue) */}
          <ellipse cx="298" cy="312" rx="4" ry="2.2" fill="#0d9488" opacity="0.85" />
          <ellipse cx="322" cy="312" rx="4" ry="2.2" fill="#0d9488" opacity="0.85" />

          {/* Grãos de spice */}
          <circle cx="200" cy="140" r="2" fill="#0d9488" opacity="0.3" />
          <circle cx="210" cy="135" r="1.2" fill="#0d9488" opacity="0.4" />
          <circle cx="180" cy="160" r="1.5" fill="#0d9488" opacity="0.2" />
          <circle cx="380" cy="310" r="2.5" fill="#0d9488" opacity="0.25" />
          <circle cx="390" cy="300" r="1.5" fill="#0d9488" opacity="0.35" />
          <circle cx="420" cy="330" r="2" fill="#0d9488" opacity="0.15" />
          <circle cx="240" cy="110" r="1.8" fill="#0d9488" opacity="0.25" />
          <circle cx="360" cy="180" r="1.3" fill="#0d9488" opacity="0.3" />

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

          {/* Sísifo empurrando a pedra — CENTRALIZADO NO HEXÁGONO */}
          <image
            href="/osg-work-sisyphus.png"
            x="116"
            y="116"
            width="280"
            height="280"
            preserveAspectRatio="xMidYMid meet"
            style={{ filter: 'invert(1)' }}
          />

          {/* Duna escura em primeiro plano — passa na frente do hexágono */}
          <path
            d="M -20 475 C 40 475, 70 435, 130 435 C 190 435, 210 365, 290 365 C 350 365, 380 415, 430 425 C 470 432, 510 445, 540 465 L 540 540 L -20 540 Z"
            fill="#b08d6e"
            opacity="0.85"
          />

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

        <g clipPath="url(#roundedSquareDark)">
          {/* Duna de fundo — tons âmbar suaves */}
          <path
            d="M -20 440 C 60 440, 80 380, 140 380 C 200 380, 220 300, 310 300 C 380 300, 400 360, 450 370 C 490 378, 520 400, 540 420 L 540 540 L -20 540 Z"
            fill="#c49a6c"
            opacity="0.25"
          />

          {/* Olhos do Maker (Spice blue) */}
          <ellipse cx="298" cy="312" rx="4" ry="2.2" fill="#00bfa5" opacity="0.8" />
          <ellipse cx="322" cy="312" rx="4" ry="2.2" fill="#00bfa5" opacity="0.8" />

          {/* Grãos de spice */}
          <circle cx="200" cy="140" r="2" fill="#00bfa5" opacity="0.25" />
          <circle cx="210" cy="135" r="1.2" fill="#00bfa5" opacity="0.35" />
          <circle cx="180" cy="160" r="1.5" fill="#00bfa5" opacity="0.2" />
          <circle cx="380" cy="310" r="2.5" fill="#00bfa5" opacity="0.2" />
          <circle cx="390" cy="300" r="1.5" fill="#00bfa5" opacity="0.3" />
          <circle cx="420" cy="330" r="2" fill="#00bfa5" opacity="0.12" />
          <circle cx="240" cy="110" r="1.8" fill="#00bfa5" opacity="0.2" />
          <circle cx="360" cy="180" r="1.3" fill="#00bfa5" opacity="0.25" />

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

          {/* Sísifo empurrando a pedra — CENTRALIZADO NO HEXÁGONO */}
          <image
            href="/osg-work-sisyphus.png"
            x="116"
            y="116"
            width="280"
            height="280"
            preserveAspectRatio="xMidYMid meet"
            style={{ filter: 'invert(1)' }}
          />

          {/* Duna escura em primeiro plano — passa na frente do hexágono */}
          <path
            d="M -20 475 C 40 475, 70 435, 130 435 C 190 435, 210 365, 290 365 C 350 365, 380 415, 430 425 C 470 432, 510 445, 540 465 L 540 540 L -20 540 Z"
            fill="#7a5a42"
            opacity="0.85"
          />

          {/* Brilho no topo do selo */}
          <circle cx="256" cy="40" r="9" fill="#00bfa5" opacity="0.1" />
          <circle cx="256" cy="40" r="2.5" fill="#00bfa5" opacity="0.45" />
        </g>
      </g>
    </svg>
  );
};

export default OsgWorkIcon;
