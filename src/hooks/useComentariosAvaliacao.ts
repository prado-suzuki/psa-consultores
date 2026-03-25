import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from './useAuditLog';
import { toast } from '@/hooks/use-toast';

export interface ComentarioAvaliacao {
  id: string;
  ciclo_id: string | null;
  autor_id: string;
  destinatario_id: string | null;
  tipo: 'lider_para_membro' | 'membro_resposta' | 'membro_ponto_vista';
  conteudo: string;
  visivel_para_membro: boolean;
  lido: boolean;
  lido_em: string | null;
  created_at: string;
  updated_at: string;
}

const TABLE = 'comentarios_avaliacao' as any; // table not in generated types yet

export const useComentarios = (filters?: { ciclo_id?: string; destinatario_id?: string; tipo?: string }) => {
  return useQuery<ComentarioAvaliacao[]>({
    queryKey: ['comentarios_avaliacao', filters],
    queryFn: async () => {
      let q = supabase.from(TABLE).select('*').order('created_at', { ascending: false });
      if (filters?.ciclo_id) q = q.eq('ciclo_id', filters.ciclo_id);
      if (filters?.destinatario_id) q = q.eq('destinatario_id', filters.destinatario_id);
      if (filters?.tipo) q = q.eq('tipo', filters.tipo);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ComentarioAvaliacao[];
    },
    enabled: !!filters?.ciclo_id,
  });
};

export const useUnreadCommentCount = (userId?: string) => {
  return useQuery<number>({
    queryKey: ['unread_comments_count', userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from(TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('destinatario_id', userId)
        .eq('tipo', 'lider_para_membro')
        .eq('lido', false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
  });
};

export const useCreateComentario = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<ComentarioAvaliacao, 'id' | 'created_at' | 'updated_at' | 'lido' | 'lido_em'>) => {
      const { data, error } = await supabase.from(TABLE).insert({ ...input, autor_id: input.autor_id || user?.id }).select().single();
      if (error) throw error;
      return data as unknown as ComentarioAvaliacao;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['comentarios_avaliacao'] });
      qc.invalidateQueries({ queryKey: ['unread_comments_count'] });
      logAction({ area: 'cadastros', entity_type: 'feedback', entity_id: data.id, entity_name: `Comentario ${data.tipo}`, action: 'created' });
      toast({ title: 'Comentario enviado' });
    },
    onError: () => toast({ title: 'Erro ao enviar comentario', variant: 'destructive' }),
  });
};

export const useUpdateComentario = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ComentarioAvaliacao> & { id: string }) => {
      const { data, error } = await supabase.from(TABLE).update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data as unknown as ComentarioAvaliacao;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['comentarios_avaliacao'] });
      logAction({ area: 'cadastros', entity_type: 'feedback', entity_id: data.id, entity_name: `Comentario ${data.tipo}`, action: 'updated' });
    },
    onError: () => toast({ title: 'Erro ao atualizar comentario', variant: 'destructive' }),
  });
};

export const useMarkComentarioRead = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).update({ lido: true, lido_em: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comentarios_avaliacao'] });
      qc.invalidateQueries({ queryKey: ['unread_comments_count'] });
    },
  });
};
