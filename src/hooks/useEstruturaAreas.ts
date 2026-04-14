import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EstruturaArea {
  id: string;
  name: string;
  color: string | null;
  cluster_id: string;
}

/**
 * Fetches active estrutura_areas filtered by page_categories.
 * Usage: useEstruturaAreas('tax')
 */
export const useEstruturaAreas = (category: string) => {
  return useQuery({
    queryKey: ['estrutura-areas', category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estrutura_areas')
        .select('id, name, color, cluster_id')
        .eq('is_active', true)
        .contains('page_categories', [category])
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
