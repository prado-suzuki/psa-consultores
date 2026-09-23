/**
 * Rótulos e cores das categorias de páginas (page_permissions.category).
 * Centralizado para reuso entre a aba Páginas e a aba Usuários do
 * Controle de Acessos.
 */
export const PAGE_CATEGORY_LABELS: Record<string, string> = {
  rotina: 'Digital Rotina',
  gestao: 'Gestão',
  geral: 'Geral',
  tax: 'Tax',
  projetos: 'Projetos',
  fiscal: 'Fiscal',
  osg: 'OSG',
  auditoria: 'Auditoria',
  juridico: 'Jurídico',
  board: 'Board',
  fixos: 'Fixos',
};

export const PAGE_CATEGORY_COLORS: Record<string, string> = {
  rotina: 'bg-primary/15 text-primary border-primary/20',
  gestao: 'bg-primary/5 text-primary border-primary/15',
  geral: 'bg-muted text-muted-foreground border-border',
  tax: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  projetos: 'bg-blue-100 text-blue-700 border-blue-200',
  fiscal: 'bg-amber-100 text-amber-700 border-amber-200',
  osg: 'bg-purple-100 text-purple-700 border-purple-200',
  auditoria: 'bg-area-4/15 text-area-4 border-area-4/25',
  juridico: 'bg-area-8/15 text-area-8 border-area-8/25',
  board: 'bg-rose-100 text-rose-700 border-rose-200',
  fixos: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

// Prefixo visual aplicado em /equipe/acessos para refletir a hierarquia pretendida
// das rotas. As URLs reais em `page_path` ainda são `/equipe/X`; a mudança é só
// de apresentação até a migração das rotas de verdade.
//
// A entrada `dev` saiu em 22/09/2026, e por ter dado certo: a migração de verdade
// aconteceu. As páginas do Digital Dev foram para `/equipe/tax/work` e para a
// categoria `tax`, então reescrever caminho nenhum para `/equipe/digital/dev`
// mostraria um endereço que nunca existiu. As quatro entradas `dev` deste arquivo
// saíram juntas: sem página na categoria, rótulo e cor não têm o que pintar.
//
// ATENÇÃO: `'dev'` continua vivo em `estrutura_areas.page_categories`, que o
// Board lê para saber qual área absorve o trabalho da Digital (ver
// `BOARD_AREAS`). É outra coisa com o mesmo nome, e não se limpa junto.
export const CATEGORY_DISPLAY_PREFIX: Record<string, { from: string; to: string }> = {
  rotina: { from: '/equipe', to: '/equipe/digital/rotina' },
};

// Agrupamento visual em /equipe/acessos: mapeia categorias para um "grupo de
// exibição" único (a `rotina` aparece sob um bloco rotulado "Digital").
// Categorias sem entrada aqui usam o próprio nome como grupo.
export const CATEGORY_TO_GROUP: Record<string, string> = {
  rotina: 'digital',
};

const GROUP_LABELS: Record<string, string> = {
  digital: 'Digital',
};

const GROUP_COLORS: Record<string, string> = {
  digital: 'bg-primary/15 text-primary border-primary/20',
};

export const getCategoryLabel = (category: string): string =>
  PAGE_CATEGORY_LABELS[category] ?? category;

export const getCategoryColor = (category: string): string =>
  PAGE_CATEGORY_COLORS[category] ?? 'bg-foreground/[0.05] text-muted-foreground border-border';

export const getGroupKey = (category: string): string =>
  CATEGORY_TO_GROUP[category] ?? category;

export const getGroupLabel = (group: string): string =>
  GROUP_LABELS[group] ?? getCategoryLabel(group);

export const getGroupColor = (group: string): string =>
  GROUP_COLORS[group] ?? getCategoryColor(group);

export const getDisplayPath = (category: string, pagePath: string): string => {
  const rule = CATEGORY_DISPLAY_PREFIX[category];
  if (!rule) return pagePath;
  if (pagePath === rule.from) return rule.to;
  if (pagePath.startsWith(rule.from + '/')) {
    return rule.to + pagePath.slice(rule.from.length);
  }
  return pagePath;
};

// Rótulos fixos para nós coletores de categoria na árvore de permissões
// (ex.: `/equipe/digital/rotina` aparece como "Rotina"). Tem prioridade
// sobre `page_name` quando o nó da árvore corresponde a esse caminho.
const TREE_NODE_LABEL_OVERRIDES: Record<string, string> = {
  '/equipe/digital/rotina': 'Rotina',
};

export const getTreeNodeLabelOverride = (path: string): string | undefined =>
  TREE_NODE_LABEL_OVERRIDES[path];
