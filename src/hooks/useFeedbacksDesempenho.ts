import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from './useAuditLog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface Feedback {
  id: string;
  ciclo_id: string | null;
  tipo: 'reconhecimento' | 'desenvolvimento' | '360';
  de_usuario_id: string | null;
  para_usuario_id: string | null;
  contexto: string;
  comportamento: string;
  impacto: string;
  anonimo: boolean;
  visivel_para_avaliado: boolean;
  created_at: string;
}

const TABLE = 'feedbacks' as any; // table not in generated types yet

export const useFeedbacks = (filters?: { ciclo_id?: string; para_usuario_id?: string }) => {
  return useQuery<Feedback[]>({
    queryKey: ['feedbacks', filters],
    queryFn: async () => {
      let q = supabase.from(TABLE).select('*').order('created_at', { ascending: false });
      if (filters?.ciclo_id) q = q.eq('ciclo_id', filters.ciclo_id);
      if (filters?.para_usuario_id) q = q.eq('para_usuario_id', filters.para_usuario_id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Feedback[];
    },
  });
};

export const useCreateFeedback = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<Feedback, 'id' | 'created_at'>) => {
      const payload = { ...input, de_usuario_id: input.anonimo ? null : (input.de_usuario_id ?? user?.id) };
      const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
      if (error) throw error;
      return data as Feedback;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['feedbacks'] });
      logAction({ area: 'cadastros', entity_type: 'feedback', entity_id: data.id, entity_name: data.tipo, action: 'created' });
      toast({ title: 'Feedback registrado' });
    },
    onError: () => toast({ title: 'Erro ao registrar feedback', variant: 'destructive' }),
  });
};
