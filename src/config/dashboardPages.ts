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
  { key: 'board_relatorios', label: 'Board → Relatórios', path: '/equipe/board/relatorios' },
  // ⚠️ A TELA DESTA CHAVE NÃO EXISTE, E ISSO É DE PROPÓSITO. O bloco de
  // relatórios do Portal do Cliente foi escondido porque o dashboard não estava
  // pronto — decisão da dona do produto, não pendência. Nada em `src` consome
  // `target_page = 'cliente'`, então relatório cadastrado aqui não aparece para
  // ninguém, sem erro e sem aviso.
  //
  // Está escrito porque a ausência da tela parece defeito para quem chega: uma
  // varredura de rotas já reportou isto como bug. NÃO construa o bloco nem
  // remova a chave sem pedir — as duas coisas desfazem a decisão.
  //
  // O aviso não vai no `label` porque o `label` NÃO É RENDERIZADO: o seletor da
  // aba Dashboards e o cartão mostram `DASHBOARD_PAGE_PATH`, ou seja o caminho.
  // Marcar isso na tela é mudança no `DashboardsTab`, não aqui.
  { key: 'cliente', label: 'Área do Cliente → Dashboards', path: '/cliente' },
  { key: 'dev_gerenciar_dados', label: 'Digital DEV → Gerenciar Dados', path: '/equipe/dev/gerenciar-dados/dashboards' },
  { key: 'dev_perdcomp', label: 'Digital DEV → PERDCOMP', path: '/equipe/dev/perdcomp/dashboard' },
  // Gerenciais: o seletor dessas duas telas já traz o painel nativo de Clientes
  // e OS como primeira opção; o que for cadastrado aqui entra em seguida.
  // Cadastre com filter_type = "cluster": as telas prometem "do seu cluster".
  { key: 'tax_gerencial', label: 'Tax → Gerencial', path: '/equipe/tax/gerencial' },
  { key: 'osg_gerencial', label: 'OSG → Gerencial', path: '/equipe/osg/gerencial' },
] as const;

export type DashboardPageKey = (typeof DASHBOARD_PAGES)[number]['key'];

export const DASHBOARD_PAGE_LABEL: Record<string, string> = Object.fromEntries(
  DASHBOARD_PAGES.map((p) => [p.key, p.label]),
);

/** Caminho (rota) de cada página — mostrado igual à aba Páginas. */
export const DASHBOARD_PAGE_PATH: Record<string, string> = Object.fromEntries(
  DASHBOARD_PAGES.map((p) => [p.key, p.path]),
);

/**
 * Proporção (largura ÷ altura) da PÁGINA dos relatórios do Looker. O iframe é
 * renderizado em LARGURA CHEIA e a altura = largura ÷ proporção (rola na vertical
 * se preciso). Valor único global — ajuste aqui se a página dos relatórios mudar.
 * Tamanho nativo da página dos dashboards PSA: 1280×925 (Data Studio → Arquivo →
 * Configurações da página). Bate exato → relatório inteiro, sem scrollbar interno.
 */
export const DASHBOARD_ASPECT_RATIO = 1280 / 925;
