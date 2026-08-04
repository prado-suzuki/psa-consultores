// Resolve QUAL cluster responde por uma categoria de página.
//
// Por que existe: uma tela de área (a de onboarding da OSG, por exemplo) precisa
// filtrar dados pelo cluster da sua área. O caminho ingênuo é escrever o uuid do
// cluster no código, ou comparar o nome ("OSG"). Os dois envelhecem: uuid não diz
// nada a quem lê, e `estrutura_clusters.name` é rótulo editável na tela de
// Estrutura — renomear esvaziaria a tela sem erro.
//
// O sistema já tem a ponte pronta, mantida para o controle de acesso:
//   `protectedPages.ts` declara a página com `category` (tipo fechado)
//   `estrutura_areas.page_categories` diz quais categorias a área atende
//   `estrutura_areas.cluster_id` diz de qual cluster a área é
//
// Então a categoria funciona como slug — só que sem migration, porque a coluna
// já existe e os admins já a preenchem.
//
// Conferido no banco em 04/08/2026: a área "OSG" tem page_categories ['osg'] e
// aponta para o cluster OSG; as 5 áreas de ['tax'] apontam todas para o cluster
// TAX; "Trabalhos compartilhados OSG" tem OSG no nome mas categoria 'tax' — por
// isso a busca é por categoria e nunca por nome.

import type { ProtectedPage } from '@/config/protectedPages';

export type PageCategory = ProtectedPage['category'];

/** A fatia de `estrutura_areas` que basta para resolver o cluster. */
export interface AreaComCluster {
  name: string;
  cluster_id: string | null;
}

/**
 * O cluster único da categoria — ou levanta.
 *
 * Levantar nos dois extremos é deliberado, e é o que separa esta solução do
 * problema que ela substitui:
 *
 * - nenhuma área: alguém tirou a categoria da área na tela de Estrutura. Sem o
 *   erro, a tela mostraria lista vazia e o consultor concluiria que o cliente
 *   não tem nada — exatamente o bug silencioso que a lista de códigos escrita à
 *   mão causava.
 * - mais de um cluster: a categoria passou a ser atendida por áreas de clusters
 *   diferentes e a pergunta deixou de ter resposta única. Escolher a primeira
 *   seria decidir no escuro.
 *
 * Várias áreas do MESMO cluster são normais (a categoria 'tax' tem cinco) e não
 * são ambiguidade.
 */
export function resolverClusterDaCategoria(
  categoria: PageCategory,
  areas: AreaComCluster[],
): string {
  const clusters = [...new Set(
    areas.flatMap((area) => (area.cluster_id ? [area.cluster_id] : [])),
  )];

  if (clusters.length === 0) {
    throw new Error(
      `Nenhuma área com cluster atende a categoria "${categoria}". `
      + 'Confira em Estrutura > Áreas se a categoria está marcada na área correspondente.',
    );
  }

  if (clusters.length > 1) {
    const nomes = areas.map((area) => area.name).join(', ');
    throw new Error(
      `A categoria "${categoria}" está em áreas de ${clusters.length} clusters `
      + `diferentes (${nomes}). Deixe a categoria em áreas de um só cluster.`,
    );
  }

  return clusters[0];
}
