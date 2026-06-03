// Ícones SVG inline para o Wizard de ROI.
// Estilo Lucide: stroke-width 1.5, currentColor, sem fill (exceto status sólidos).
// Usado em status badges, ícones de categoria e affordances.

import type { SVGProps } from 'react';

export type RoiIconName =
  | 'check' | 'alert' | 'cross' | 'minus'
  | 'process' | 'team' | 'quality' | 'system'
  | 'edit' | 'externalLink' | 'info' | 'formula'
  | 'chevronLeft' | 'chevronRight' | 'arrowRight';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: RoiIconName;
  size?: number;
}

const PATHS: Record<RoiIconName, React.ReactNode> = {
  check: <polyline points="20 6 9 17 4 12" />,
  alert: (
    <>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    </>
  ),
  cross: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  minus: <line x1="5" y1="12" x2="19" y2="12" />,
  process: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M8 9h8" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </>
  ),
  team: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  quality: (
    <>
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M4.93 4.93l2.83 2.83" />
      <path d="M16.24 16.24l2.83 2.83" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <path d="M4.93 19.07l2.83-2.83" />
      <path d="M16.24 7.76l2.83-2.83" />
    </>
  ),
  system: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </>
  ),
  edit: (
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </>
  ),
  externalLink: (
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </>
  ),
  formula: (
    <>
      <path d="M4 7h6" />
      <path d="M4 17h6" />
      <path d="M14 7l6 10" />
      <path d="M14 17l6-10" />
    </>
  ),
  chevronLeft: <polyline points="15 18 9 12 15 6" />,
  chevronRight: <polyline points="9 18 15 12 9 6" />,
  arrowRight: (
    <>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </>
  ),
};

export function Icon({ name, size = 14, ...rest }: IconProps) {
  return (
    <svg
      className="roi-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

// Glifo sólido para status dots — círculo preenchido com símbolo branco.
// Usado pelos pequenos pontos coloridos em listas de categoria.
export function StatusGlyph({ status, size = 10 }: {
  status: 'ok' | 'warn' | 'crit' | 'zero';
  size?: number;
}) {
  const name: RoiIconName =
    status === 'ok'   ? 'check' :
    status === 'warn' ? 'alert' :
    status === 'crit' ? 'cross' : 'minus';
  return <Icon name={name} size={size} strokeWidth={2.4} />;
}
