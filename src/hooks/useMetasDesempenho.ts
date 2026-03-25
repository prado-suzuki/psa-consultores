import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from './useAuditLog';
import { toast } from '@/hooks/use-toast';

export interface Meta {
  id: string;
  ciclo_id: string | null;
  meta_pai_id: string | null;
  nivel: 'empresa' | 'equipe' | 'individual';
  dimensao: 'entrega' | 'impacto' | 'gestao';
  titulo: string;
  descricao: string | null;
  criterio_evidencia: string | null;
  prazo: string | null;
  peso: number;
  responsavel_id: string | null;
  
  progresso_atual: number;
  classificacao_final: string | null;
  ajuste_qualitativo: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const TABLE = 'metas' as any; // table not in generated types yet

export const useMetas = (filters?: { ciclo_id?: string; nivel?: string; dimensao?: string; responsavel_id?: string; status?: string }) => {
  return useQuery<Meta[]>({
    queryKey: ['metas', filters],
    queryFn: async () => {
      let q = supabase.from(TABLE).select('*').order('nivel').order('titulo');
      if (filters?.ciclo_id) q = q.eq('ciclo_id', filters.ciclo_id);
      if (filters?.nivel) q = q.eq('nivel', filters.nivel);
      if (filters?.dimensao) q = q.eq('dimensao', filters.dimensao);
      if (filters?.responsavel_id) q = q.eq('responsavel_id', filters.responsavel_id);
      if (filters?.status) q = q.eq('status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Meta[];
    },
    enabled: !!filters?.ciclo_id,
  });
};

export const useCreateMeta = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (input: Omit<Meta, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'progresso_atual' | 'classificacao_final' | 'ajuste_qualitativo'>) => {
      const { data, error } = await supabase.from(TABLE).insert(input).select().single();
      if (error) throw error;
      return data as unknown as Meta;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['metas'] });
      logAction({ area: 'cadastros', entity_type: 'meta', entity_id: data.id, entity_name: data.titulo, action: 'created' });
      toast({ title: 'Meta criada com sucesso' });
    },
    onError: () => toast({ title: 'Erro ao criar meta', variant: 'destructive' }),
  });
};

export const useUpdateMeta = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Meta> & { id: string }) => {
      const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as unknown as Meta;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['metas'] });
      logAction({ area: 'cadastros', entity_type: 'meta', entity_id: data.id, entity_name: data.titulo, action: 'updated' });
      toast({ title: 'Meta atualizada' });
    },
    onError: () => toast({ title: 'Erro ao atualizar meta', variant: 'destructive' }),
  });
};

export const useUpdateMetaProgress = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();
  const UPDATES_TABLE = 'atualizacoes_meta' as any; // table not in generated types yet

  return useMutation({
    mutationFn: async ({ meta_id, progresso_anterior, progresso_novo, comentario }: { meta_id: string; progresso_anterior: number; progresso_novo: number; comentario: string }) => {
      const { error: logErr } = await supabase.from(UPDATES_TABLE).insert({ meta_id, progresso_anterior, progresso_novo, comentario });
      if (logErr) throw logErr;
      const { data, error } = await supabase.from(TABLE).update({ progresso_atual: progresso_novo }).eq('id', meta_id).select().single();
      if (error) throw error;
      return data as unknown as Meta;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['metas'] });
      qc.invalidateQueries({ queryKey: ['atualizacoes_meta'] });
      logAction({ area: 'cadastros', entity_type: 'meta', entity_id: data.id, entity_name: data.titulo, action: 'updated', details: `Progresso: ${data.progresso_atual}%` });
      toast({ title: 'Progresso atualizado' });
    },
    onError: () => toast({ title: 'Erro ao atualizar progresso', variant: 'destructive' }),
  });
};
