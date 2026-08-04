import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { OnboardingDocument } from '@/lib/onboarding';
import { paraGranularidade, type CatalogoDocumento } from '@/lib/solicitacao';
import { useDomainClusterPorCategoria } from '@/hooks/useDomainClusterPorCategoria';

/**
 * Catálogo e OS que alimentam a tela de solicitação inicial de documentos.
 *
 * COMO A TELA SABE O QUE É "DA OSG"
 *
 * Pela OS, no campo que o cadastro chama de **Empresa / Faturamento** — que é
 * obrigatório para salvar uma OS (`clientFormValidation.ts`) e que grava
 * `ordem_servico.cluster_id` (ver o comentário em `ContratosTab.tsx`). O select
 * mostra o nome da empresa do cluster e guarda o cluster.
 *
 * E qual cluster é o da OSG vem de `useDomainClusterPorCategoria('osg')`: a
 * categoria da página, que já existe em `protectedPages.ts` e já está espelhada
 * em `estrutura_areas.page_categories`. Assim não há uuid no código nem
 * comparação com nome editável.
 *
 * O QUE NÃO É USADO, E POR QUÊ
 *
 * - Lista de códigos de produto escrita à mão: existia aqui e quebrou em
 *   03/08/2026, quando o cadastro passou de 11 para 8 produtos (`DSS`→`DSSG`, as
 *   5 modalidades de reorganização viraram `RS`, nasceu `RSSG`). Cliente com
 *   DSSG caía em "nenhum produto contratado", sem erro na tela.
 * - Centro de custo (`distribuicao_receita`): é rateio de receita, com
 *   percentuais. Filtrar por ele traz 13 OSs quando só 2 são da OSG — uma OS da
 *   TAX que aloca 70% na consultoria continua sendo trabalho da TAX.
 * - `ordem_servico.id_produto_segmento`: os produtos vêm de
 *   `os_produtos_contratados`, que é exatamente a fonte que a
 *   `gerar_solicitacao_os` usa para criar os itens. Mostrar na tela um produto de
 *   outra fonte faria a lista divergir do que o botão gera.
 */

/** Produto contratado na OS da OSG. */
export interface OnboardingProdutoContratado {
  id: string;
  code: string;
  name: string;
}

export interface OnboardingCatalogData {
  produtosContratados: OnboardingProdutoContratado[];
  /**
   * Ids das OS do cliente cuja Empresa/Faturamento é a da OSG.
   *
   * Só os ids: o número da OS não aparece em nenhum lugar da tela, e carregar um
   * campo que ninguém lê é dívida esperando para envelhecer.
   */
  ordensServicoIds: string[];
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
  produtosContratados: [],
  ordensServicoIds: [],
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

      // A OS da OSG: Empresa/Faturamento aponta para o cluster da OSG.
      const { data: orderRows, error: orderError } = await supabase
        .from('ordem_servico')
        .select('id')
        .eq('id_cliente', clienteId)
        .eq('cluster_id', clusterOsg)
        .eq('excluido', false);
      if (orderError) throw orderError;

      const ordensServicoIds = (orderRows ?? []).map((order) => order.id);

      const { data: contractedRows, error: contractedError } = ordensServicoIds.length
        ? await supabase
          .from('os_produtos_contratados')
          .select('produto_segmento_id')
          .in('ordem_servico_id', ordensServicoIds)
        : { data: [], error: null };
      if (contractedError) throw contractedError;

      const produtoIds = [...new Set((contractedRows ?? []).map((row) => row.produto_segmento_id))];
      const { data: productRows, error: productError } = produtoIds.length
        ? await supabase
          .from('produto_segmento')
          .select('id, codigo, nome')
          .in('id', produtoIds)
          .order('codigo')
        : { data: [], error: null };
      if (productError) throw productError;

      // Sem filtro de `is_active`: produto desativado depois de contratado
      // continua contratado, e escondê-lo aqui seria sumir com documento que o
      // cliente deve entregar.
      const produtosContratados: OnboardingProdutoContratado[] = (productRows ?? []).map(
        (product) => ({ id: product.id, code: product.codigo, name: product.nome }),
      );

      // String literal única: o tipo gerado do Supabase só infere as colunas a
      // partir de um literal — concatenar derruba a inferência.
      const { data: itemRows, error: itemError } = await supabase
        .from('documento_tipo')
        .select(
          'id, codigo, documento, entidade, modulo, nota, categoria, categoria_docbox, confidencial, ordem, granularidade, grupo',
        )
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
        produtosContratados,
        ordensServicoIds,
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
