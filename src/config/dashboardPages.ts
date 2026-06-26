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

/**
 * Proporção (largura ÷ altura) da PÁGINA dos relatórios do Looker. O iframe é
 * renderizado em LARGURA CHEIA e a altura = largura ÷ proporção (rola na vertical
 * se preciso). Valor único global — ajuste aqui se a página dos relatórios mudar.
 * Tamanho nativo da página dos dashboards PSA: 1280×925 (Data Studio → Arquivo →
 * Configurações da página). Bate exato → relatório inteiro, sem scrollbar interno.
 */
export const DASHBOARD_ASPECT_RATIO = 1280 / 925;
