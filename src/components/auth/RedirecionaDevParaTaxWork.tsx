import { Navigate, useLocation } from 'react-router-dom';

/**
 * `/equipe/dev/...` deixou de existir em 22/09/2026, quando o Digital Dev virou
 * o Tax Work e as 30 rotas passaram para `/equipe/tax/work/...`.
 *
 * O critério da tarefa é explícito: nenhum caminho antigo pode quebrar. São 30
 * caminhos, e um `<Navigate>` para cada seria trinta linhas que envelhecem
 * juntas e divergem sozinhas na primeira tela que alguém acrescentar. Este
 * componente recorta o sufixo e devolve o MESMO lugar no endereço novo.
 *
 * A troca é ancorada no começo e as rotas que o montam são só `/equipe/dev` e
 * `/equipe/dev/*`, então o `pathname` que chega aqui ou é exatamente o prefixo
 * ou tem uma barra depois dele. Não há como recortar no meio de um segmento.
 *
 * LEVA `search` E `hash` JUNTO, e isso não é zelo: as telas do Dev guardam
 * estado na URL (`?painel=`, `?cliente=`, `?periodo=`), então link salvo sem
 * eles cairia na tela zerada, que é uma quebra silenciosa em vez de um 404
 * barulhento.
 */
export const RedirecionaDevParaTaxWork = () => {
  const { pathname, search, hash } = useLocation();
  const resto = pathname.replace(/^\/equipe\/dev/, '');
  return <Navigate to={`/equipe/tax/work${resto}${search}${hash}`} replace />;
};

export default RedirecionaDevParaTaxWork;
