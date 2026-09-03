import { describe, expect, it } from 'vitest';
import {
  isDuplicateMessageError,
  ticketMessageErrorFeedback,
  ticketMessageFeedback,
  type TicketMessageOutcome,
  type TicketMessageWarning,
} from './ticketMessageOutcome';

function outcome(overrides: Partial<TicketMessageOutcome> = {}): TicketMessageOutcome {
  return {
    ticketId: 'tkt-1',
    persisted: true,
    duplicate: false,
    activityStatusUpdated: true,
    notified: true,
    warnings: [],
    ...overrides,
  };
}

describe('isDuplicateMessageError', () => {
  it('reconhece pelo SQLSTATE do trigger', () => {
    expect(isDuplicateMessageError({ code: '23505', message: 'qualquer' })).toBe(true);
  });

  it('reconhece pelo texto quando o code não vem', () => {
    expect(
      isDuplicateMessageError({
        message: 'Mensagem idêntica já registrada neste chamado nos últimos 5 minutos',
      }),
    ).toBe(true);
  });

  it('não confunde com erro de RLS', () => {
    expect(
      isDuplicateMessageError({
        code: '42501',
        message: 'new row violates row-level security policy',
      }),
    ).toBe(false);
  });

  it('não quebra com entradas inesperadas', () => {
    expect(isDuplicateMessageError(null)).toBe(false);
    expect(isDuplicateMessageError('erro')).toBe(false);
    expect(isDuplicateMessageError(undefined)).toBe(false);
  });
});

describe('ticketMessageFeedback — caminho felizes', () => {
  it('cliente vê confirmação simples', () => {
    const t = ticketMessageFeedback(outcome(), 'cliente');
    expect(t.title).toBe('Mensagem enviada');
    expect(t.variant).toBeUndefined();
  });

  it('equipe vê confirmação com notificação', () => {
    const t = ticketMessageFeedback(outcome(), 'equipe');
    expect(t.title).toBe('Resposta enviada');
    expect(t.description).toContain('notificado por e-mail');
  });
});

describe('ticketMessageFeedback — duplicata', () => {
  it('nunca é tratada como falha', () => {
    const t = ticketMessageFeedback(outcome({ duplicate: true }), 'cliente');
    expect(t.variant).toBeUndefined();
    expect(t.title).not.toMatch(/erro|falh/i);
    expect(t.description).toContain('Nenhuma ação é necessária');
  });

  it('para a equipe, explicita que o envio foi descartado', () => {
    const t = ticketMessageFeedback(outcome({ duplicate: true }), 'equipe');
    expect(t.description).toContain('evitar duplicidade');
    expect(t.variant).toBeUndefined();
  });
});

describe('ticketMessageFeedback — pendências', () => {
  const casos: Array<{ warnings: TicketMessageWarning[]; naDescricao: RegExp }> = [
    { warnings: ['status_nao_atualizado'], naDescricao: /não está atribuído a você/i },
    { warnings: ['notificacao_nao_enviada'], naDescricao: /outro meio/i },
    {
      warnings: ['status_nao_atualizado', 'notificacao_nao_enviada'],
      naDescricao: /duas pendências|atribuído a você/i,
    },
  ];

  it.each(casos)('equipe: $warnings nomeia a pendência e é acionável', ({ warnings, naDescricao }) => {
    const t = ticketMessageFeedback(
      outcome({ warnings, activityStatusUpdated: false, notified: false }),
      'equipe',
    );
    expect(t.title).toMatch(/pendência/i);
    expect(`${t.title} ${t.description}`).toMatch(naDescricao);
    expect(t.variant).toBe('destructive');
  });

  it('equipe usa o rótulo exato da tela para a situação', () => {
    const t = ticketMessageFeedback(
      outcome({ warnings: ['status_nao_atualizado'] }),
      'equipe',
    );
    // Mesmo texto de chamadoAtividadeColors.aguardando_resposta.label,
    // em src/lib/chamadoStatusColors.ts
    expect(t.description).toContain('"Aguardando resposta"');
  });

  it.each(casos)('sempre afirma que a mensagem entrou ($warnings)', ({ warnings }) => {
    for (const audience of ['cliente', 'equipe'] as const) {
      const t = ticketMessageFeedback(outcome({ warnings }), audience);
      // A regra central do incidente: pendência de efeito colateral não pode
      // sugerir que a mensagem não entrou.
      expect(`${t.title} ${t.description}`).toMatch(/gravad|registrada/i);
      expect(t.title).not.toMatch(/não foi enviada|não enviada/i);
    }
  });
});

