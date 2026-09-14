// A ÁREA DE ACESSO NÃO É UMA COLUNA DO BANCO — ela é inferida.
//
// O que existe em `user_page_access` é acesso a PÁGINA. A área é um agrupamento
// de categorias de página (`AREA_CATEGORIES_MAP`), e"o usuário tem a área X"
// significa"ele alcança ao menos UMA página de alguma categoria de X".
//
// É `some` e não `every`, e isso é regra e não descuido: categoria sem página
// cadastrada existe, e com `every` ela zeraria a área inteira para todo mundo.
// O comentário original dessa decisão estava dentro do `useEffect` do
// `EditUserDialog`; o código saiu de lá para cá quando a matriz de Papéis passou
// a mostrar a mesma informação em coluna. Duas cópias da inferência — uma no
// diálogo, outra na matriz — diriam coisas diferentes sobre a mesma pessoa na
// mesma tela, que é o defeito que a extração impede.

import { AREA_CATEGORIES_MAP, type AreaKey } from '@/config/areaCategories';

/** O mínimo de `page_permissions` que a inferência usa. */
export interface PaginaComCategoria {
  id: string;
  category: string;
}

/** O mínimo de `user_page_access` que a inferência usa. */
export interface AcessoDePagina {
  user_id: string;
  page_permission_id: string;
}

/** As áreas na ordem em que `AREA_CATEGORIES_MAP` as declara. */
export const CHAVES_DE_AREA = Object.keys(AREA_CATEGORIES_MAP) as AreaKey[];

/**
 * Ids das páginas que compõem uma área — o conjunto que se concede ou revoga
 * quando a célula da matriz é clicada.
 */
export function paginasDaArea(area: AreaKey, paginas: PaginaComCategoria[]): string[] {
  const categorias = new Set(AREA_CATEGORIES_MAP[area].categories);
  return paginas.filter((p) => categorias.has(p.category)).map((p) => p.id);
}

/**
 * Áreas de cada usuário, numa passada só.
 *
 * Por que em lote e não um por vez: a matriz mostra 68 linhas × 5 áreas, e a
 * versão do diálogo faz `includes` numa lista para cada página de cada área —
 * custo quadrático que só não aparecia porque lá era um usuário só.
 */
export function areasDeAcessoPorUsuario(
  paginas: PaginaComCategoria[],
  acessos: AcessoDePagina[],
): Record<string, Set<AreaKey>> {
  const categoriaDaPagina = new Map(paginas.map((p) => [p.id, p.category]));

  const categoriasPorUsuario = new Map<string, Set<string>>();
  for (const acesso of acessos) {
    const categoria = categoriaDaPagina.get(acesso.page_permission_id);
    if (!categoria) continue;
    let categorias = categoriasPorUsuario.get(acesso.user_id);
    if (!categorias) categoriasPorUsuario.set(acesso.user_id, (categorias = new Set()));
    categorias.add(categoria);
  }

  const resultado: Record<string, Set<AreaKey>> = {};
  for (const [userId, categorias] of categoriasPorUsuario) {
    const areas = new Set<AreaKey>();
    for (const area of CHAVES_DE_AREA) {
      if (AREA_CATEGORIES_MAP[area].categories.some((c) => categorias.has(c))) areas.add(area);
    }
    resultado[userId] = areas;
  }
  return resultado;
}

/**
 * Áreas de um usuário só, na ordem do mapa. É a forma que o diálogo de edição
 * consome — ele precisa de lista, não de conjunto, para alimentar o form.
 */
export function areasDeAcessoDoUsuario(
  userId: string,
  paginas: PaginaComCategoria[],
  acessos: AcessoDePagina[],
): AreaKey[] {
  const doUsuario = acessos.filter((a) => a.user_id === userId);
  const areas = areasDeAcessoPorUsuario(paginas, doUsuario)[userId];
  return areas ? CHAVES_DE_AREA.filter((a) => areas.has(a)) : [];
}
