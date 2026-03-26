import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Given a client ID, fetches active OS → os_produtos_contratados → produto_servico → servicos_prestados
 * to return an array of servico_prestado_id for the "Contratado" badge.
 */
export const useServicosContratados = (clientId: string | null | undefined) => {
  const { data: suggestedCategoryIds = [], isLoading } = useQuery({
    queryKey: ['servicos-contratados', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      // 1. Buscar OS ativas do cliente
      // ordem_servico não está no schema tipado — cast justificado
      const { data: osData } = await (supabase
        .from('ordem_servico' as any) as any)
        .select('id')
        .eq('id_cliente', clientId)
        .eq('situacao', 'em_andamento')
        .eq('excluido', false);

      if (!osData?.length) return [];

      const osIds = osData.map((os: any) => os.id as string);

      // 2. Buscar produtos contratados dessas OS
      // os_produtos_contratados não está no schema tipado — cast justificado
      const { data: produtosData } = await (supabase
        .from('os_produtos_contratados' as any) as any)
        .select('produto_segmento_id')
        .in('ordem_servico_id', osIds);

      if (!produtosData?.length) return [];

      const produtoIds = [...new Set(produtosData.map((p: any) => p.produto_segmento_id as string))];

      // 3. Buscar servicos vinculados a esses produtos via produto_servico
      const { data: produtoServicos } = await supabase
        .from('produto_servico')
        .select('servico_prestado_id')
        .in('produto_segmento_id', produtoIds);

      if (!produtoServicos?.length) return [];

      return [...new Set(produtoServicos.map(ps => ps.servico_prestado_id as string))] as string[];
    },
    enabled: !!clientId,
  });

  return { suggestedCategoryIds, isLoading };
};
