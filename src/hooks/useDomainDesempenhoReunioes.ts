import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ItemAcao1a1 } from '@/hooks/useReunioes1a1';

export const useDesempenhoReunioesItensAcao = () => {
  return useQuery<ItemAcao1a1[]>({
    queryKey: ['itens_acao_1a1_all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('itens_acao_1a1').select('*').order('created_at');
      if (error) throw error;
      return (data ?? []) as unknown as ItemAcao1a1[];
    },
  });
};
