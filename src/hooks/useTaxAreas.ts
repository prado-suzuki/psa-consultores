import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaxArea {
  id: string;
  name: string;
}

export const useTaxAreas = () => {
  return useQuery({
    queryKey: ['tax-areas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estrutura_areas')
        .select('id, name')
        .contains('page_categories', ['tax'])
        .order('name');
      if (error) throw error;
      return (data || []) as TaxArea[];
    },
  });
};
