import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { STALE_TIMES } from '@/lib/queryClient';
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

/**
 * O painel mostra só o que o n8n JÁ CONFIRMOU, e isso tem consequência de tempo.
 *
 * A borda grava a linha como `pendente` ANTES de chamar o n8n, e quem a promove a
 * `enviado` é o callback do fluxo. Medido em 11/09/2026 nesta mesma solicitação:
 * entre a reserva e a confirmação passam de 2,2 a 5,5 segundos. Ou seja, uma
 * busca disparada no instante em que o modal fecha encontraria a linha ainda
 * `pendente` e o painel continuaria sem ela — não por cache, por relógio.
 *
 * Daí as duas peças:
 *
 *   `staleTime: REALTIME` — o default da casa é 1 minuto (`queryClient.ts`), e
 *     com ele reabrir o modal logo após enviar servia a lista anterior ao envio
 *     sem ir ao banco. Era a causa do "só aparece depois do F5". A própria tabela
 *     de `STALE_TIMES` já classifica notificação como REALTIME.
 *
 *   `aoVivo` — enquanto o modal está aberto, repete a busca a cada 4s, para a
 *     confirmação que chega segundos depois aparecer sozinha. Fora do modal fica
 *     desligado: é consulta de painel, não de tela.
 */
export interface OpcoesHistorico {
  /** Repete a busca enquanto a tela estiver aberta. Use só com o modal montado. */
  aoVivo?: boolean;
}

export function useHistoricoNotificacoes(
  solicitacaoId: string | null,
  { aoVivo = false }: OpcoesHistorico = {},
) {
  return useQuery<DisparoHistorico[]>({
    queryKey: historicoNotificacoesKey(solicitacaoId),
    enabled: Boolean(solicitacaoId),
    staleTime: STALE_TIMES.REALTIME,
    // `false` e não `0`: zero seria "repetir o mais rápido possível".
    refetchInterval: aoVivo ? 4000 : false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notificacao_envio')
        // `destinatario_email` e `destinatario_telefone` entram por pedido da Luana
        // (OSG, 09/09/2026): o painel dizia QUANDO e POR ONDE, nunca PARA QUEM. O
        // nome não vem porque não é gravado — ver `DestinoDoDisparo`.
        //
        // A lista fica em UMA linha, feia e comprida, porque o supabase-js infere o
        // tipo do retorno a partir do literal: quebrada com `+`, a inferência morre
        // e o resultado volta como `GenericStringError[]`.
        .select('tipo, canal, status, enviado_em, entregue_em, lido_em, destinatario_email, destinatario_telefone')
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
