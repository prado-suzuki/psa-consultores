import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from './useAuditLog';
import { toast } from '@/hooks/use-toast';

export interface KpiMeta {
  id: string;
  meta_id: string;
  nome: string;
  descricao: string | null;
  valor_alvo: number;
  valor_atual: number;
  unidade: string | null;
  created_at: string;
  updated_at: string;
}

const TABLE = 'kpis_meta' as any; // table not in generated types yet

export const useKpisMeta = (metaId?: string) => {
  return useQuery<KpiMeta[]>({
    queryKey: ['kpis_meta', metaId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLE).select('*').eq('meta_id', metaId!).order('created_at');
      if (error) throw error;
      return (data ?? []) as unknown as KpiMeta[];
    },
    enabled: !!metaId,
  });
};

export const useCreateKpi = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (input: Omit<KpiMeta, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from(TABLE).insert(input).select().single();
      if (error) throw error;
      return data as unknown as KpiMeta;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['kpis_meta'] });
      logAction({ area: 'cadastros', entity_type: 'kpi_meta', entity_id: data.id, entity_name: data.nome, action: 'created' });
    },
  });
};

export const useUpdateKpi = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<KpiMeta> & { id: string }) => {
      const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as unknown as KpiMeta;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['kpis_meta'] });
      logAction({ area: 'cadastros', entity_type: 'kpi_meta', entity_id: data.id, entity_name: data.nome, action: 'updated' });
    },
  });
};

export const useDeleteKpi = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kpis_meta'] });
    },
  });
};
