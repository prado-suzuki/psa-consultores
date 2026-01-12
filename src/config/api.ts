// Configuração de URLs de API e tabelas por ambiente
// Detecta automaticamente se está em produção ou desenvolvimento

export const isProductionEnvironment = typeof window !== "undefined" && 
  window.location.hostname === "psa-consultores.lovable.app";

// URLs da API por ambiente
const API_URLS = {
  // Ambiente de desenvolvimento (preview do Lovable)
  development: "https://psa-backend-api-456879351254.southamerica-east1.run.app",
  // Ambiente de produção (domínio publicado)
  production: "https://psa-backend-api-456879351254.southamerica-east1.run.app",
};

// URL base da API (selecionada automaticamente)
export const API_BASE_URL = isProductionEnvironment ? API_URLS.production : API_URLS.development;

// Helper para construir URLs completas
export const getApiUrl = (path: string) => `${API_BASE_URL}${path}`;

// Nomes das tabelas por ambiente
export const TABLE_NAMES = {
  cliente: isProductionEnvironment ? "cliente" : "cliente_dev",
  contribuinte: isProductionEnvironment ? "contribuinte" : "contribuinte_dev",
} as const;

// Helper para obter o nome da tabela correto para o ambiente
export const getTableName = (table: keyof typeof TABLE_NAMES): string => TABLE_NAMES[table];
