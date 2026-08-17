import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EstruturaArea {
  id: string;
  name: string;
  color: string | null;
  cluster_id: string;
  /** Categorias de página da área — é por aqui que se sabe se ela é Tax ou OSG. */
  page_categories?: string[] | null;
}

/**
 * Fetches active estrutura_areas filtered by page_categories.
 * Usage: useEstruturaAreas('tax')
 *
 * Uma LISTA de categorias significa "qualquer uma delas" (`overlaps`), e é o que
 * o consolidado do Board usa: `useEstruturaAreas(['tax', 'osg'])` devolve as
 * áreas das duas em uma consulta só. Categoria única mantém o `contains` de
 * sempre — mesmo resultado, mesma chave de cache.
 */
export const useEstruturaAreas = (category: string | string[]) => {
  // Ordenado para ['tax','osg'] e ['osg','tax'] compartilharem a entrada de cache.
  const categorias = Array.isArray(category) ? [...category].sort() : category;

  return useQuery({
    queryKey: ['estrutura-areas', categorias],
    queryFn: async () => {
      const base = supabase
        .from('estrutura_areas')
        .select('id, name, color, cluster_id, page_categories')
        .eq('is_active', true);

      const { data, error } = await (Array.isArray(categorias)
        ? base.overlaps('page_categories', categorias)
        : base.contains('page_categories', [categorias]))
        .order('name');
      if (error) throw error;
      return (data || []) as EstruturaArea[];
    },
  });
};

/**
 * Fetches ALL active estrutura_areas without filtering by page_categories.
 * Used by ticket area selectors and filters.
 */
export const useAllActiveAreas = () => {
  return useQuery({
    queryKey: ['estrutura-areas', '__all__'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estrutura_areas')
        .select('id, name, color, cluster_id')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []) as EstruturaArea[];
    },
  });
};

/**
 * Fetches ALL active clusters for lookup maps in ticket listings.
 */
export const useAllActiveClusters = () => {
  return useQuery({
    queryKey: ['estrutura-clusters', '__all__'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estrutura_clusters')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []) as { id: string; name: string }[];
    },
  });
};
