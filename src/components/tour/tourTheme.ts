// Tema do tour guiado (React Joyride v3), compartilhado pelas áreas.
//
// IMPORTANTE: o tooltip/overlay do Joyride é renderizado num portal em
// `document.body`, FORA do wrapper `.app-root`. Variável CSS escopada naquele
// wrapper NÃO chega ao portal — por isso os valores abaixo são literais, com uma
// exceção proposital: `--primary` vive no elemento raiz (`:root.tax-theme`,
// `:root.osg-theme`), então `hsl(var(--primary))` atravessa o portal e o tour
// sai com o acento da área em que está rodando, sem tema por módulo.

import type { ButtonType, Locale, Options, PartialDeep, Styles } from 'react-joyride';

// `showProgress` e `buttons` vivem em Options (não no top-level) na v3.
export const TOUR_OPTIONS: Partial<Options> = {
  primaryColor: 'hsl(var(--primary))',
  backgroundColor: '#ffffff',
  textColor: 'hsl(var(--slate-700))',
  arrowColor: '#ffffff',
  overlayColor: 'rgba(15,23,42,0.55)',
  // Acima da sidebar (1100/1200) e do Dialog do Radix (z-50), abaixo dos modais
  // próprios do MAPA (4000) — é o que permite tour DENTRO do modal de cadastro.
  zIndex: 3000,
  spotlightRadius: 10,
  showProgress: true,
  buttons: ['back', 'close', 'primary', 'skip'] as ButtonType[],
};

export const TOUR_STYLES: PartialDeep<Styles> = {
  tooltip: { borderRadius: 14, fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" },
  tooltipTitle: { fontSize: 16, fontWeight: 700, color: '#0d1c2e' },
  tooltipContent: { fontSize: 14, lineHeight: 1.55, color: 'hsl(var(--slate-700))' },
  buttonPrimary: { borderRadius: 8, fontWeight: 600 },
};

export const TOUR_LOCALE: Locale = {
  back: 'Voltar',
  close: 'Fechar',
  last: 'Concluir',
  next: 'Próximo',
  nextWithProgress: 'Próximo ({current}/{total})',
  skip: 'Pular',
};
