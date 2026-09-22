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
 * O casamento é por `some` e não por `every`: bastava uma das categorias da
 * área para a pessoa trabalhar nela. A Digital era o caso vivo, valendo por
 * 'rotina' OU 'dev', e exigir as duas esconderia a área de quase todo mundo.
 *
 * ATENÇÃO, e é por isso que este parágrafo é mais longo do que a regra merece:
 * desde 22/09/2026 **nenhuma área tem duas categorias**. O Digital Dev virou
 * TAX Work e entrou na categoria `tax`, e com isso um `every` aqui passaria por
 * toda a suíte sem ninguém ver — não existe mais dado real que os distinga.
 *
 * A regra segue certa e não deve ser "simplificada" para `every` nem para uma
 * comparação direta. Quem der uma segunda categoria a qualquer área quebra a
 * tripwire de `areasDoUsuario.test.ts`, que manda escrever o caso de verdade.
 */
export function areasDoUsuario(categorias: readonly string[] | null): AreaVisivel[] {
  if (categorias === null) return [...AREAS_LIST];

  const liberadas = new Set(categorias);
  return AREAS_LIST.filter((area) =>
    AREA_CATEGORIES_MAP[area.id].categories.some((categoria) => liberadas.has(categoria)),
  );
}
