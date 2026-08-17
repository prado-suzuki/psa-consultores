// Rótulos compartilhados entre a aba de OS e o bloco de produtos contratados.
//
// Vive fora dos dois porque a extração do ProdutoContratadoBlock deixou os dois
// arquivos precisando da mesma função, e importar um do outro criaria ciclo.

/**
 * O campo grava `cluster_id`: a empresa de faturamento É o cluster (razão social
 * e CNPJ são colunas dele — ver `docs/geral/decisoes/empresa-de-faturamento-vive-no-cluster.md`).
 * Exibimos a razão social e caímos no nome do cluster só quando ela não foi
 * preenchida. O rótulo segue "Empresa / Faturamento": é assim que o time
 * conhece o campo — "cluster" é vocabulário interno do sistema.
 */
export function getEmpresaLabel(cluster: { name: string; nome_empresa?: string | null }): string {
  return cluster.nome_empresa?.trim() || cluster.name;
}

/**
 * Produtos do mais comprido para o mais curto, só para exibição.
 *
 * As pílulas têm a largura do próprio nome e fluem em linha. Sem ordenar, um
 * nome muito longo no meio da lista deixa um buraco na linha anterior; com o
 * longo na frente, ele toma a linha inteira e os curtos se agrupam limpos
 * embaixo. Não altera o que é gravado, que é um conjunto sem ordem.
 */
export function ordenarPorRotulo<T extends { produto_segmento_id: string }>(
  produtos: readonly T[],
  options: Array<{ id: string; codigo: string; nome: string }>,
): T[] {
  return produtos
    .slice()
    .sort(
      (a, b) =>
        getProductLabel(b.produto_segmento_id, options).length -
        getProductLabel(a.produto_segmento_id, options).length,
    );
}

/** Rotulo de um produto pelo id: codigo e nome. */
export function getProductLabel(
  id: string,
  options: Array<{ id: string; codigo: string; nome: string }>,
): string {
  const p = options.find((o) => o.id === id);
  return p ? `${p.codigo} — ${p.nome}` : id;
}
