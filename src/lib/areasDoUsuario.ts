// Quais áreas da equipe uma pessoa enxerga na tela de seleção.
//
// Até aqui a tela de `/equipe` mostrava as cinco áreas para qualquer um, antes
// mesmo do login: quem entrasse no site pelo ícone da equipe via a divisão
// interna da empresa sem ter credencial nenhuma. A escolha da área só era
// checada depois, no `checkAreaAccess`.
//
// Esta função responde a outra pergunta: o que essa pessoa deve VER. A barreira
// de entrada continua sendo o `checkAreaAccess` no clique e o `PageAccessGate`
// na rota; aqui é só visibilidade, e por isso pode ser pura.
import { AREAS_LIST, AREA_CATEGORIES_MAP, type AreaKey } from '@/config/areaCategories';

export interface AreaVisivel {
  id: AreaKey;
  label: string;
}

/**
 * Filtra as áreas pelas categorias de página que a pessoa tem liberadas.
 *
 * `null` significa admin: vê tudo, sem consultar nada. É o mesmo contrato de
 * `useUserAccessibleCategories`, que devolve `null` para admin em vez de a
 * lista completa.
 *
 * O casamento é por `some` e não por `every`: Digital vale por 'rotina' OU
 * 'dev', e quem tem só uma das duas trabalha na Digital do mesmo jeito. Exigir
 * as duas esconderia a área de quase todo mundo.
 */
export function areasDoUsuario(categorias: readonly string[] | null): AreaVisivel[] {
  if (categorias === null) return [...AREAS_LIST];

  const liberadas = new Set(categorias);
  return AREAS_LIST.filter((area) =>
    AREA_CATEGORIES_MAP[area.id].categories.some((categoria) => liberadas.has(categoria)),
  );
}
