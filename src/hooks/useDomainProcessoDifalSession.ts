import { useMutation } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config/api';
import { useApiAuth } from '@/hooks/useApiAuth';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';
import { supabase } from '@/integrations/supabase/client';
import { buildProcessoDifalSyncPayload } from '@/lib/processoDifal';
import type { DifalGroupedItem } from '@/types/difal';

interface RestoredSession {
  id: string;
  clienteId: string;
  status: string;
  request: {
    contribuinte_id?: string;
    data_inicio?: string;
    data_fim?: string;
  };
  decisionsCount: number;
}

interface SearchSessionInput {
  userId: string;
  clienteId: string;
  clienteNome: string;
  contribuinteId: string;
  startDate: string;
  endDate: string;
}

interface SearchSessionResult {
  sessionId: string;
  existingSession: boolean;
  decisionsCount: number;
}

interface SyncSessionInput {
  sessionId: string;
  groupedItems: DifalGroupedItem[];
}

export function useDomainProcessoDifalSession() {
  const { fetchWithAuth } = useApiAuth();

  const restoreSessionMutation = useMutation<RestoredSession | null, Error, string>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (userId) => {
      const { data: session, error } = await supabase
        .from('difal_sessao')
        .select('*')
        .eq('usuario_id', userId)
        .eq('status', 'EM_ANDAMENTO')
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !session) return null;
      const { count } = await supabase
        .from('difal_decisao')
        .select('*', { count: 'exact', head: true })
        .eq('sessao_id', session.id);
      return {
        id: session.id,
        clienteId: session.cliente_id,
        status: session.status,
        request: session.request_original as RestoredSession['request'],
        decisionsCount: count || 0,
      };
    },
  });

  const searchSessionMutation = useMutation<SearchSessionResult, Error, SearchSessionInput>({
    networkMode: 'always',
    retry: false,
    mutationFn: async ({ userId, clienteId, clienteNome, contribuinteId, startDate, endDate }) => {
      const { data: existingSession } = await supabase
        .from('difal_sessao')
        .select('id')
        .eq('usuario_id', userId)
        .eq('status', 'EM_ANDAMENTO')
        .maybeSingle();
      const requestOriginal = {
        contribuinte_id: contribuinteId,
        data_inicio: startDate,
        data_fim: endDate,
      };
      let sessionId: string;
      if (existingSession) {
        await assertCanPerform('difal_sessao', 'update', existingSession.id);
        const { error } = await supabase
          .from('difal_sessao')
          .update({
            cliente_id: clienteId,
            cliente_nome: clienteNome,
            periodo: `${startDate} a ${endDate}`,
            uf: 'MT',
            request_original: requestOriginal,
          })
          .eq('id', existingSession.id);
        if (error) throw error;
        sessionId = existingSession.id;
      } else {
        const { data: session, error } = await supabase
          .from('difal_sessao')
          .insert({
            usuario_id: userId,
            cliente_id: clienteId,
            cliente_nome: clienteNome,
            periodo: `${startDate} a ${endDate}`,
            uf: 'MT',
            request_original: requestOriginal,
            status: 'EM_ANDAMENTO',
          })
          .select('id')
          .single();
        if (error) throw error;
        sessionId = session.id;
      }
      const { count } = await supabase
        .from('difal_decisao')
        .select('*', { count: 'exact', head: true })
        .eq('sessao_id', sessionId);
      return { sessionId, existingSession: !!existingSession, decisionsCount: count || 0 };
    },
  });

  const syncSessionMutation = useMutation<number, Error, SyncSessionInput>({
    networkMode: 'always',
    retry: false,
    mutationFn: async ({ sessionId, groupedItems }) => {
      const { data: decisions, error } = await supabase
        .from('difal_decisao')
        .select('*')
        .eq('sessao_id', sessionId);
      if (error) throw error;
      await assertCanPerform('difal_sessao', 'update', sessionId);
      if (decisions && decisions.length > 0) {
        await assertCanPerform('difal_decisao', 'delete', decisions[0].id);
      }
      const payload = buildProcessoDifalSyncPayload(sessionId, decisions || [], groupedItems);
      const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/classificacoes/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Erro ao sincronizar classificações');
      await supabase
        .from('difal_sessao')
        .update({
          status: 'FINALIZADO',
          sincronizado_em: new Date().toISOString(),
        })
        .eq('id', sessionId);
      await supabase.from('difal_decisao').delete().eq('sessao_id', sessionId);
      return decisions?.length || 0;
    },
  });

  return { restoreSessionMutation, searchSessionMutation, syncSessionMutation };
}
