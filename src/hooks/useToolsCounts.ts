import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ToolsCounts {
  total: number;
  inDevelopment: number;
  released: number;
  byStatus: Record<string, number>;
}

const EMPTY_COUNTS: ToolsCounts = {
  total: 0,
  inDevelopment: 0,
  released: 0,
  byStatus: {},
};

export const useToolsCounts = () => {
  return useQuery<ToolsCounts>({
    queryKey: ['tools-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tools').select('status');
      if (error) throw error;

      const rows = (data ?? []) as { status: string | null }[];
      const byStatus = rows.reduce<Record<string, number>>((acc, row) => {
        const key = row.status ?? 'unknown';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});

      return {
        total: rows.length,
        inDevelopment: byStatus['development'] ?? 0,
        released: byStatus['released'] ?? 0,
        byStatus,
      };
    },
    placeholderData: EMPTY_COUNTS,
  });
};
