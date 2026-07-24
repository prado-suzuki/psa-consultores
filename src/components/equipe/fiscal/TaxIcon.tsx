import React from 'react';

interface TaxIconProps {
  className?: string;
  size?: number;
}

// Glyph do ícone Tax (SVG original em viewBox 0 0 1024 1024) — reposicionado e
// escalado para caber centralizado dentro do selo hexagonal (box 512×512).
// translate(146,150) leva o canto para dentro do hexágono; scale(0.215) reduz
// os 1024 do glyph para ~220px, deixando respiro nas bordas do selo.
const TaxGlyph = ({ fill }: { fill: string }) => (
  <g transform="translate(146, 150) scale(0.215)" fill={fill}>
    <path d="M966.895506 511.765441c-40.258881 0-53.564783-29.639748-60.772146-43.755945-18.636791-36.463288-48.105951-92.288368-99.581025-121.970764-19.788264 31.644163-27.720628 47.508892-35.610345 96.979551-31.644163-160.310524 27.294157-267.653326 35.82358-315.034276-58.000083 14.713256-142.697264 69.642747-170.119362 143.678148-14.244138-8.44413-56.891258-15.779434-69.557452-15.779435H418.453542A336.400483 336.400483 0 0 0 85.29424 597.059681c0 89.303069 43.116238 170.417892 113.356045 231.147391 10.022073 8.700012 30.492691 30.364749 23.626505 65.292741-6.866186 34.927991-18.594144 92.885428-18.594145 92.885427L389.325559 1023.530882s6.780892-27.123568 11.386781-56.891258c4.605889-29.76769 28.530923-33.989755 56.678023-31.345634 17.826496 1.620591 35.908875 2.942651 54.375078 2.942652 22.517679 0 44.56624-1.577943 66.103036-4.392654 12.5809-1.663238 37.486819-2.21765 43.24418 24.180917 5.714714 26.35592 13.092666 65.505976 13.092666 65.505977l185.642913-37.145642s-15.950023-73.950106-20.12944-96.425138c-4.179418-22.475032 12.282371-39.661822 20.342676-46.741244 27.422098-24.052976 50.280955-51.645662 62.392736-78.641289 7.25001-16.248553 32.113281-39.576527 67.126567-39.576528H1023.530882v-213.2356h-56.635376zM788.971721 639.706801a63.97068 63.97068 0 1 1 0.042647-127.984007A63.97068 63.97068 0 0 1 788.971721 639.706801z" />
    <path d="M112.076632 593.733206S0 619.065595 0 496.455125c0-82.010412 99.282496-91.606014 99.282496-28.232394C96.638374 448.477115 42.64712 447.112407 42.64712 490.441881c0 53.3089 76.594228 55.953022 76.594228-0.682354 39.022115-16.547083 25.844155 105.466328-7.164716 103.973679zM582.133189 213.2356c9.297072-19.447087 14.926492-40.983882 14.926492-63.97068a149.26492 149.26492 0 1 0-298.529841 0c0 22.986798 5.62942 44.523593 14.926493 63.97068h268.676856z" />
  </g>
);

// Selo hexagonal Tax — fundo teal (sem caixa/fundo quadrado ao redor).
// `glyphFill` alterna com o tema para manter contraste com o teal escuro.
const TaxSeal = ({ glyphFill, glowOpacity }: { glyphFill: string; glowOpacity: number }) => (
  <>
    {/* Sombra do selo */}
    <path
      d="M 256 40 L 443 148 L 443 364 L 256 472 L 69 364 L 69 148 Z"
      fill="#032630"
      opacity="0.2"
      transform="translate(0, 5)"
    />

    {/* Selo hexagonal/diamante — fundo teal (azulado, não verde) */}
    <path
      d="M 256 40 L 443 148 L 443 364 L 256 472 L 69 364 L 69 148 Z"
      fill="#0e4b5a"
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

    {/* Glyph Tax — CENTRALIZADO NO HEXÁGONO */}
    <TaxGlyph fill={glyphFill} />

    {/* Brilho no topo do selo */}
    <circle cx="256" cy="40" r="9" fill="#22d3ee" opacity={glowOpacity} />
    <circle cx="256" cy="40" r="2.5" fill="#22d3ee" opacity="0.6" />
  </>
);

const TaxIcon: React.FC<TaxIconProps> = ({ className = '', size = 64 }) => {
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
        <TaxSeal glyphFill="#f1f5f9" glowOpacity={0.18} />
      </g>

      {/* VERSÃO DARK */}
      <g className="hidden dark:block">
        <TaxSeal glyphFill="#e2e8f0" glowOpacity={0.14} />
      </g>
    </svg>
  );
};

export default TaxIcon;
