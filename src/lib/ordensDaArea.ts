// Quais OS do cliente aparecem na solicitação inicial de documentos — e o que
// cada uma mostra.
//
// A REGRA, e por que ela mudou em 03/09/2026
//
// A OS entra na lista quando contrata **algum produto da área desta página**,
// lido em `produto_segmento.cluster_id`.
//
// Antes a pergunta era feita à OS, em `ordem_servico.cluster_id` — o campo que o
// cadastro chama de Empresa / Faturamento. Isso pergunta "quem emitiu a nota?"
// para responder "de quem é o trabalho?", e as duas divergem sempre que a área
// executa algo faturado por outra empresa do grupo. Medido em produção no dia da
// troca: 17 das 82 OS que pedem documento da OSG ficavam invisíveis — 8 na
// Familly Business (Governança), 2 na PSA Norte, 1 na TAX, e 6 sem cluster
// nenhum. Nenhum daqueles 17 clientes tinha solicitação aberta.
//
// Esta função é pura de propósito: a regra de "o que o analista enxerga" é o
// tipo de decisão que precisa de teste, e não de leitura de hook com I/O.

/** Produto contratado, com a área que o executa. */
export interface ProdutoDaOrdem {
  id: string;
  code: string;
  name: string;
  /**
   * A área dona do produto. Anulável porque a coluna é — e nulo NÃO entra na
   * área nenhuma: não há como afirmar que um produto sem área declarada é
   * desta. Em 03/09/2026 as 26 linhas de `produto_segmento` estavam preenchidas.
   */
  clusterId: string | null;
}

/** Uma OS do cliente antes do recorte, com os produtos que ela contrata. */
export interface OrdemComProdutos {
  id: string;
  numeroOs: string;
  produtoIds: string[];
}

/** A OS como o seletor a mostra. */
export interface OrdemDaArea {
  id: string;
  numeroOs: string;
  /** Só os produtos DESTA área — ver `montarOrdensDaArea`. */
  produtos: ProdutoDaOrdem[];
  /** Documentos distintos que a geração criaria a partir desta OS. */
  documentos: number;
}

/**
 * Recorta as OS do cliente para as desta área, resolvendo produtos e contagem.
 *
 * Três decisões que parecem detalhe e não são:
 *
 * 1) **Quais OS aparecem** — as que têm produto desta área. Não é "as que pedem
 *    documento": OS da área cujo catálogo ainda não foi mapeado precisa
 *    aparecer, senão não há como abrir a solicitação dela. É o estado em que
 *    está hoje todo produto da TAX.
 *
 * 2) **Quantos documentos** — conta TODOS os produtos da OS, inclusive os de
 *    outra área, porque é isso que a `gerar_solicitacao_os` insere: ela não olha
 *    cluster. Contar só os da área faria a tela prometer um número e o botão
 *    entregar outro. Hoje os dois coincidem (a TAX não tem documento mapeado);
 *    quando deixarem de coincidir, é decisão de desenho a tomar, porque
 *    `uq_solicitacao_ativa_por_cliente` só admite um pedido aberto por cliente.
 *
 * 3) **Quais produtos são exibidos** — só os da área. Nome de produto de outra
 *    área no cartão levaria o analista a procurar, nesta tela, documento que ela
 *    não pede.
 *
 * `documentosPorProduto` já vem filtrado pelo catálogo ATIVO por quem consulta —
 * é a mesma restrição que a RPC aplica no `JOIN documento_tipo t ON ... AND t.ativo`.
 */
export function montarOrdensDaArea(
  ordens: OrdemComProdutos[],
  produtoPorId: Map<string, ProdutoDaOrdem>,
  documentosPorProduto: Map<string, Set<string>>,
  clusterDaArea: string,
): OrdemDaArea[] {
  const ehDaArea = (produtoId: string) =>
    produtoPorId.get(produtoId)?.clusterId === clusterDaArea;

  return ordens
    .filter((ordem) => ordem.produtoIds.some(ehDaArea))
    .map((ordem) => {
      const documentos = new Set<string>();
      for (const produtoId of ordem.produtoIds) {
        for (const itemId of documentosPorProduto.get(produtoId) ?? []) {
          documentos.add(itemId);
        }
      }

      return {
        id: ordem.id,
        numeroOs: ordem.numeroOs,
        produtos: ordem.produtoIds
          .filter(ehDaArea)
          .map((produtoId) => produtoPorId.get(produtoId))
          .filter((produto): produto is ProdutoDaOrdem => Boolean(produto)),
        documentos: documentos.size,
      };
    });
}

/**
 * Os produtos desta área entre os contratados, sem repetir e na ordem recebida.
 *
 * É o que o rail mostra quando a solicitação não aponta para uma OS. Recortado
 * pela área pelo mesmo motivo do item 3 acima: produto de outra área não tem
 * vínculo em `produto_documento_tipo`, então viraria um filtro que sempre
 * devolve lista vazia.
 */
export function produtosDaArea(
  produtos: ProdutoDaOrdem[],
  clusterDaArea: string,
): ProdutoDaOrdem[] {
  return produtos.filter((produto) => produto.clusterId === clusterDaArea);
}
