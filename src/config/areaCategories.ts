/**
 * Mapeamento único e canônico de áreas internas → categorias de páginas.
 *
 * Fonte única da verdade para:
 * - Form de criação/edição de usuário em EquipeControleAcessos
 * - Verificação de acesso por área no login (EquipeAuth)
 * - Inferência de áreas já liberadas ao editar usuário
 *
 * IMPORTANTE: As strings em `categories` devem existir em protectedPages.ts
 * (campo `category`) e em page_permissions.category. Categorias "fantasma"
 * (sem páginas associadas) tornam a inferência `every()` sempre false.
 */
export type AreaKey = 'digital' | 'tax' | 'osg' | 'board' | 'controle_site';

export interface AreaDefinition {
  label: string;
  /** Categorias de `page_permissions.category` que compõem esta área. */
  categories: string[];
}

export const AREA_CATEGORIES_MAP: Record<AreaKey, AreaDefinition> = {
  digital: { label: 'Digital', categories: ['rotina', 'dev'] },
  tax: { label: 'Tax', categories: ['tax'] },
  osg: { label: 'OSG', categories: ['osg'] },
  board: { label: 'Gerencial', categories: ['board'] },
  controle_site: { label: 'Chamados', categories: ['gestao'] },
};

/** Todas as categorias "de área" (usado para saber o que pode ser revogado). */
export const ALL_AREA_CATEGORIES: string[] = Object.values(AREA_CATEGORIES_MAP).flatMap(
  (a) => a.categories
);

/** Rotas de destino ao selecionar uma área no login. */
export const AREA_ROUTES: Record<AreaKey, string> = {
  digital: '/equipe/digital',
  tax: '/equipe/tax/dashboard',
  osg: '/equipe/osg/dashboard',
  controle_site: '/gestao',
  board: '/equipe/board/dashboard',
};

/** Lista ordenada para o select de área no login. */
export const AREAS_LIST: Array<{ id: AreaKey; label: string }> = [
  { id: 'board', label: 'Gerencial' },
  { id: 'controle_site', label: 'Chamados' },
  { id: 'digital', label: 'Digital' },
  { id: 'osg', label: 'OSG' },
  { id: 'tax', label: 'Tax' },
];
