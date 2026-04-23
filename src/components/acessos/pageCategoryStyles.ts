/**
 * Rótulos e cores das categorias de páginas (page_permissions.category).
 * Centralizado para reuso entre a aba Páginas e a aba Usuários do
 * Controle de Acessos.
 */
export const PAGE_CATEGORY_LABELS: Record<string, string> = {
  rotina: 'Digital Rotina',
  dev: 'Digital Dev',
  gestao: 'Gestão',
  geral: 'Geral',
  tax: 'Tax',
  projetos: 'Projetos',
  fiscal: 'Fiscal',
  osg: 'OSG',
  board: 'Gerencial',
  fixos: 'Fixos',
};

export const PAGE_CATEGORY_COLORS: Record<string, string> = {
  rotina: 'bg-teal-100 text-teal-700 border-teal-200',
  dev: 'bg-slate-100 text-slate-700 border-slate-200',
  gestao: 'bg-teal-50 text-teal-600 border-teal-100',
  geral: 'bg-slate-50 text-slate-600 border-slate-100',
  tax: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  projetos: 'bg-blue-100 text-blue-700 border-blue-200',
  fiscal: 'bg-amber-100 text-amber-700 border-amber-200',
  osg: 'bg-purple-100 text-purple-700 border-purple-200',
  board: 'bg-rose-100 text-rose-700 border-rose-200',
  fixos: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

// Prefixo visual aplicado em /equipe/acessos para refletir a hierarquia pretendida
// das rotas. As URLs reais em `page_path` ainda são `/equipe/X`; a mudança é só
// de apresentação até a migração das rotas de verdade.
export const CATEGORY_DISPLAY_PREFIX: Record<string, { from: string; to: string }> = {
  rotina: { from: '/equipe', to: '/equipe/digital/rotina' },
  dev: { from: '/equipe/dev', to: '/equipe/digital/dev' },
};

// Agrupamento visual em /equipe/acessos: mapeia categorias para um "grupo de
// exibição" único (ex.: `rotina` e `dev` compartilham o grupo `digital`, que
// aparece como um bloco só rotulado "Digital"). Categorias sem entrada aqui
// usam o próprio nome como grupo.
export const CATEGORY_TO_GROUP: Record<string, string> = {
  rotina: 'digital',
  dev: 'digital',
};

const GROUP_LABELS: Record<string, string> = {
  digital: 'Digital',
};

const GROUP_COLORS: Record<string, string> = {
  digital: 'bg-teal-100 text-teal-700 border-teal-200',
};

export const getCategoryLabel = (category: string): string =>
  PAGE_CATEGORY_LABELS[category] ?? category;

export const getCategoryColor = (category: string): string =>
  PAGE_CATEGORY_COLORS[category] ?? 'bg-slate-100 text-slate-600 border-slate-200';

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
  '/equipe/digital/dev': 'Dev',
};

export const getTreeNodeLabelOverride = (path: string): string | undefined =>
  TREE_NODE_LABEL_OVERRIDES[path];
