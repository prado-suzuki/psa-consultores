import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProcessImprovement {
  id: string;
  created_at: string;
  evaluation_status: string | null;
  improvement_description: string | null;
  baseline_time_hours: number | null;
  improved_time_hours: number | null;
  baseline_cost_monthly: number | null;
  improved_cost_monthly: number | null;
  baseline_people_involved: number | null;
  improved_people_involved: number | null;
  time_saved_hours: number | null;
  time_saved_percent: number | null;
  cost_saved_monthly: number | null;
  cost_saved_percent: number | null;
  roi_percentage: number | null;
  evaluation_period_days: number | null;
  evaluated_by: string | null;
  system_savings_monthly: number | null;
  build_vs_buy_savings: number | null;
  other_savings_monthly: number | null;
}

export interface SavingsDetail {
  id: string;
  savings_type: string;
  description: string;
  cost_before: number | null;
  cost_after: number | null;
  savings_value: number;
  is_monthly: boolean;
}

interface DomainImprovementHistoryData {
  improvements: ProcessImprovement[];
  savingsDetails: Record<string, SavingsDetail[]>;
}

const improvementHistoryKeys = {
  process: (processId: string) => ['domain-improvement-history', processId] as const,
};

export function useDomainImprovementHistory(processId: string, open: boolean) {
  const queryClient = useQueryClient();
  const queryKey = improvementHistoryKeys.process(processId);

  const query = useQuery<DomainImprovementHistoryData>({
    queryKey,
    enabled: open && Boolean(processId),
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('process_improvements')
          .select('*')
          .eq('process_id', processId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const improvements = (data || []) as ProcessImprovement[];
        let savingsDetails =
          queryClient.getQueryData<DomainImprovementHistoryData>(queryKey)?.savingsDetails || {};

        // Buscar detalhes das economias para cada melhoria
        if (improvements.length > 0) {
          const improvementIds = improvements.map((improvement) => improvement.id);
          const { data: details, error: detailsError } = await supabase
            .from('improvement_savings_details')
            .select('*')
            .in('improvement_id', improvementIds);

          if (!detailsError && details) {
            // Agrupar por improvement_id
            const grouped: Record<string, SavingsDetail[]> = {};
            details.forEach((detail) => {
              if (!grouped[detail.improvement_id]) {
                grouped[detail.improvement_id] = [];
              }
              grouped[detail.improvement_id].push(detail);
            });
            savingsDetails = grouped;
          }
        }

        return { improvements, savingsDetails };
      } catch (error) {
        console.error('Error fetching improvements:', error);
        throw error;
      }
    },
    placeholderData: keepPreviousData,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    improvements: query.data?.improvements || [],
    savingsDetails: query.data?.savingsDetails || {},
    isLoading: query.isFetching,
    error: query.error,
  };
}
