import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  buildAnaliseInteligenteRequestPayload,
  type AnaliseInteligenteAnalysis,
  type AnaliseInteligenteFilters,
} from '@/lib/analiseInteligente';

interface AnaliseInteligenteEdgeResponse {
  analise: AnaliseInteligenteAnalysis;
  error?: string;
}

export function useDomainAnaliseInteligenteAnalysis() {
  return useMutation({
    mutationKey: ['domain-analise-inteligente', 'analysis'],
    retry: false,
    mutationFn: async (filters: AnaliseInteligenteFilters) => {
      const { data, error } = await supabase.functions.invoke<AnaliseInteligenteEdgeResponse>(
        'analise-inteligente-sprints',
        { body: buildAnaliseInteligenteRequestPayload(filters) },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.analise;
    },
  });
}
