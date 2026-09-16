import { useQuery, useQueryClient } from '@tanstack/react-query';

import { currentAmbiente } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';
import { ambientePorClienteQuery } from '@/hooks/useDomainAmbienteClientes';
import { useDomainClusterPorCategoria } from '@/hooks/useDomainClusterPorCategoria';
import { isDoAmbiente } from '@/lib/ambienteScope';
import {
  montarControleDeProjetos,
  type ClienteCru,
  type LinhaDoControle,
  type OrdemCrua,
  type PessoaCrua,
  type ProdutoContratado,
  type ProdutoSegmento,
  type ProjetoDaOrdem,
} from '@/lib/osgControleDeProjetos';
import { todayIsoBrazil } from '@/lib/dateUtils';

/**
 * As linhas do Controle de Projetos da OSG: uma por PRODUTO contratado da OS.
 *
 * As consultas são PLANAS e o cruzamento acontece em memória, na função pura de
 * `lib/osgControleDeProjetos.ts`. Não é preferência de estilo: embed aninhado
 * neste ponto do schema é caminho conhecido para o TS2589 (ver
 * `docs/geral/teto-de-instanciacoes-do-typescript`), e a regra de "quais OS
 * aparecem" tem de ser testável sem banco.
 *
 * DOIS FILTROS QUE NÃO EXISTEM AQUI, E É DE PROPÓSITO:
 *
 * `ordem_servico` não tem coluna `ambiente` — o ambiente dela é o do cliente que
 * ela referencia, e o corte é na mão por `isDoAmbiente` (ver AGENTS.md e
 * `lib/ambienteScope.ts`). Filtrar `ambiente` na query quebraria a consulta.
 *
 * `ordem_servico` também não tem `excluido` em PRODUÇÃO, apesar de o
 * `docs/rls/mapa-do-banco.md` listar a flag. Conferido no schema em 15/09/2026.
 * Um `.eq('excluido', false)` aqui derrubaria a tela inteira.
 */
export const osgControleProjetosKeys = {
  lista: (cluster: string | null) => ['osg-controle-projetos', cluster, currentAmbiente] as const,
};

export function useDomainOsgControleProjetos() {
  const queryClient = useQueryClient();
  const {
    clusterId,
    isLoading: carregandoCluster,
    error: erroCluster,
  } = useDomainClusterPorCategoria('osg');

  const query = useQuery<LinhaDoControle[]>({
    queryKey: osgControleProjetosKeys.lista(clusterId),
    enabled: Boolean(clusterId),
    queryFn: async () => {
      const ambientePorCliente = await queryClient.fetchQuery(ambientePorClienteQuery());

      const [
        ordensRes,
        contratadosRes,
        produtosRes,
        projetosRes,
        clientesRes,
        pessoasRes,
        clustersRes,
      ] = await Promise.all([
          supabase
            .from('ordem_servico')
            .select('id, numero_os, id_cliente, situacao, data_inicio, data_fim, regiao'),
          supabase.from('os_produtos_contratados').select('ordem_servico_id, produto_segmento_id'),
          supabase.from('produto_segmento').select('id, nome, cluster_id'),
          supabase
            .from('org_projects')
            .select(
              'id, name, status, ordem_servico_id, produto_segmento_id, responsible_id, leader_id, description',
            ),
          // `cliente` TEM a coluna `ambiente` e é filtrada na própria query, ao
          // contrário das outras quatro. A RLS ainda recorta por cluster.
          supabase
            .from('cliente')
            .select('id, nome, ativo')
            .eq('excluido', false)
            .eq('ambiente', currentAmbiente),
          supabase.from('profiles').select('id, first_name, last_name'),
          supabase.from('estrutura_clusters').select('id, name'),
        ]);

      const erro =
        ordensRes.error ||
        contratadosRes.error ||
        produtosRes.error ||
        projetosRes.error ||
        clientesRes.error ||
        pessoasRes.error ||
        clustersRes.error;
      if (erro) throw erro;

      const clientes = (clientesRes.data ?? []) as ClienteCru[];
      const pessoas = (pessoasRes.data ?? []) as PessoaCrua[];
      const produtos = (produtosRes.data ?? []) as ProdutoSegmento[];
      const clusters = (clustersRes.data ?? []) as Array<{ id: string; name: string }>;

      const ordens = ((ordensRes.data ?? []) as OrdemCrua[]).filter((ordem) =>
        isDoAmbiente(ordem.id_cliente, ambientePorCliente),
      );

      return montarControleDeProjetos(
        ordens,
        (contratadosRes.data ?? []) as ProdutoContratado[],
        new Map(produtos.map((produto) => [produto.id, produto])),
        (projetosRes.data ?? []) as ProjetoDaOrdem[],
        new Map(clientes.map((cliente) => [cliente.id, cliente])),
        new Map(pessoas.map((pessoa) => [pessoa.id, pessoa])),
        new Map(clusters.map((cluster) => [cluster.id, cluster.name])),
        clusterId as string,
        todayIsoBrazil(),
      );
    },
  });

  return {
    linhas: query.data ?? [],
    // O cluster vem primeiro: sem ele a consulta nem sai, e mostrar "nenhuma OS"
    // enquanto ele carrega faria a tela afirmar vazio que não mediu.
    isLoading: carregandoCluster || query.isLoading,
    error: erroCluster ?? query.error,
  };
}
