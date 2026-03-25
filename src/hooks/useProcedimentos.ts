import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from 'sonner';

export interface Procedimento {
  id: string;
  source_url: string | null;
  source_type: 'link' | 'pdf' | 'docx';
  arquivo_path: string | null;
  processos_associados: string[];
  ai_titulo: string | null;
  ai_resumo: string | null;
  ai_etapas: string[];
  ai_complexidade: 'simples' | 'intermediario' | 'avancado' | null;
  ai_tags: string[];
  ai_cover_url: string | null;
  status_geracao: 'processando' | 'gerado' | 'erro';
  status_publicacao: 'ativo' | 'em_revisao' | 'arquivado';
  erro_mensagem: string | null;
  confirmado_por: string | null;
  confirmado_em: string | null;
  created_by: string | null;
  updated_at: string;
  created_at: string;
}

interface ProcedimentoFilters {
  search?: string;
  processo?: string;
  complexidade?: string;
  status_publicacao?: string;
}

export function useProcedimentosList(filters: ProcedimentoFilters = {}, pollingEnabled = false) {
  return useQuery({
    queryKey: ['procedimentos', filters],
    queryFn: async () => {
      let query = supabase
        .from('procedimentos' as any) // table not yet in generated types
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.status_publicacao) {
        query = query.eq('status_publicacao', filters.status_publicacao);
      }
      if (filters.complexidade) {
        query = query.eq('ai_complexidade', filters.complexidade);
      }
      if (filters.processo) {
        query = query.contains('processos_associados', [filters.processo]);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = (data || []) as unknown as Procedimento[];

      if (filters.search) {
        const s = filters.search.toLowerCase();
        results = results.filter(
          (p) =>
            p.ai_titulo?.toLowerCase().includes(s) ||
            p.ai_tags?.some((t) => t.toLowerCase().includes(s))
        );
      }

      return results;
    },
    refetchInterval: pollingEnabled ? 3000 : false,
  });
}

export function useCreateProcedimento() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (input: {
      source_type: 'link' | 'pdf' | 'docx';
      source_url?: string;
      arquivo_path?: string;
      processos_associados?: string[];
    }) => {
      const { data, error } = await supabase
        .from('procedimentos' as any)
        .insert({
          source_type: input.source_type,
          source_url: input.source_url || null,
          arquivo_path: input.arquivo_path || null,
          processos_associados: input.processos_associados || [],
          status_geracao: 'processando',
        })
        .select('id')
        .single();

      if (error) throw error;
      const id = (data as any).id;

      // Invoke edge function asynchronously
      supabase.functions.invoke('processar-procedimento', {
        body: { id },
      }).catch((err) => console.error('Edge function invoke error:', err));

      logAction({
        action: 'created',
        entity_type: 'procedimento',
        entity_id: id,
        entity_name: input.source_url || input.arquivo_path || 'Novo procedimento',
        area: 'dev',
      });

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedimentos'] });
      toast.success('Procedimento enviado para análise');
    },
    onError: (err: any) => {
      toast.error('Erro ao criar procedimento: ' + err.message);
    },
  });
}

export function useUpdateProcedimento() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Procedimento>;
    }) => {
      const { error } = await supabase
        .from('procedimentos' as any)
        .update(updates as any)
        .eq('id', id);

      if (error) throw error;

      logAction({
        action: 'updated',
        entity_type: 'procedimento',
        entity_id: id,
        entity_name: updates.ai_titulo || id,
        area: 'dev',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedimentos'] });
    },
    onError: (err: any) => {
      toast.error('Erro ao atualizar: ' + err.message);
    },
  });
}

export function useConfirmProcedimento() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Procedimento> }) => {
      const { error } = await supabase
        .from('procedimentos' as any)
        .update({
          ...updates,
          confirmado_por: user?.id,
          confirmado_em: new Date().toISOString(),
          status_publicacao: 'ativo',
        } as any)
        .eq('id', id);

      if (error) throw error;

      logAction({
        action: 'updated',
        entity_type: 'procedimento',
        entity_id: id,
        entity_name: updates.ai_titulo || id,
        area: 'dev',
        details: 'Procedimento confirmado e publicado',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedimentos'] });
      toast.success('Procedimento confirmado e publicado');
    },
    onError: (err: any) => {
      toast.error('Erro ao confirmar: ' + err.message);
    },
  });
}

export function useRetryProcedimento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Reset status
      await supabase
        .from('procedimentos' as any)
        .update({ status_geracao: 'processando', erro_mensagem: null } as any)
        .eq('id', id);

      // Re-invoke edge function
      supabase.functions.invoke('processar-procedimento', {
        body: { id },
      }).catch((err) => console.error('Retry invoke error:', err));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedimentos'] });
      toast.success('Reprocessando procedimento...');
    },
  });
}

export function useUploadProcedimentoFile() {
  return useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const path = `procedimentos/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from('sop-documents')
        .upload(path, file);

      if (error) throw error;
      return path;
    },
    onError: (err: any) => {
      toast.error('Erro no upload: ' + err.message);
    },
  });
}

export function useDeleteProcedimento() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (proc: Procedimento) => {
      // Delete cover from storage if exists
      if (proc.ai_cover_url) {
        await supabase.storage.from('sop-documents').remove([proc.ai_cover_url]);
      }
      // Delete attached file from storage if exists
      if (proc.arquivo_path) {
        await supabase.storage.from('sop-documents').remove([proc.arquivo_path]);
      }
      // Delete the record
      const { error } = await supabase
        .from('procedimentos' as any)
        .delete()
        .eq('id', proc.id);

      if (error) throw error;

      logAction({
        action: 'deleted',
        entity_type: 'procedimento',
        entity_id: proc.id,
        entity_name: proc.ai_titulo || proc.source_url || 'Procedimento',
        area: 'dev',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedimentos'] });
      toast.success('Procedimento excluído');
    },
    onError: (err: any) => {
      toast.error('Erro ao excluir: ' + err.message);
    },
  });
}

export function useGetSignedUrl() {
  return async (path: string) => {
    const { data, error } = await supabase.storage
      .from('sop-documents')
      .createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  };
}
