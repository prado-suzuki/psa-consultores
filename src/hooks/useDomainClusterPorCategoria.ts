import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  resolverClusterDaCategoria,
  type AreaComCluster,
  type PageCategory,
} from '@/lib/clusterPorCategoria';

/**
 * O cluster que responde por uma categoria de página.
 *
 * Serve às telas de área que precisam filtrar dado pelo próprio cluster sem
 * carregar o uuid dele no código. A categoria (`'osg'`, `'tax'`, …) já é um tipo
 * fechado em `protectedPages.ts` e já está espelhada em
 * `estrutura_areas.page_categories` — este hook só faz a travessia.
 *
 * `staleTime` alto de propósito: estrutura organizacional muda em escala de
 * semanas, não de minutos.
 */

export const clusterPorCategoriaKey = (categoria: PageCategory) =>
  ['cluster-por-categoria', categoria] as const;

export function useDomainClusterPorCategoria(categoria: PageCategory) {
  const query = useQuery<string>({
    queryKey: clusterPorCategoriaKey(categoria),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estrutura_areas')
        .select('name, cluster_id')
        .contains('page_categories', [categoria]);

      if (error) throw error;
      // A validação (nenhuma área / clusters divergentes) mora na função pura.
      return resolverClusterDaCategoria(categoria, (data ?? []) as AreaComCluster[]);
    },
    staleTime: 30 * 60 * 1000,
  });

  return {
    clusterId: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}
