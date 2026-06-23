/**
 * Chaves de `target_page` dos dashboards (tabela `dashboards`).
 *
 * Cada página consumidora (Board Relatórios, Área do Cliente, Digital DEV) pede
 * ao banco os dashboards cadastrados com a chave correspondente — é assim que o
 * cadastro (CRUD) sabe ONDE cada dashboard aparece. Mantenha em sincronia com o
 * Select da aba "Dashboards" (DashboardsTab) e com o argumento de
 * `useAccessibleDashboards(targetPage)` em cada consumidor.
 */
export const DASHBOARD_PAGES = [
  { key: 'board_relatorios', label: 'Board → Relatórios' },
  { key: 'cliente', label: 'Área do Cliente → Dashboards' },
  { key: 'dev_gerenciar_dados', label: 'Digital DEV → Gerenciar Dados' },
  { key: 'dev_perdcomp', label: 'Digital DEV → PERDCOMP' },
] as const;

export type DashboardPageKey = (typeof DASHBOARD_PAGES)[number]['key'];

export const DASHBOARD_PAGE_LABEL: Record<string, string> = Object.fromEntries(
  DASHBOARD_PAGES.map((p) => [p.key, p.label]),
);
