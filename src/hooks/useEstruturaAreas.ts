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
