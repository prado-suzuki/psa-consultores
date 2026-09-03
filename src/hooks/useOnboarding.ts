import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { OnboardingDocument } from '@/lib/onboarding';
import {
  paraGranularidade,
  type CatalogoDocumento,
  type ProdutosPorDocumento,
} from '@/lib/solicitacao';
import { useDomainClusterPorCategoria } from '@/hooks/useDomainClusterPorCategoria';
import { montarOrdensDaArea, produtosDaArea } from '@/lib/ordensDaArea';

/**
 * Catálogo e OS que alimentam a tela de solicitação inicial de documentos.
 *
 * COMO A TELA SABE O QUE É "DA OSG"
 *
 * Pelo PRODUTO contratado, em `produto_segmento.cluster_id` — não pela OS.
 *
 * Até 03/09/2026 a pergunta era feita à OS, no campo que o cadastro chama de
 * **Empresa / Faturamento** (`ordem_servico.cluster_id`). Isso pergunta "quem
 * emitiu a nota?" para responder "de quem é o trabalho?", e as duas divergem
 * sempre que a OSG executa algo faturado por outra empresa do grupo. Medido em
 * produção no dia da troca: **17 das 82 OS que pedem documento da OSG ficavam
 * invisíveis** — 8 na Familly Business (Governança), 2 na PSA Norte, 1 na TAX e
 * **6 sem cluster nenhum**, apesar de `clientFormValidation.ts:181` exigir o
 * campo. Nenhum daqueles 17 clientes tinha solicitação aberta.
 *
 * O produto responde certo porque é ele que carrega a área que executa: os 7
 * produtos do cluster OSG são exatamente os 7 que têm documento mapeado, e os 19
 * da TAX não têm nenhum (conferido em 03/09/2026). E porque é DADO, não lista no
 * código — quando a TAX mapear os documentos dela, nada aqui precisa mudar.
 *
 * Qual cluster é o da página continua vindo de `useDomainClusterPorCategoria`,
 * que resolve pela categoria já espelhada em `estrutura_areas.page_categories`.
 * É o que permite a mesma tela servir a outra área depois, sem uuid no código.
 *
 * O FILTRO E A CONTAGEM RESPONDEM PERGUNTAS DIFERENTES
 *
 * QUAIS OS aparecem: as que têm ao menos um produto do cluster desta página.
 * QUANTOS documentos cada uma traz: todos os que a `gerar_solicitacao_os` criaria
 * — ela não olha cluster, gera de todos os produtos da OS. Contar só os da área
 * faria a tela prometer um número e o botão entregar outro. Hoje os dois dão o
 * mesmo resultado (a TAX tem zero documento mapeado); no dia em que não derem, a
 * divergência é do desenho e precisa de decisão: `uq_solicitacao_ativa_por_cliente`
 * só admite UMA solicitação aberta por cliente, então as duas áreas dividem o
 * mesmo pedido — ou a RPC passa a recortar os itens por cluster do produto.
 *
 * UMA OS POR SOLICITAÇÃO
 *
 * As OS vêm em lista, cada uma com os seus produtos e a sua contagem de
 * documentos, porque a geração passou a ser de UMA OS por vez: havendo mais de
 * uma, a tela pergunta qual. Antes ela somava todas em silêncio, e o consultor
 * não tinha como saber de onde cada documento veio — nem a solicitação, que
 * guarda um `solicitacao.ordem_servico_id` só.
 *
 * O QUE NÃO É USADO, E POR QUÊ
 *
 * - Lista de códigos de produto escrita à mão: existia aqui e quebrou em
 *   03/08/2026, quando o cadastro passou de 11 para 8 produtos (`DSS`→`DSSG`, as
 *   5 modalidades de reorganização viraram `RS`, nasceu `RSSG`). Cliente com
 *   DSSG caía em "nenhum produto contratado", sem erro na tela. O filtro de hoje
 *   é o oposto disso: pergunta ao cadastro de qual área é o produto.
 * - `ordem_servico.cluster_id`: ver acima. É empresa de faturamento.
 * - Centro de custo (`distribuicao_receita`): é rateio de receita, com
 *   percentuais. Filtrar por ele traz 13 OSs quando só 2 são da OSG — uma OS da
 *   TAX que aloca 70% na consultoria continua sendo trabalho da TAX.
 * - `ordem_servico.id_produto_segmento`: os produtos vêm de
 *   `os_produtos_contratados`, que é exatamente a fonte que a
 *   `gerar_solicitacao_os` usa para criar os itens. Mostrar na tela um produto de
 *   outra fonte faria a lista divergir do que o botão gera.
 */

