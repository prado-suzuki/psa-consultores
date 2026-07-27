import { describe, expect, it } from 'vitest';

import type { OrgTaskComment } from '@/hooks/useOrgTasks';
import {
  buildReviewHistory,
  getReviewEventContent,
  getReviewEventType,
} from '@/lib/orgTaskReviewHistory';

const comment = (
  id: string,
  text: string,
  extra: Partial<OrgTaskComment> = {},
): OrgTaskComment => ({
  id,
  task_id: 'T1',
  user_id: 'U1',
  user_name: 'Bernardo K',
  comment: text,
  is_system: true,
  created_at: '2026-04-02T13:05:00.000Z',
  ...extra,
});

describe('getReviewEventType', () => {
  it('reconhece os três eventos pelo prefixo', () => {
    expect(getReviewEventType('Enviado para revisão de Rita: x')).toBe('submitted');
    expect(getReviewEventType('Enviado para revisão: x')).toBe('submitted');
    expect(getReviewEventType('Devolvido para ajustes: x')).toBe('adjustments');
    expect(getReviewEventType('Tarefa aprovada')).toBe('approved');
  });

  it('ignora texto livre e aprovação com sufixo', () => {
    expect(getReviewEventType('Comentário qualquer')).toBeNull();
    expect(getReviewEventType('Tarefa aprovada com ressalvas')).toBeNull();
  });
});

describe('getReviewEventContent', () => {
  it('remove o prefixo de envio, com ou sem nome do revisor', () => {
    expect(getReviewEventContent('Enviado para revisão de Rita Rev: Ver anexos', 'submitted')).toBe(
      'Ver anexos',
    );
    expect(getReviewEventContent('Enviado para revisão: Ver anexos', 'submitted')).toBe(
      'Ver anexos',
    );
  });

  it('remove o prefixo de ajustes', () => {
    expect(getReviewEventContent('Devolvido para ajustes: Faltou o CFOP', 'adjustments')).toBe(
      'Faltou o CFOP',
    );
  });

  it('aprovação não tem corpo', () => {
    expect(getReviewEventContent('Tarefa aprovada', 'approved')).toBe('');
  });
});

describe('buildReviewHistory', () => {
  it('mantém só os comentários de sistema reconhecidos, na ordem recebida', () => {
    const history = buildReviewHistory([
      comment('C1', 'Enviado para revisão de Rita Rev: Ver anexos'),
      comment('C2', 'Comentário humano', { is_system: false }),
      comment('C3', 'Devolvido para ajustes: Faltou o CFOP'),
      comment('C4', 'Aviso automático não mapeado'),
      comment('C5', 'Tarefa aprovada'),
    ]);

    expect(history.map((event) => [event.id, event.type])).toEqual([
      ['C1', 'submitted'],
      ['C3', 'adjustments'],
      ['C5', 'approved'],
    ]);
  });

  it('devolve lista vazia quando não há eventos de revisão', () => {
    expect(buildReviewHistory([comment('C1', 'Só um comentário', { is_system: false })])).toEqual(
      [],
    );
    expect(buildReviewHistory([])).toEqual([]);
  });

  it('preserva os campos originais do comentário', () => {
    const [event] = buildReviewHistory([comment('C1', 'Tarefa aprovada')]);
    expect(event).toMatchObject({
      id: 'C1',
      user_name: 'Bernardo K',
      created_at: '2026-04-02T13:05:00.000Z',
      type: 'approved',
    });
  });
});
