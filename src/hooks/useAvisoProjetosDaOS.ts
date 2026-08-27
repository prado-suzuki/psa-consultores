import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';

/**
 * Registra um dos três eventos da solicitação OSG na thread de TODOS os projetos
 * da ordem de serviço, e no sino de cada participante distinto.
 *
 * SUBSTITUI `useAvisoSolicitacaoEnviada`. O hook antigo servia só ao evento 1 e
 * resolvia "o projeto" no navegador: um pela OS, senão um pelo cliente, e ao achar
 * MAIS DE UM devolvia null e não publicava nada. Medido em 26/08/2026: 18 OS têm
 * mais de um projeto, então isso era silêncio garantido nelas. A resolução agora é
 * do banco, na RPC `notificar_projetos_da_os`, que escreve em todos.
 *
 * POR QUE FRONT E NÃO GATILHO DE BANCO. A EDU-2 decidiu o contrário para os avisos
 * dela, porque o responsável de uma tarefa muda por três caminhos e pendurar em um
 * deixaria os outros mudos. Aqui não é o caso, conferido em 26/08: `solicitacao`
 * não tem gatilho de status, nenhuma edge function escreve nessa tabela, e no front
 * os dois status passam por um ponto único (`moverStatus`, em
 * `useDomainSolicitacao.ts`). E o evento 2 não é transição nenhuma, é um clique com
 * a conta que o analista está olhando, então nem poderia ser gatilho.
 *
 * CHAMAR SEM `await`, NO SUCESSO DA OPERAÇÃO PRINCIPAL. A transição já gravou
 * status e data antes de chegar aqui. Se este registro falhasse dentro do fluxo, a
 * tela mostraria erro para uma operação que deu certo.
 *
 * A RPC é idempotente por dia (chave em `notificacao_envio`, canal `sino`), então
 * chamar duas vezes não duplica nada. E-mail e WhatsApp não passam por aqui: quem
 * cuida deles é a borda `notificar`, chamada em paralelo e intocada.
 */

/** Os três eventos, com o mesmo vocabulário que a borda `notificar` usa. */
export type EventoDaSolicitacao =
  | 'solicitacao_enviada'
  | 'situacao_documentos'
  | 'documento_aprovado';

export interface AvisoProjetosDaOSInput {
  solicitacaoId: string;
  evento: EventoDaSolicitacao;
  /**
   * Frase curta que a tela acrescenta ao corpo. Só o evento 2 manda, com a conta
   * que o analista está vendo no checklist. Recalcular no banco abriria a porta
   * para a thread divergir da tela.
   */
  detalhe?: string;
}

/** O que a RPC devolve, para a auditoria de contagens que a GES-03 pede. */
export interface AvisoProjetosDaOSResultado {
  projetos: number;
  eventos: number;
  sinos: number;
  /** Presente só quando nada foi feito. Hoje o único valor é `sem_os`. */
  motivo?: string;
}

/** Contagem zerada — o mesmo valor que o hook devolvia quando a RPC não trouxe nada. */
const NADA_FEITO: AvisoProjetosDaOSResultado = { projetos: 0, eventos: 0, sinos: 0 };

/**
 * A RPC devolve `jsonb`, e o `types.ts` regenerado a declara como `Json` — um tipo
 * que inclui número, string, booleano e array. O cast direto para o resultado deixou
 * de compilar por isso, e forçar com `as unknown as` esconderia o problema real: o
 * formato chega do banco e ninguém o conferia. Aqui ele é conferido campo a campo,
 * com a mesma contagem zerada de antes quando não vier objeto.
 */
function lerResultado(data: unknown): AvisoProjetosDaOSResultado {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return NADA_FEITO;

  const bruto = data as Record<string, unknown>;
  const contagem = (v: unknown) => (typeof v === 'number' ? v : 0);

  return {
    projetos: contagem(bruto.projetos),
    eventos: contagem(bruto.eventos),
    sinos: contagem(bruto.sinos),
    ...(typeof bruto.motivo === 'string' ? { motivo: bruto.motivo } : {}),
  };
}

export function useAvisoProjetosDaOS() {
  return useMutation<AvisoProjetosDaOSResultado, Error, AvisoProjetosDaOSInput>({
    mutationFn: async ({ solicitacaoId, evento, detalhe }) => {
      const { data, error } = await supabase.rpc('notificar_projetos_da_os', {
        _solicitacao_id: solicitacaoId,
        _evento: evento,
        ...(detalhe ? { _detalhe: detalhe } : {}),
      });

      if (error) throw error;
      return lerResultado(data);
    },
    // `toast.warning` e não `toast.error`: a operação principal deu certo, o que
    // faltou foi o registro. Erro vermelho aqui faria a pessoa duvidar se o
    // cliente foi avisado.
    onError: () =>
      toast.warning(
        'A operação foi concluída. O aviso não pôde ser registrado nos projetos da OS.',
      ),
  });
}
