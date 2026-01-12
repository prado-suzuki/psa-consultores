// Configuração de URLs de API por ambiente
// Detecta automaticamente se está em produção ou desenvolvimento

const isProduction = typeof window !== 'undefined' && 
  window.location.hostname === 'psa-consultores.lovable.app';

// URLs da API por ambiente
const API_URLS = {
  // Ambiente de desenvolvimento (preview do Lovable)
  development: 'https://psa-backend-api-456879351254.southamerica-east1.run.app',
  // Ambiente de produção (domínio publicado)
  production: 'https://psa-backend-api-456879351254.southamerica-east1.run.app',
};

// URL base da API (selecionada automaticamente)
export const API_BASE_URL = isProduction 
  ? API_URLS.production 
  : API_URLS.development;

// Helper para construir URLs completas
export const getApiUrl = (path: string) => `${API_BASE_URL}${path}`;

// Exportar flag de ambiente para debug
export const isProductionEnvironment = isProduction;
