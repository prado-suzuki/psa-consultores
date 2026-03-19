// Configuração de URLs de API e tabelas por ambiente
// Detecta automaticamente se está em produção ou desenvolvimento

const PRODUCTION_HOSTNAMES = [
  "psa-consultores.lovable.app",
  "psaconsultores.com.br",
  "www.psaconsultores.com.br"
];

export const isProductionEnvironment =
  typeof window !== "undefined" && PRODUCTION_HOSTNAMES.includes(window.location.hostname);

// URLs da API por ambiente
const API_URLS = {
  // Ambiente de desenvolvimento (preview do Lovable)
  development: "https://psa-backend-api-456879351254.southamerica-east1.run.app",
  // Ambiente de produção (domínio publicado)
  production: "https://psa-backend-api-1010211821554.southamerica-east1.run.app",
};

// URL base da API (selecionada automaticamente)
export const API_BASE_URL = isProductionEnvironment ? API_URLS.production : API_URLS.development;

// Helper para construir URLs completas
export const getApiUrl = (path: string) => `${API_BASE_URL}${path}`;

// Valores válidos para a coluna 'ambiente' nas tabelas cliente/contribuinte
export type Ambiente = 'producao' | 'desenvolvimento';
