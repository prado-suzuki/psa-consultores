import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Given a client ID, fetches active OS → extracts id_servico UUIDs
 * to suggest relevant service categories for project creation.
 */
export const useServicosContratados = (clientId: string | null | undefined) => {
  const { data: suggestedCategoryIds = [], isLoading } = useQuery({
    queryKey: ['servicos-contratados', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      // 1. Buscar OS ativas do cliente com id_servico
      const { data: osData } = await (supabase
        .from('ordem_servico' as any) as any)
        .select('id_servico')
        .eq('id_cliente', clientId)
        .eq('situacao', 'em_andamento')
        .eq('excluido', false);

      if (!osData?.length) return [];

      // 2. Extrair UUIDs de serviço (campo único, não JSONB)
      const servicoIds = [...new Set(
        osData
          .map((os: any) => os.id_servico)
          .filter(Boolean)
      )] as string[];

      return servicoIds;
    },
    enabled: !!clientId,
  });

  return { suggestedCategoryIds, isLoading };
};
