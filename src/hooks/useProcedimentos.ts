import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';
import { PROCESSANDO_TIMEOUT_MIN } from '@/components/equipe/dev/procedimentos/theme';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ProcedimentoRow = Database['public']['Tables']['procedimentos']['Row'];

export type StatusGeracao = 'processando' | 'gerado' | 'erro';
export type StatusPublicacao = 'ativo' | 'arquivado';

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
  status_geracao: StatusGeracao;
  status_publicacao: StatusPublicacao;
  erro_mensagem: string | null;
  confirmado_por: string | null;
  confirmado_em: string | null;
  created_by: string | null;
  updated_at: string;
  created_at: string;
}

/**
 * A linha do banco chega com tudo anulável e com `ai_etapas` como `Json` (a
 * coluna é jsonb). Normalizar aqui é o que permite o resto do módulo trabalhar
 * com `Procedimento` de verdade — antes o arquivo inteiro rodava atrás de um
 * `from('procedimentos' as any)` com o comentário "table not yet in generated
 * types", que já não era verdade, e por isso cada campo precisava de um
 * `as any` na volta.
 *
 * `em_revisao` existe no CHECK da tabela mas nunca foi escrito por ninguém;
 * registro antigo com esse valor é lido como 'ativo'.
 */
function normalizar(row: ProcedimentoRow): Procedimento {
  return {
    id: row.id,
    source_url: row.source_url,
    source_type: (row.source_type as Procedimento['source_type']) ?? 'link',
    arquivo_path: row.arquivo_path,
    processos_associados: row.processos_associados ?? [],
    ai_titulo: row.ai_titulo,
    ai_resumo: row.ai_resumo,
    ai_etapas: Array.isArray(row.ai_etapas) ? (row.ai_etapas as unknown[]).map(String) : [],
    ai_complexidade: (row.ai_complexidade as Procedimento['ai_complexidade']) ?? null,
    ai_tags: row.ai_tags ?? [],
    ai_cover_url: row.ai_cover_url,
    status_geracao: (row.status_geracao as StatusGeracao) ?? 'processando',
    status_publicacao: row.status_publicacao === 'arquivado' ? 'arquivado' : 'ativo',
    erro_mensagem: row.erro_mensagem,
    confirmado_por: row.confirmado_por,
    confirmado_em: row.confirmado_em,
    created_by: row.created_by,
    updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

interface ProcedimentoFilters {
  search?: string;
  processo?: string;
  complexity_level?: string;
  status_publicacao?: string;
}

/**
 * Expira procedimentos travados. Vive FORA do `queryFn` da listagem de
 * propósito: lá dentro, com o texto da busca dentro da `queryKey`, cada letra
 * digitada disparava um UPDATE no banco. Aqui roda uma vez por montagem da
 * página.
 */
export function useExpirarProcedimentosTravados() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('mark_stuck_procedimentos', {
        timeout_minutes: PROCESSANDO_TIMEOUT_MIN,
      });
      if (error) throw error;
      return data ?? 0;
    },
    onSuccess: (quantos) => {
      if (quantos > 0) queryClient.invalidateQueries({ queryKey: ['procedimentos'] });
    },
    onError: (err) => {
      // Não é erro de usuário: quem não tem permissão simplesmente não expira nada.
      console.warn('mark_stuck_procedimentos falhou (ignorado):', err);
    },
  });
}

