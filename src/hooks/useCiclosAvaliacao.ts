import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from './useAuditLog';
import { toast } from '@/hooks/use-toast';

export interface CicloAvaliacao {
  id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  data_analise_semestral: string | null;
  status: string;
  descricao: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const TABLE = 'ciclos_avaliacao' as any; // table not in generated types yet

export const useCiclosAvaliacao = (filters?: { status?: string }) => {
  return useQuery<CicloAvaliacao[]>({
    queryKey: ['ciclos_avaliacao', filters],
    queryFn: async () => {
      let q = supabase.from(TABLE).select('*').order('data_inicio', { ascending: false });
      if (filters?.status) q = q.eq('status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CicloAvaliacao[];
    },
  });
};

export const useCicloAtivo = () => {
  return useQuery<CicloAvaliacao | null>({
    queryKey: ['ciclo_ativo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('status', 'em_andamento')
        .order('data_inicio', { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] as CicloAvaliacao) ?? null;
    },
  });
};

export const useCreateCiclo = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (input: Omit<CicloAvaliacao, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase.from(TABLE).insert(input).select().single();
      if (error) throw error;
      return data as CicloAvaliacao;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ciclos_avaliacao'] });
      qc.invalidateQueries({ queryKey: ['ciclo_ativo'] });
      logAction({ area: 'cadastros', entity_type: 'ciclo_avaliacao', entity_id: data.id, entity_name: data.nome, action: 'created' });
      toast({ title: 'Ciclo criado com sucesso' });
    },
    onError: () => toast({ title: 'Erro ao criar ciclo', variant: 'destructive' }),
  });
};

export const useUpdateCiclo = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CicloAvaliacao> & { id: string }) => {
      const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as CicloAvaliacao;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ciclos_avaliacao'] });
      qc.invalidateQueries({ queryKey: ['ciclo_ativo'] });
      logAction({ area: 'cadastros', entity_type: 'ciclo_avaliacao', entity_id: data.id, entity_name: data.nome, action: 'updated' });
      toast({ title: 'Ciclo atualizado' });
    },
    onError: () => toast({ title: 'Erro ao atualizar ciclo', variant: 'destructive' }),
  });
};
