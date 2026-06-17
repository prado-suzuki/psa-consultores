import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Notificações de mudança de variável na tela Gerar Documento. Não há tabela
// materializada: as notificações são DERIVADAS de audit_logs por uma janela
// temporal — audit_log.performed_at > GREATEST(snapshot_validado_em, visto_em),
// restrita às entidades que hidratam o documento (ver §5 do plano). "Validar"
// move snapshot_validado_em; "Marcar como lido" move visto_em (por usuário).

/** Linha de audit_logs já recortada para a notificação (modelo de evento). */
export interface NotificacaoLog {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  action: string;
  changed_fields: Record<string, { old: unknown; new: unknown }> | null;
  performed_by: string;
  performed_at: string;
}

/**
 * Mapa id→nome dos autores (profiles), para resolver `performed_by` em "por
 * Fulano". Mesma queryKey da tabela de auditoria — compartilha o cache.
 */
export function useAuditAutores() {
  return useQuery({
    queryKey: ['audit-lookup-profiles'],
    queryFn: async (): Promise<Record<string, string>> => {
      const { data } = await supabase.from('profiles').select('id, first_name, last_name');
      const map: Record<string, string> = {};
      for (const p of data ?? []) {
        map[p.id] = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
      }
      return map;
    },
  });
}

/** Marca d'água deste usuário para o documento (ISO) ou null se nunca leu. */
export function useNotificacaoVisto(documentoGeradoId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notificacao-visto', documentoGeradoId, user?.id],
    enabled: !!documentoGeradoId && !!user?.id,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from('documento_notificacao_visto')
        .select('visto_em')
        .eq('documento_gerado_id', documentoGeradoId!)
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.visto_em ?? null;
    },
  });
}

/** "Marcar como lido": carimba visto_em = agora (upsert por usuário+documento). */
export function useMarcarNotificacoesVistas() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (documentoGeradoId: string) => {
      const { error } = await supabase
        .from('documento_notificacao_visto')
        .upsert(
          {
            user_id: user!.id,
            documento_gerado_id: documentoGeradoId,
            visto_em: new Date().toISOString(),
          },
          { onConflict: 'user_id,documento_gerado_id' },
        );
      if (error) throw error;
    },
    onSuccess: (_r, documentoGeradoId) => {
      queryClient.invalidateQueries({ queryKey: ['notificacao-visto', documentoGeradoId] });
      queryClient.invalidateQueries({ queryKey: ['notificacoes-documento', documentoGeradoId] });
    },
  });
}

interface NotificacoesParams {
  documentoGeradoId: string | null;
  /** documento_gerado.snapshot_validado_em — início da janela. */
  validadoEm: string | null;
  /** marca d'água deste usuário (useNotificacaoVisto). */
  vistoEm: string | null;
  /** entidades que hidratam o documento (ver §5). */
  entidadeIds: string[];
}

/**
 * Mudanças (audit_logs) nas entidades do documento desde o maior entre
 * `validadoEm` e `vistoEm`. Tudo que volta está na janela ⇒ é "não-lido": a
 * contagem do badge é o tamanho da lista. Sem validação não há janela.
 */
export function useNotificacoesDocumento({
  documentoGeradoId,
  validadoEm,
  vistoEm,
  entidadeIds,
}: NotificacoesParams) {
  // ISO ordena lexicograficamente = cronologicamente: o último é o mais recente.
  const desde = [validadoEm, vistoEm].filter((v): v is string => !!v).sort().at(-1) ?? null;
  return useQuery({
    queryKey: ['notificacoes-documento', documentoGeradoId, desde, entidadeIds],
    enabled: !!documentoGeradoId && !!desde && entidadeIds.length > 0,
    queryFn: async (): Promise<NotificacaoLog[]> => {
      // Decisão de produto (default = incluir): mostramos também as mudanças
      // feitas pelo próprio usuário. Para excluí-las, filtrar aqui por
      // `.neq('performed_by', user.id)` (ou no cliente).
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, entity_type, entity_id, entity_name, action, changed_fields, performed_by, performed_at')
        .eq('area', 'osg')
        .in('entity_id', entidadeIds)
        .gt('performed_at', desde!)
        .order('performed_at', { ascending: false });
      if (error) throw error;
      // changed_fields chega como Json no tipo gerado; o shape real é o do diff.
      return (data ?? []) as unknown as NotificacaoLog[];
    },
  });
}
