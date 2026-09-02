import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { currentAmbiente } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { avisosDoAmbiente, type NotificacaoInterna } from '@/lib/notificacoesInternas';

/**
 * Caixa de entrada dos avisos internos do sino, lendo `public.notificacao`.
 *
 * É a quarta fonte do sino e a primeira que NÃO é derivada. As outras três
 * (`useTicketNotifications`, `useReviewTaskNotifications`,
 * `useNotificacoesMencao`) recalculam o aviso a partir de um estado que ainda
 * existe, e por isso não davam conta de acontecimento que não deixa rastro, como
 * o cliente anexar um arquivo. Agora há tabela genérica de notificação, e é esta:
 * a linha é gravada pelos triggers da EDU-2 e "não lida" é `lido_em IS NULL`.
 *
 * **Uma ida ao banco só**, ao contrário do hook de menção. Ele faz duas, e a
 * justificativa está nas linhas 27-31 dele: `org_comments_feed` é view e o
 * PostgREST não embute view sem FK declarada, então o comentário precisa de um
 * segundo lote. Aqui título, corpo, entidade e contador já vêm na própria linha —
 * copiar o padrão de duas consultas seria carregar a justificativa sem o problema.
 *
 * **Sem atalho de tipo.** O molde tem duas interfaces locais porque o `types.ts`
 * não conhecia a coluna `motivo` (dívida em `docs/geral/divida-tipos-org-comments.md`).
 * Aqui o `types.ts` já foi regenerado e conhece as 16 colunas de `notificacao` e o
 * enum `notificacao_tipo`, então o tipo real é usado direto.
 */

const LIMITE = 20;
const TABELA = 'notificacao' as const;
const COLUNAS =
  'id, tipo, titulo, corpo, entidade_tipo, entidade_id, href, quantidade, metadata, created_at';

export type { NotificacaoInterna };

export const notificacoesInternasQueryKey = (userId?: string) =>
  ['notificacoes-internas', userId] as const;

export function useNotificacoesInternas() {
  const { user, sessaoExpirada } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const query = useQuery<NotificacaoInterna[]>({
    queryKey: notificacoesInternasQueryKey(userId),
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from(TABELA)
        .select(COLUNAS)
        .eq('destinatario_id', userId)
        .is('lido_em', null)
        .order('created_at', { ascending: false })
        .limit(LIMITE);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // O recorte de ambiente é do lado do cliente de propósito: só parte dos
      // avisos carrega `ambiente` nos metadados, e filtrar no `select`
      // descartaria os que não carregam. Ver `avisosDoAmbiente`.
      return avisosDoAmbiente(data as NotificacaoInterna[], currentAmbiente);
    },
    enabled: !!userId && !sessaoExpirada,
    staleTime: 30000,
    refetchInterval: sessaoExpirada ? false : 30000,
  });

  const marcarComoLidas = useMutation({
    mutationFn: async (avisoIds: string[]) => {
      if (avisoIds.length === 0) return;

      // Sem `assertCanPerform` aqui, como no hook de menção: o pre-check é uma
      // RPC por linha, e a única negação possível seria um aviso de outra
      // pessoa — que esta caixa nunca lista. O `eq` abaixo repete o recorte da
      // RLS em vez de confiar só nela.
      //
      // E `lido_em` é a ÚNICA coluna que o destinatário pode escrever: a EDU-1
      // concedeu privilégio de coluna (`grant update (lido_em)`), então qualquer
      // outro campo neste update volta 42501.
      const { error } = await supabase
        .from(TABELA)
        .update({ lido_em: new Date().toISOString() })
        .in('id', avisoIds)
        .eq('destinatario_id', userId!);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificacoesInternasQueryKey(userId) });
    },
    onError: (error: Error) => toast.error('Erro ao marcar aviso como lido: ' + error.message),
  });

  return {
    notifications: query.data ?? [],
    count: (query.data ?? []).length,
    isLoading: query.isLoading,
    refetch: query.refetch,
    marcarComoLidas,
  };
}
