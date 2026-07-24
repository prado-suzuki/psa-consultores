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

// Selo hexagonal OSG Work — sem caixa/fundo quadrado ao redor.
// `glowColor` alterna com o tema (o Sísifo permanece branco em ambos).
const WorkSeal = ({ glowColor }: { glowColor: string }) => (
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
      <g className="block dark:hidden">
        <WorkSeal glowColor="#0d9488" />
      </g>

      {/* VERSÃO DARK */}
      <g className="hidden dark:block">
        <WorkSeal glowColor="#00bfa5" />
      </g>
    </svg>
  );
};

export default OsgWorkIcon;
