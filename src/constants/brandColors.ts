/**
 * PSA Consultores Brand Colors
 * Paleta oficial para uso em gráficos, charts e componentes
 */

// Cores principais da marca PSA
export const BRAND_COLORS = {
  // Teal - Cor Principal
  teal: {
    primary: '#0d9488',    // Teal 500 - Principal
    light: '#5eead4',      // Teal 300 - Destaque
    dark: '#0f766e',       // Teal 700 - Escuro
    muted: '#99f6e4',      // Teal 200 - Suave
  },
  
  // Gray - Texto e Fundos
  gray: {
    dark: '#374151',       // Gray 700 - Texto principal
    medium: '#6b7280',     // Gray 500 - Texto secundário
    light: '#f3f4f6',      // Gray 100 - Fundo
    muted: '#9ca3af',      // Gray 400 - Muted
  },
  
  // Cores semânticas (manter para status)
  semantic: {
    success: '#10b981',    // Emerald 500
    warning: '#f59e0b',    // Amber 500
    error: '#ef4444',      // Red 500
    info: '#3b82f6',       // Blue 500
  }
};

// Paleta para gráficos (ordem de uso)
export const CHART_COLORS = [
  '#0d9488', // Teal Primary
  '#5eead4', // Teal Light
  '#0f766e', // Teal Dark
  '#374151', // Gray Dark
  '#6b7280', // Gray Medium
  '#99f6e4', // Teal Muted
];

// Cores para gráficos de status (barras de volume, etc)
export const STATUS_CHART_COLORS = {
  pending: '#6b7280',      // Gray Medium - A Fazer
  in_progress: '#5eead4',  // Teal Light - Em Progresso
  completed: '#0d9488',    // Teal Primary - Concluído
};

// Cores para gráficos de linha
export const LINE_CHART_COLORS = {
  primary: '#0d9488',
  secondary: '#5eead4',
  tertiary: '#0f766e',
};
