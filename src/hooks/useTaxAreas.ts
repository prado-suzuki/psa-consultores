import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaxArea {
  id: string;
  nome: string;
  estrutura_area_id: string | null;
}

export const useTaxAreas = () => {
  return useQuery({
    queryKey: ['tax-areas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_areas')
        .select('id, nome, estrutura_area_id')
        .order('nome');
      if (error) throw error;
      return (data || []) as TaxArea[];
    },
  });
};
