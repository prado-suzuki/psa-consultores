import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';

/**
 * A solicitação foi enviada e o cliente NÃO foi avisado?
 *
 * POR QUE ESTA PERGUNTA EXISTE (09/09/2026, go-live)
 *
 * Uma solicitação foi enviada às 14:40 e nenhum aviso saiu — a borda recusou a
 * chamada com "Auth failed: Invalid token". O toast apareceu na tela do analista
 * e passou batido no meio da apresentação, e daí em diante nada mais contava a
 * história: a solicitação parecia normal, a lista estava visível no portal, e o
 * cliente não sabia que tinha algo a entregar.
 *
 * O QUE PIORA O SILÊNCIO: o cron de 30 dias (`solicitacao_vencida`) cobraria,
 * um mês depois, alguém que nunca recebeu o pedido. O aviso na tela é o que dá
 * trinta dias para alguém perceber antes de a cobrança sair.
 *
 * DERIVADO, SEM COLUNA NOVA. A pergunta é a subtração entre duas coisas que já
 * existem: `solicitacao.enviada_em` e a linha de `notificacao_envio`. Mesmo
 * princípio do checklist — o que é derivável não se materializa, porque
 * materializado ele diverge.
 *
 * `sucesso = true` e não a presença da linha: cobre o caso de 09/09 (linha
 * nenhuma) E o caso de a linha existir com falha. Também não acende quando a
 * dedup barrou um reenvio, porque aí já existe uma linha bem-sucedida.
 *
 * UM CANAL BASTA. E-mail que saiu e WhatsApp que falhou não acende o aviso: o
 * cliente foi avisado. Acender por canal parcial viraria ruído numa base em que
 * a maioria dos representantes não tem telefone.
 *
 * Medido antes de ligar: na base inteira havia UMA solicitação com `enviada_em`,
 * e era exatamente a que falhou. Zero falso positivo histórico.
 */

export const avisoDeEnvioKey = (solicitacaoId: string | null) =>
  ['aviso-de-envio-nao-saiu', solicitacaoId] as const;

export function useAvisoDeEnvioNaoSaiu(
  solicitacaoId: string | null,
  enviadaEm: string | null | undefined,
) {
  // Sem `enviada_em` não há o que perguntar: rascunho nunca foi ao cliente, e
  // "não avisamos" seria verdade sem ser problema.
  const ativo = Boolean(solicitacaoId && enviadaEm);

  return useQuery({
    queryKey: avisoDeEnvioKey(ativo ? solicitacaoId : null),
    enabled: ativo,
    queryFn: async (): Promise<boolean> => {
      const { count, error } = await supabase
        .from('notificacao_envio')
        .select('id', { count: 'exact', head: true })
        .eq('entidade_tipo', 'solicitacao')
        .eq('entidade_id', solicitacaoId as string)
        .eq('tipo', 'solicitacao_enviada')
        .eq('sucesso', true);

      // Propaga: painel que não carregou e "não avisamos" são coisas diferentes.
      // Quem consome trata o erro NÃO acendendo o aviso — acusar falso é pior que
      // não acusar, porque manda o analista incomodar o cliente à toa.
      if (error) throw error;
      return (count ?? 0) === 0;
    },
  });
}
