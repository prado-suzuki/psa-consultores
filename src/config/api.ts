// Configuração de URLs de API e tabelas por ambiente
// Detecta automaticamente se está em produção ou desenvolvimento

const PRODUCTION_HOSTNAMES = [
  "psa-consultores.lovable.app",
  "psaconsultores.com.br",
  "www.psaconsultores.com.br"
];

const LOCAL_HOSTNAMES = ["localhost", "127.0.0.1"];

const currentHostname = typeof window !== "undefined" ? window.location.hostname : "";

export const isProductionEnvironment =
  PRODUCTION_HOSTNAMES.includes(currentHostname);

export const isLocalEnvironment = LOCAL_HOSTNAMES.includes(currentHostname);

// URLs da API por ambiente
const API_URLS = {
  // Ambiente local (frontend e API rodando na maquina do desenvolvedor)
  local: "http://localhost:8000",
  // Ambiente de desenvolvimento (preview do Lovable)
  development: "https://psa-backend-api-456879351254.southamerica-east1.run.app",
  // Ambiente de produção (domínio publicado)
  production: "https://psa-backend-api-1010211821554.southamerica-east1.run.app",
};

// URL base da API (selecionada automaticamente)
export const API_BASE_URL = isLocalEnvironment
  ? API_URLS.local
  : isProductionEnvironment
    ? API_URLS.production
    : API_URLS.development;

// Helper para construir URLs completas
export const getApiUrl = (path: string) => `${API_BASE_URL}${path}`;

// Valores válidos para a coluna 'ambiente' nas tabelas cliente/contribuinte
export type Ambiente = 'prod' | 'dev';

// Ambiente atual baseado no hostname (usado para filtrar dados nas queries)
export const currentAmbiente: Ambiente = isProductionEnvironment ? 'prod' : 'dev';
