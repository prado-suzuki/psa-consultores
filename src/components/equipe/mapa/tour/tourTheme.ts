// Tema do tour (React Joyride v3) para o Digital MAPA.
//
// IMPORTANTE: o tooltip/overlay do Joyride é renderizado num portal em
// `document.body`, FORA do wrapper `.app-root`. Logo, as variáveis CSS do MAPA
// (escopadas em `.app-root`) NÃO chegam ao portal — por isso a paleta abaixo
// usa valores LITERAIS (espelham os tokens de `mapa.css`).

import type { ButtonType, Locale, Options, PartialDeep, Styles } from 'react-joyride';

// `showProgress` e `buttons` vivem em Options (não no top-level) na v3.
export const TOUR_OPTIONS: Partial<Options> = {
  primaryColor: 'hsl(var(--primary))', // --accent-color (teal institucional)
  backgroundColor: '#ffffff', // --surface-lowest
  textColor: 'hsl(var(--slate-700))',
  arrowColor: '#ffffff',
  overlayColor: 'rgba(15,23,42,0.55)',
  zIndex: 3000, // acima da sidebar (1100/1200), abaixo dos modais (4000)
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
