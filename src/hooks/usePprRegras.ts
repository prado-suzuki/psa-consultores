import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from './useAuditLog';
import { toast } from '@/hooks/use-toast';

export interface PprRegra {
  id: string;
  ciclo_id: string | null;
  faixa_minima: number;
  faixa_maxima: number | null;
  classificacao: 'supera' | 'atende' | 'atende_parcialmente' | 'abaixo';
  multiplicador_bonus: number;
  descricao_publica: string | null;
  created_at: string;
}

const TABLE = 'ppr_regras_ciclo' as any; // table not in generated types yet

export const usePprRegras = (cicloId?: string) => {
  return useQuery<PprRegra[]>({
    queryKey: ['ppr_regras', cicloId],
    queryFn: async () => {
      let q = supabase.from(TABLE).select('*').order('faixa_minima', { ascending: false });
      if (cicloId) q = q.eq('ciclo_id', cicloId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PprRegra[];
    },
    enabled: !!cicloId,
  });
};

export const useCreatePprRegra = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (input: Omit<PprRegra, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from(TABLE).insert(input).select().single();
      if (error) throw error;
      return data as unknown as PprRegra;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ppr_regras'] });
      logAction({ area: 'cadastros', entity_type: 'kpi_meta', entity_id: data.id, entity_name: `Regra PPR ${data.classificacao}`, action: 'created' });
      toast({ title: 'Regra PPR criada' });
    },
    onError: () => toast({ title: 'Erro ao criar regra PPR', variant: 'destructive' }),
  });
};

export const useUpdatePprRegra = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PprRegra> & { id: string }) => {
      const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as unknown as PprRegra;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ppr_regras'] });
      logAction({ area: 'cadastros', entity_type: 'kpi_meta', entity_id: data.id, entity_name: `Regra PPR ${data.classificacao}`, action: 'updated' });
      toast({ title: 'Regra PPR atualizada' });
    },
    onError: () => toast({ title: 'Erro ao atualizar regra PPR', variant: 'destructive' }),
  });
};
