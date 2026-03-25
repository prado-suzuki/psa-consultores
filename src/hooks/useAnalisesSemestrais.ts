import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from './useAuditLog';
import { toast } from '@/hooks/use-toast';

export interface AnaliseSemestral {
  id: string;
  ciclo_id: string | null;
  responsavel_id: string | null;
  entregas_realizadas: string | null;
  riscos_identificados: string | null;
  ajustes_necessarios: string | null;
  comentario_lider: string | null;
  comentario_avaliado: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const TABLE = 'analises_semestrais' as any; // table not in generated types yet

export const useAnalisesSemestrais = (cicloId?: string) => {
  return useQuery<AnaliseSemestral[]>({
    queryKey: ['analises_semestrais', cicloId],
    queryFn: async () => {
      let q = supabase.from(TABLE).select('*').order('created_at', { ascending: false });
      if (cicloId) q = q.eq('ciclo_id', cicloId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AnaliseSemestral[];
    },
  });
};

export const useUpsertAnalise = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (input: Omit<AnaliseSemestral, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => {
      if (input.id) {
        const { id, ...updates } = input;
        const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data as AnaliseSemestral;
      }
      const { data, error } = await supabase.from(TABLE).insert(input).select().single();
      if (error) throw error;
      return data as AnaliseSemestral;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['analises_semestrais'] });
      logAction({ area: 'cadastros', entity_type: 'analise_semestral', entity_id: data.id, entity_name: 'Análise Semestral', action: data.status === 'concluida' ? 'updated' : 'created' });
      toast({ title: 'Análise semestral salva' });
    },
    onError: () => toast({ title: 'Erro ao salvar análise', variant: 'destructive' }),
  });
};
