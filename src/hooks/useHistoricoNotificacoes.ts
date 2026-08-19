import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import {
  montarHistorico, type DisparoHistorico, type EnvioParaHistorico,
} from '@/lib/historicoNotificacoes';

/**
 * Os avisos que já saíram para o cliente nesta solicitação.
 *
 * POR QUE LEITURA DIRETA, sem RPC: `notificacao_envio` tem política de SELECT para
 * `team_member` e acima —
 *
 *   equipe e destinatario can view notificacao_envio
 *     using: destinatario_id = auth.uid() OR has_role_or_higher(auth.uid(), 'team_member')
 *
 * O que a tabela NÃO tem é política de escrita: o insert continua exclusivo da chave
 * de serviço, que é a função de borda. Então o front lê e nunca escreve, o que é
 * exatamente o desenho certo aqui.
 *
 * FILTRO NO BANCO E NÃO NO CLIENTE. Só `enviado`, `entregue` e `lido` sobem: são os
 * três que significam "o cliente recebeu". Tentativa que falhou fica no banco para o
 * Digital investigar e não trafega para a tela do consultor.
 *
 * O índice `notificacao_envio_dedup_idx` é (tipo, entidade_tipo, entidade_id, canal,
 * enviado_em DESC), da migração do EDU-1. Esta consulta filtra por entidade sem o
 * `tipo`, então não usa o prefixo inteiro — de propósito, porque o painel mostra a
 * linha do tempo dos TRÊS avisos, não só o que o analista vai mandar. Com o volume
 * de hoje é irrelevante; se um dia pesar, um índice em (entidade_tipo, entidade_id)
 * resolve.
 */

export const historicoNotificacoesKey = (solicitacaoId: string | null) =>
  ['historico-notificacoes', solicitacaoId] as const;

const STATUS_QUE_CHEGARAM = ['enviado', 'entregue', 'lido'] as const;

export function useHistoricoNotificacoes(solicitacaoId: string | null) {
  return useQuery<DisparoHistorico[]>({
    queryKey: historicoNotificacoesKey(solicitacaoId),
    enabled: Boolean(solicitacaoId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notificacao_envio')
        .select('tipo, canal, status, enviado_em, entregue_em, lido_em')
        .eq('entidade_tipo', 'solicitacao')
        .eq('entidade_id', solicitacaoId as string)
        .in('status', STATUS_QUE_CHEGARAM)
        .order('enviado_em', { ascending: false })
        .limit(200);

      // Propaga o erro em vez de devolver lista vazia: painel vazio e painel que
      // não carregou são coisas diferentes, e a tela precisa poder dizer qual é.
      if (error) throw error;

      return montarHistorico((data ?? []) as EnvioParaHistorico[]);
    },
  });
}
