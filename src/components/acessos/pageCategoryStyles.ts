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

export const getCategoryLabel = (category: string): string =>
  PAGE_CATEGORY_LABELS[category] ?? category;

export const getCategoryColor = (category: string): string =>
  PAGE_CATEGORY_COLORS[category] ?? 'bg-slate-100 text-slate-600 border-slate-200';
