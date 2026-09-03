import { extractErrorMessage } from '@/lib/rlsMessages';

/**
 * Resultado de um envio de mensagem de chamado.
 *
 * Existe por causa do incidente de 08/07-06/08/2026: o envio gravava a mensagem
 * e depois abortava num precheck de RLS, a tela dizia "erro", o cliente reenviava
 * e a mensagem duplicava. A regra que esse tipo carrega é: quem chama precisa
 * saber SE a mensagem está no banco, separado de QUAIS efeitos colaterais
 * completaram. Nunca mais dizer "falhou" para algo que foi gravado.
 */
export interface TicketMessageOutcome {
  ticketId: string;
  /** A mensagem está persistida no chamado — recém-gravada ou já registrada. */
  persisted: boolean;
  /** O banco barrou o insert por ser reenvio idêntico em janela curta. */
  duplicate: boolean;
  /** O `activity_status` do chamado foi efetivamente atualizado. */
  activityStatusUpdated: boolean;
  /** A notificação (e-mail) foi disparada com sucesso. */
  notified: boolean;
  warnings: TicketMessageWarning[];
}

export type TicketMessageWarning =
  | 'status_nao_atualizado'
  | 'notificacao_nao_enviada';

export type TicketMessageAudience = 'cliente' | 'equipe';

export interface ToastContent {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

/** SQLSTATE devolvido pelo trigger `trg_ticket_messages_bloqueia_reenvio`. */
const DUPLICATE_SQLSTATE = '23505';
const DUPLICATE_MESSAGE_HINT = 'idêntica já registrada';

/**
 * Reconhece o bloqueio de reenvio idêntico vindo do banco.
 * Não é falha de envio: significa que a mensagem já está lá.
 */
export function isDuplicateMessageError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string' && code === DUPLICATE_SQLSTATE) return true;

  const message = extractErrorMessage(error);
  return message !== null && message.includes(DUPLICATE_MESSAGE_HINT);
}

/**
 * Feedback quando a mensagem ESTÁ no banco (com ou sem pendências).
 *
 * Os dois públicos têm registros distintos e não se misturam:
 * - `cliente` é comunicação com executivo externo: linguagem formal, sem termo
 *   interno (situação do chamado, atribuição, notificação técnica, permissão).
 *   Diz o que aconteceu e, se houver, o que ele deve fazer.
 * - `equipe` é comunicação operacional: precisa nomear a pendência exata e a
 *   provável causa, para ser acionável. Usa o rótulo da tela
 *   ("Aguardando resposta", de `chamadoAtividadeColors`) para não divergir da UI.
 */
export function ticketMessageFeedback(
  outcome: TicketMessageOutcome,
  audience: TicketMessageAudience,
): ToastContent {
  return audience === 'cliente'
    ? feedbackCliente(outcome)
    : feedbackEquipe(outcome);
}

function feedbackCliente(outcome: TicketMessageOutcome): ToastContent {
  if (outcome.duplicate) {
    return {
      title: 'Mensagem já registrada',
      description:
        'Esta mensagem já consta no chamado e não foi enviada novamente. Nenhuma ação é necessária.',
    };
  }

  if (outcome.warnings.length === 0) {
    return {
      title: 'Mensagem enviada',
      description:
        'Sua mensagem foi registrada no chamado e a equipe responsável foi comunicada.',
    };
  }

  // Pendência de bastidor. O fato principal — a mensagem entrou — vem primeiro;
  // o encaminhamento é dado sem expor a mecânica interna.
  return {
    title: 'Mensagem registrada',
    description:
      'Sua mensagem foi registrada no chamado e será analisada pela equipe responsável. '
      + 'Não foi possível emitir a notificação automática. Em caso de urgência, '
      + 'recomendamos contato direto com a PSA.',
  };
}

function feedbackEquipe(outcome: TicketMessageOutcome): ToastContent {
  if (outcome.duplicate) {
    return {
      title: 'Resposta já registrada',
      description:
        'Mensagem idêntica já consta neste chamado. O envio foi descartado para evitar duplicidade.',
    };
  }

  const semSituacao = outcome.warnings.includes('status_nao_atualizado');
  const semEmail = outcome.warnings.includes('notificacao_nao_enviada');

  if (!semSituacao && !semEmail) {
    return {
      title: 'Resposta enviada',
      description:
        'A resposta foi registrada no chamado e o cliente foi notificado por e-mail.',
    };
  }

  if (semSituacao && semEmail) {
    return {
      title: 'Resposta registrada com duas pendências',
      description:
        'A resposta foi gravada no chamado. A situação não foi alterada para '
        + '"Aguardando resposta" e o e-mail de aviso ao cliente não foi enviado. '
        + 'Verifique se o chamado está atribuído a você.',
      variant: 'destructive',
    };
  }

  if (semSituacao) {
    return {
      title: 'Resposta registrada com pendência',
      description:
        'A resposta foi gravada no chamado, porém a situação não foi alterada para '
        + '"Aguardando resposta". Isso ocorre quando o chamado não está atribuído a você. '
        + 'Solicite a atribuição à gestão.',
      variant: 'destructive',
    };
  }

  return {
    title: 'Resposta registrada com pendência',
    description:
      'A resposta foi gravada no chamado, porém o e-mail de aviso ao cliente não foi '
      + 'enviado. Avalie comunicar o cliente por outro meio.',
    variant: 'destructive',
  };
}

/**
 * Feedback quando a mensagem NÃO foi gravada.
 *
 * O motivo técnico devolvido pelo banco vai apenas para a equipe: foi a mensagem
 * genérica que fez o incidente durar um mês sem diagnóstico, mas expor SQLSTATE
 * a cliente executivo não informa nada e desgasta a comunicação. Em ambos os
 * casos o motivo continua no console para investigação.
 */
export function ticketMessageErrorFeedback(
  error: unknown,
  audience: TicketMessageAudience,
): ToastContent {
  if (audience === 'cliente') {
    return {
      title: 'Não foi possível enviar a mensagem',
      description:
        'Sua mensagem não foi registrada e permanece no campo de texto. Tente novamente. '
        + 'Caso o problema persista, entre em contato com a PSA.',
      variant: 'destructive',
    };
  }

  const motivo = extractErrorMessage(error);
  const base =
    'A resposta não foi gravada e permanece no campo de texto. Tente novamente.';

  return {
    title: 'Não foi possível enviar a resposta',
    description: motivo ? `${base} Motivo informado pelo sistema: ${motivo}` : base,
    variant: 'destructive',
  };
}
