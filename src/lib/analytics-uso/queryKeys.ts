import type { AnalyticsUsoFiltros } from './types';

export const ANALYTICS_USO_ROOT_KEY = ['analytics-uso'] as const;

export function normalizarFiltrosAnalytics(filtros: AnalyticsUsoFiltros) {
  return {
    inicio: filtros.inicio,
    fim: filtros.fim,
    clusterId: filtros.clusterId ?? null,
    usuario: filtros.usuario ?? null,
    ferramenta: filtros.ferramenta ?? null,
  } as const;
}

export const analyticsUsoKeys = {
  api: (principalId: string, filtros: AnalyticsUsoFiltros) =>
    [
      ...ANALYTICS_USO_ROOT_KEY,
      principalId,
      'api-consumo',
      normalizarFiltrosAnalytics(filtros),
    ] as const,
  arquivos: (principalId: string, filtros: AnalyticsUsoFiltros) =>
    [
      ...ANALYTICS_USO_ROOT_KEY,
      principalId,
      'arquivos',
      normalizarFiltrosAnalytics(filtros),
    ] as const,
};