/** Produto contratado numa OS do cliente. */
export interface OnboardingProdutoContratado {
  id: string;
  code: string;
  name: string;
  /** A área dona do produto. É por ela que a OS entra ou não na lista. */
  clusterId: string | null;
}

/** Uma OS do cliente que contrata algum produto desta área. */
export interface OnboardingOrdemServico {
  id: string;
  numeroOs: string;
  produtos: OnboardingProdutoContratado[];
  /** Documentos distintos e ativos que os produtos desta OS pedem. */
  documentos: number;
}

export interface OnboardingCatalogData {
  /**
   * As OS do cliente que contratam algum produto desta área. Zero significa
   * "nenhum produto da área contratado"; mais de uma faz a tela perguntar de
   * qual gerar.
   */
  ordensServico: OnboardingOrdemServico[];
  /**
   * Os produtos DESTA ÁREA nas OS acima, sem repetir. É o que o rail mostra
   * quando a solicitação não aponta para uma OS — pedido montado à mão, por
   * exemplo.
   *
   * Recortado por área de propósito: o rail existe para filtrar a lista de
   * documentos, e produto de outra área não recorta nada (não tem vínculo em
   * `produto_documento_tipo`). Numa OS híbrida ele viraria um botão que sempre
   * devolve lista vazia.
   */
  produtosContratados: OnboardingProdutoContratado[];
  /**
   * Documento do catálogo → produtos que o pedem.
   *
   * É o que permite olhar a lista pela lente de um produto sem gravar produto
   * nenhum na solicitação. Vem de `produto_documento_tipo`, a mesma tabela que a
   * RPC usa para gerar a lista — então a tela e a geração contam a mesma coisa.
   */
  produtosPorDocumento: ProdutosPorDocumento;
  /** Catálogo inteiro em forma de EXIBIÇÃO, para a lista de opcionais. */
  catalogDocuments: OnboardingDocument[];
  /**
   * Catálogo em forma de GRAVAÇÃO (com `granularidade`, `grupo` e `ordem`),
   * indexado por id. Incluir um documento do catálogo grava só a referência mais
   * os três campos estruturais — nunca o texto.
   */
  catalogoPorId: Map<string, CatalogoDocumento>;
}

const VAZIO: OnboardingCatalogData = {
  ordensServico: [],
  produtosContratados: [],
  produtosPorDocumento: new Map(),
  catalogDocuments: [],
  catalogoPorId: new Map(),
};