export function useProcedimentosList(filters: ProcedimentoFilters = {}) {
  return useQuery({
    queryKey: ['procedimentos', filters],
    queryFn: async () => {
      let query = supabase
        .from('procedimentos')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.status_publicacao) {
        query = query.eq('status_publicacao', filters.status_publicacao);
      }
      if (filters.complexity_level) {
        query = query.eq('ai_complexidade', filters.complexity_level);
      }
      if (filters.processo) {
        query = query.contains('processos_associados', [filters.processo]);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = (data ?? []).map(normalizar);

      if (filters.search) {
        const s = filters.search.toLowerCase();
        results = results.filter(
          (p) =>
            p.ai_titulo?.toLowerCase().includes(s) ||
            p.ai_resumo?.toLowerCase().includes(s) ||
            p.ai_tags.some((t) => t.toLowerCase().includes(s)) ||
            p.ai_etapas.some((e) => e.toLowerCase().includes(s))
        );
      }

      return results;
    },
    // Polling apenas enquanto houver itens em processamento "fresco".
    // Itens travados ficam fora para não gerar loop infinito de refetch.
    refetchInterval: (query) => {
      const data = query.state.data as Procedimento[] | undefined;
      if (!data || data.length === 0) return false;
      const cutoff = Date.now() - PROCESSANDO_TIMEOUT_MIN * 60 * 1000;
      const hasFresh = data.some(
        (p) => p.status_geracao === 'processando' && new Date(p.created_at).getTime() > cutoff
      );
      return hasFresh ? 3000 : false;
    },
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
        .from('procedimentos')
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
      const id = data.id;

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
      toast.success('Documento enviado para leitura. O card aparece aqui em alguns minutos.');
    },
    onError: (err: Error) => {
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
      detalhe,
    }: {
      id: string;
      updates: Partial<Procedimento>;
      detalhe?: string;
    }) => {
      await assertCanPerform('procedimentos', 'update', id);
      const { error } = await supabase
        .from('procedimentos')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      logAction({
        action: 'updated',
        entity_type: 'procedimento',
        entity_id: id,
        entity_name: updates.ai_titulo || id,
        area: 'dev',
        details: detalhe,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedimentos'] });
      toast.success('Procedimento atualizado');
    },
    onError: (err: Error) => {
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
      await assertCanPerform('procedimentos', 'update', id);
      const { error } = await supabase
        .from('procedimentos')
        .update({
          ...updates,
          confirmado_por: user?.id,
          confirmado_em: new Date().toISOString(),
          status_publicacao: 'ativo',
          // Sem isto, confirmar um procedimento que veio de 'erro' (o caminho
          // "Preencher manualmente") deixava o card renderizando erro para
          // sempre e o mantinha invisível para o time — a RLS de team_member
          // exige status_geracao = 'gerado'.
          status_geracao: 'gerado',
          erro_mensagem: null,
        })
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
    onError: (err: Error) => {
      toast.error('Erro ao confirmar: ' + err.message);
    },
  });
}

export function useArquivarProcedimento() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ proc, arquivar }: { proc: Procedimento; arquivar: boolean }) => {
      await assertCanPerform('procedimentos', 'update', proc.id);
      const { error } = await supabase
        .from('procedimentos')
        .update({ status_publicacao: arquivar ? 'arquivado' : 'ativo' })
        .eq('id', proc.id);

      if (error) throw error;

      logAction({
        action: 'updated',
        entity_type: 'procedimento',
        entity_id: proc.id,
        entity_name: proc.ai_titulo || proc.id,
        area: 'dev',
        details: arquivar ? 'Procedimento arquivado' : 'Procedimento reativado',
      });
      return arquivar;
    },
    onSuccess: (arquivou) => {
      queryClient.invalidateQueries({ queryKey: ['procedimentos'] });
      toast.success(arquivou ? 'Procedimento arquivado' : 'Procedimento reativado');
    },
    onError: (err: Error) => {
      toast.error('Erro ao arquivar: ' + err.message);
    },
  });
}

export function useRetryProcedimento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Reset status
      await assertCanPerform('procedimentos', 'update', id);
      await supabase
        .from('procedimentos')
        .update({ status_geracao: 'processando', erro_mensagem: null })
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
    onError: (err: Error) => {
      toast.error('Erro no upload: ' + err.message);
    },
  });
}

export function useDeleteProcedimento() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (proc: Procedimento) => {
      // Precheck antes do storage — evita arquivos órfãos se RLS bloquear o delete da tabela
      await assertCanPerform('procedimentos', 'delete', proc.id);

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
        .from('procedimentos')
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
    onError: (err: Error) => {
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
