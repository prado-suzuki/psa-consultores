import React from 'react';

interface OsgWorkIconProps {
  className?: string;
  size?: number;
}

// Sísifo empurrando a pedra — path vetorizado (substitui o antigo PNG externo que
// causava flash ao carregar). Coordenadas no sistema do potrace; o <g> wrapper
// reposiciona/escala para o box 280×280 centralizado no hexágono (x=116, y=116).
const SISYPHUS_PATH =
  'M1483 4499 c-116 -22 -223 -111 -263 -216 -53 -137 -20 -283 86 -383 79 -75 129 -95 239 -95 76 0 98 4 146 26 79 37 133 90 171 167 30 61 33 75 33 157 -1 109 -21 160 -92 236 -56 60 -117 93 -198 108 -65 12 -63 12 -122 0z M3475 4403 c-96 -15 -203 -50 -300 -98 -195 -97 -332 -234 -430 -430 -51 -102 -94 -241 -95 -305 -1 -24 -1 -25 -16 -5 -32 44 -69 77 -108 98 l-41 22 -656 0 -655 0 -37 -25 c-21 -14 -46 -43 -56 -65 -11 -22 -70 -258 -132 -525 l-113 -485 -4 -364 -4 -364 -156 -281 c-152 -274 -156 -283 -160 -349 -4 -58 0 -75 23 -123 30 -62 85 -108 160 -135 l44 -15 -191 -95 c-191 -95 -228 -121 -228 -166 0 -33 42 -73 78 -73 35 0 4352 2160 4383 2193 40 44 4 127 -56 127 -14 0 -130 -52 -257 -116 l-232 -116 61 66 c120 128 205 281 245 442 32 128 32 333 0 459 -44 175 -160 369 -290 487 -108 96 -267 182 -409 219 -77 20 -298 34 -368 22z m-747 -1356 c128 -274 363 -469 648 -538 96 -24 280 -31 384 -16 30 5 52 6 50 4 -3 -3 -371 -188 -819 -412 -693 -346 -813 -403 -808 -383 3 13 24 162 47 331 40 300 40 310 25 369 -25 99 -74 160 -168 210 -40 22 -55 23 -279 26 -131 2 -238 7 -238 12 0 5 27 125 60 268 33 143 60 263 60 266 0 3 170 6 378 6 240 0 391 4 416 11 55 15 112 55 138 97 l21 35 23 -101 c12 -56 40 -139 62 -185z m-1029 -1064 c-10 -76 -18 -168 -19 -206 0 -110 46 -184 146 -232 l48 -23 -443 -222 -444 -221 25 43 c120 208 313 569 324 606 10 31 14 101 14 219 l0 173 183 0 183 0 -17 -137z';

// translate(116,116) → canto do box; scale(280/512) → ajusta 512→280;
// translate(0,512) scale(0.1,-0.1) → desfaz o flip/escala 10× do potrace.
const SisyphusGlyph: React.FC = () => (
  <g
    transform="translate(116 116) scale(0.546875) translate(0 512) scale(0.1 -0.1)"
    fill="#ffffff"
  >
    <path d={SISYPHUS_PATH} />
  </g>
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
          <SisyphusGlyph />

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
          <SisyphusGlyph />

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