describe('registro de linguagem por público', () => {
  // Trava o feedback de 07/08/2026: cliente é executivo externo — nada de termo
  // interno, nem de jargão técnico, em nenhum cenário.
  const TERMO_INTERNO =
    /RLS|SQLSTATE|activity_status|precheck|atribu[íi]|permiss[ãa]o|respons[áa]vel pelo chamado|Aguardando resposta|editor|portal|e-mail de aviso/i;

  const cenarios: Array<[string, TicketMessageOutcome]> = [
    ['sucesso', outcome()],
    ['duplicata', outcome({ duplicate: true })],
    ['sem status', outcome({ warnings: ['status_nao_atualizado'], activityStatusUpdated: false })],
    ['sem notificação', outcome({ warnings: ['notificacao_nao_enviada'], notified: false })],
    [
      'duas pendências',
      outcome({ warnings: ['status_nao_atualizado', 'notificacao_nao_enviada'] }),
    ],
  ];

  it.each(cenarios)('cliente — %s: sem termo interno', (_nome, o) => {
    const t = ticketMessageFeedback(o, 'cliente');
    expect(`${t.title} ${t.description}`).not.toMatch(TERMO_INTERNO);
  });

  it.each(cenarios)('cliente — %s: frases completas, sem coloquialismo', (_nome, o) => {
    const t = ticketMessageFeedback(o, 'cliente');
    expect(t.description).toMatch(/\.$/);
    expect(t.description).not.toMatch(/!|\bboom\b|beleza|ok\?|tá\b|pra\b|acione\b/i);
  });

  it('erro real também não vaza termo interno para o cliente', () => {
    const t = ticketMessageErrorFeedback(
      { code: '42501', message: 'new row violates row-level security policy' },
      'cliente',
    );
    expect(`${t.title} ${t.description}`).not.toMatch(TERMO_INTERNO);
    expect(t.description).not.toContain('row-level security');
  });
});

describe('ticketMessageErrorFeedback', () => {
  it('para a equipe, propaga o motivo real do banco', () => {
    const t = ticketMessageErrorFeedback(
      { message: 'Table tickets is not allowed for precheck' },
      'equipe',
    );
    expect(t.description).toContain('Table tickets is not allowed for precheck');
    expect(t.variant).toBe('destructive');
  });

  it('para o cliente, omite o motivo técnico', () => {
    const t = ticketMessageErrorFeedback(
      { message: 'Table tickets is not allowed for precheck' },
      'cliente',
    );
    expect(t.description).not.toContain('precheck');
    expect(t.description).toContain('entre em contato com a PSA');
    expect(t.variant).toBe('destructive');
  });

  it('avisa que o texto foi preservado, nos dois públicos', () => {
    for (const audience of ['cliente', 'equipe'] as const) {
      const t = ticketMessageErrorFeedback(new Error('timeout'), audience);
      expect(t.description).toContain('permanece no campo de texto');
    }
  });

  it('funciona sem mensagem utilizável', () => {
    const t = ticketMessageErrorFeedback({}, 'equipe');
    expect(t.title).toBe('Não foi possível enviar a resposta');
    expect(t.description).toBeTruthy();
    expect(t.description).not.toContain('Motivo informado');
  });
});