export function useOnboarding(clienteId: string | null) {
  const {
    clusterId: clusterOsg,
    isLoading: carregandoCluster,
    error: erroCluster,
  } = useDomainClusterPorCategoria('osg');

  const query = useQuery<OnboardingCatalogData>({
    queryKey: ['osg-onboarding', clienteId, clusterOsg],
    queryFn: async () => {
      if (!clienteId || !clusterOsg) return VAZIO;

      // TODAS as OS do cliente. O recorte por área não cabe aqui: ele depende
      // dos produtos, que só são conhecidos duas consultas abaixo.
      const { data: orderRows, error: orderError } = await supabase
        .from('ordem_servico')
        .select('id, numero_os')
        .eq('id_cliente', clienteId)
        .eq('excluido', false)
        .order('numero_os');
      if (orderError) throw orderError;

      const ordensServicoIds = (orderRows ?? []).map((order) => order.id);

      const { data: contractedRows, error: contractedError } = ordensServicoIds.length
        ? await supabase
          .from('os_produtos_contratados')
          .select('ordem_servico_id, produto_segmento_id')
          .in('ordem_servico_id', ordensServicoIds)
        : { data: [], error: null };
      if (contractedError) throw contractedError;

      const produtoIds = [...new Set((contractedRows ?? []).map((row) => row.produto_segmento_id))];
      const { data: productRows, error: productError } = produtoIds.length
        ? await supabase
          .from('produto_segmento')
          .select('id, codigo, nome, cluster_id')
          .in('id', produtoIds)
          .order('codigo')
        : { data: [], error: null };
      if (productError) throw productError;

      // Sem filtro de `is_active`: produto desativado depois de contratado
      // continua contratado, e escondê-lo aqui seria sumir com documento que o
      // cliente deve entregar.
      const todosOsProdutos: OnboardingProdutoContratado[] = (productRows ?? []).map(
        (product) => ({
          id: product.id,
          code: product.codigo,
          name: product.nome,
          clusterId: product.cluster_id,
        }),
      );
      const produtoPorId = new Map(todosOsProdutos.map((produto) => [produto.id, produto]));
      const produtosContratados = produtosDaArea(todosOsProdutos, clusterOsg);

      const { data: vinculoRows, error: vinculoError } = produtoIds.length
        ? await supabase
          .from('produto_documento_tipo')
          .select('produto_segmento_id, item_padrao_id')
          .in('produto_segmento_id', produtoIds)
        : { data: [], error: null };
      if (vinculoError) throw vinculoError;

      const produtosPorDocumento: ProdutosPorDocumento = new Map();
      const documentosPorProduto = new Map<string, Set<string>>();
      for (const vinculo of vinculoRows ?? []) {
        const atuais = produtosPorDocumento.get(vinculo.item_padrao_id) ?? [];
        atuais.push(vinculo.produto_segmento_id);
        produtosPorDocumento.set(vinculo.item_padrao_id, atuais);

        const doProduto = documentosPorProduto.get(vinculo.produto_segmento_id) ?? new Set<string>();
        doProduto.add(vinculo.item_padrao_id);
        documentosPorProduto.set(vinculo.produto_segmento_id, doProduto);
      }

      // String literal única: o tipo gerado do Supabase só infere as colunas a
      // partir de um literal — concatenar derruba a inferência.
      //
      // `cliente_id is null` recorta o catálogo PADRÃO. A mesma tabela também
      // guarda documentos avulsos de pedido manual (migration 20260807150000), e
      // eles não podem aparecer na montagem: a lista de escolha do consultor é a
      // dos 67 padrões, não a dos avulsos de outros clientes.
      const { data: itemRows, error: itemError } = await supabase
        .from('documento_tipo')
        .select(
          'id, codigo, documento, entidade, modulo, nota, categoria, categoria_docbox, confidencial, ordem, granularidade, grupo',
        )
        .is('cliente_id', null)
        .eq('ativo', true)
        .order('ordem');
      if (itemError) throw itemError;

      const catalogoPorId = new Map<string, CatalogoDocumento>(
        (itemRows ?? []).map((item) => [item.id, {
          id: item.id,
          codigo: item.codigo,
          documento: item.documento,
          entidade: item.entidade,
          nota: item.nota,
          granularidade: item.granularidade,
          grupo: item.grupo,
          ordem: item.ordem,
          confidencial: item.confidencial,
        }]),
      );

      // Produtos de cada OS, e quantos documentos ela pede.
      //
      // A contagem espelha a `gerar_solicitacao_os`: agrupa por `item_padrao_id`
      // — documento pedido por dois produtos da mesma OS conta uma vez — e só
      // vale o que está no catálogo ATIVO, porque é isso que a RPC insere.
      const produtosPorOs = new Map<string, string[]>();
      for (const contratado of contractedRows ?? []) {
        const atuais = produtosPorOs.get(contratado.ordem_servico_id) ?? [];
        atuais.push(contratado.produto_segmento_id);
        produtosPorOs.set(contratado.ordem_servico_id, atuais);
      }

      // `documentosPorProduto` restrito ao catálogo ATIVO antes de contar: é a
      // mesma condição do `AND t.ativo` da RPC, e a função pura conta o que
      // recebe.
      const ativosPorProduto = new Map<string, Set<string>>();
      documentosPorProduto.forEach((itens, produtoId) => {
        const ativos = new Set([...itens].filter((itemId) => catalogoPorId.has(itemId)));
        if (ativos.size > 0) ativosPorProduto.set(produtoId, ativos);
      });

      const ordensServico: OnboardingOrdemServico[] = montarOrdensDaArea(
        (orderRows ?? []).map((order) => ({
          id: order.id,
          numeroOs: order.numero_os ?? '',
          produtoIds: produtosPorOs.get(order.id) ?? [],
        })),
        produtoPorId,
        ativosPorProduto,
        clusterOsg,
      );

      const catalogDocuments: OnboardingDocument[] = (itemRows ?? []).map((item) => ({
        id: item.id,
        catalogId: item.id,
        code: item.codigo,
        title: item.documento,
        note: item.nota ?? '',
        grupo: item.grupo,
        // Estreita o texto do banco para o domínio fechado, levantando se algum
        // valor fugir do CHECK — a gaveta errada em silêncio é o pior desfecho.
        granularidade: paraGranularidade(item.granularidade),
      }));

      return {
        ordensServico,
        produtosContratados,
        produtosPorDocumento,
        catalogDocuments: catalogDocuments.sort((left, right) =>
          left.title.localeCompare(right.title, 'pt-BR')),
        catalogoPorId,
      };
    },
    enabled: Boolean(clienteId && clusterOsg),
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: query.data,
    isLoading: carregandoCluster || query.isLoading,
    /**
     * O erro do cluster vem primeiro. Sem ele a consulta nem roda, e ficar
     * "carregando" para sempre seria justamente o silêncio que esta mudança
     * elimina: a tela tem de dizer que a área da OSG não está configurada.
     */
    error: erroCluster ?? query.error,
  };
}
