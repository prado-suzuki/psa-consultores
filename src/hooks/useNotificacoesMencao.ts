import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { buscarComentariosPorId } from '@/hooks/useDomainOrgComments';
import { supabase } from '@/integrations/supabase/client';
import {
  mencoesDosComentarios,
  montarNotificacoesDeMencao,
  type MencaoNotificacao,
} from '@/lib/mencaoNotificacoes';

/**
 * Caixa de entrada das menções em comentários de tarefa e projeto.
 *
 * Segue o padrão DERIVADO das outras notificações do sino (`useTicketNotifications`,
 * `useReviewTaskNotifications`): não há tabela genérica de notificação — a
 * notificação é a própria linha de `org_comment_mentions` com `lido_em IS NULL`,
 * que a RPC `criar_org_comment` grava junto do comentário. Ou seja, mencionar
 * alguém já gera a notificação; o que este hook faz é ler a caixa e carimbar a
 * leitura.
 *
 * São duas idas ao banco de propósito. A primeira lê as menções pendentes (a
 * tabela é indexada exatamente para isso: `mentioned_user_id` + `lido_em IS NULL`);
 * a segunda hidrata os comentários pela view, num lote só. Não dá para juntar em
 * um `select` embutido: `org_comments_feed` é view, e o PostgREST não embute view
 * (sem FK declarada) — e é a view que traz título da entidade e nome do projeto.
 */

const LIMITE = 20;
const TABELA = 'org_comment_mentions';

export type { MencaoNotificacao };

export const notificacoesMencaoQueryKey = (userId?: string) =>
  ['mencao-notifications', userId] as const;

export function useNotificacoesMencao() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const query = useQuery<MencaoNotificacao[]>({
    queryKey: notificacoesMencaoQueryKey(userId),
    queryFn: async () => {
      if (!userId) return [];

      const { data: mencoes, error } = await supabase
        .from(TABELA)
        .select('id, comment_id, created_at')
        .eq('mentioned_user_id', userId)
        .is('lido_em', null)
        .order('created_at', { ascending: false })
        .limit(LIMITE);

      if (error) throw error;
      if (!mencoes || mencoes.length === 0) return [];

      const comentarios = await buscarComentariosPorId(
        mencoes.map((mencao) => mencao.comment_id),
      );
      return montarNotificacoesDeMencao(mencoes, comentarios, userId);
    },
    enabled: !!userId,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const marcarComoLidas = useMutation({
    mutationFn: async (mencaoIds: string[]) => {
      if (mencaoIds.length === 0) return;

      // Sem `assertCanPerform` aqui, ao contrário das mutations de conteúdo: o
      // pre-check é uma RPC por linha, e a única negação possível seria uma
      // menção de outra pessoa — que esta caixa nunca lista. O `eq` abaixo
      // repete o recorte da RLS em vez de confiar só nela.
      const { error } = await supabase
        .from(TABELA)
        .update({ lido_em: new Date().toISOString() })
        .in('id', mencaoIds)
        .eq('mentioned_user_id', userId!);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificacoesMencaoQueryKey(userId) });
    },
    onError: (error: Error) => toast.error('Erro ao marcar menção como lida: ' + error.message),
  });

  return {
    notifications: query.data ?? [],
    count: (query.data ?? []).length,
    isLoading: query.isLoading,
    refetch: query.refetch,
    marcarComoLidas,
  };
}

/**
 * Baixa o sino das menções que estão na thread aberta.
 *
 * Sem isto, ler o comentário na tarefa não limpa a notificação, e o contador
 * fica pendurado até alguém clicar no item do sino. Só grava quando há
 * interseção — thread sem menção minha não faz nenhuma escrita.
 */
export function useMarcarMencoesLidasDaThread(commentIds: string[]) {
  const { notifications, marcarComoLidas } = useNotificacoesMencao();
  const emVoo = useRef(false);
  const chave = commentIds.join('|');

  useEffect(() => {
    const pendentes = mencoesDosComentarios(notifications, commentIds);
    if (pendentes.length === 0 || emVoo.current) return;

    emVoo.current = true;
    marcarComoLidas
      .mutateAsync(pendentes)
      // Falha aqui não interrompe a leitura da thread — o `onError` do hook já
      // avisa, e o `catch` existe para a rejeição não subir como não tratada.
      .catch(() => undefined)
      .finally(() => {
        emVoo.current = false;
      });
    // `chave` no lugar de `commentIds` (array novo a cada render) e sem
    // `marcarComoLidas`, que o React Query recria a cada render — as duas coisas
    // fariam o efeito rodar em loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, notifications]);
}
