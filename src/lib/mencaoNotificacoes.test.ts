import { describe, expect, it } from 'vitest';

import {
  mencoesDosComentarios,
  montarNotificacoesDeMencao,
  trechoDoComentario,
  type ComentarioCitado,
  type MencaoNaoLida,
} from '@/lib/mencaoNotificacoes';
import { docDeTextoLegado, serializarDoc } from '@/lib/orgCommentRichText';

const mencao = (
  id: string,
  commentId: string,
  motivo: MencaoNaoLida['motivo'] = 'mencao',
): MencaoNaoLida => ({
  id,
  comment_id: commentId,
  created_at: '2026-07-29T12:00:00.000Z',
  motivo,
});

function comentario(overrides: Partial<ComentarioCitado> = {}): ComentarioCitado {
  return {
    id: 'C1',
    entity_type: 'org_task',
    entity_id: 'T1',
    entity_title: 'Apurar ICMS',
    project_name: 'Recuperação 2026',
    author_id: 'U2',
    author_name: 'Ana Souza',
    body: 'Bernardo, olha isso',
    created_at: '2026-07-29T11:30:00.000Z',
    ...overrides,
  };
}

const mapa = (...comentarios: ComentarioCitado[]) =>
  new Map(comentarios.map((item) => [item.id, item]));

describe('trechoDoComentario', () => {
  it('lê o corpo rico como texto plano', () => {
    const corpo = serializarDoc(docDeTextoLegado('Bernardo, confere o anexo'));

    expect(trechoDoComentario(corpo)).toBe('Bernardo, confere o anexo');
  });

  it('colapsa espaços e quebras de linha', () => {
    expect(trechoDoComentario('primeira\n\n  segunda   linha')).toBe('primeira segunda linha');
  });

  it('corta o excesso com reticências', () => {
    expect(trechoDoComentario('abcdefghij', 4)).toBe('abcd…');
    expect(trechoDoComentario('abcd', 4)).toBe('abcd');
  });
});

describe('montarNotificacoesDeMencao', () => {
  it('junta a menção ao comentário que a originou, preservando a ordem', () => {
    const notificacoes = montarNotificacoesDeMencao(
      [mencao('M1', 'C1'), mencao('M2', 'C2')],
      mapa(comentario(), comentario({ id: 'C2', body: 'segundo' })),
      'U1',
    );

    expect(notificacoes.map((item) => item.id)).toEqual(['M1', 'M2']);
    expect(notificacoes[0]).toMatchObject({
      id: 'M1',
      commentId: 'C1',
      entity_type: 'org_task',
      entity_id: 'T1',
      entity_title: 'Apurar ICMS',
      project_name: 'Recuperação 2026',
      authorName: 'Ana Souza',
      motivo: 'mencao',
      trecho: 'Bernardo, olha isso',
      created_at: '2026-07-29T11:30:00.000Z',
    });
  });

  it('carrega o motivo da linha: a resposta chega marcada como resposta', () => {
    const notificacoes = montarNotificacoesDeMencao(
      [mencao('M1', 'C1', 'resposta'), mencao('M2', 'C2')],
      mapa(comentario(), comentario({ id: 'C2' })),
      'U1',
    );

    // Mesma caixa, mesmo caminho de leitura — só o motivo distingue, e é ele
    // que o sino usa para dizer "respondeu você" em vez de "mencionou você".
    expect(notificacoes.map((item) => item.motivo)).toEqual(['resposta', 'mencao']);
  });

  it('descarta auto-resposta pelo mesmo caminho da auto-menção', () => {
    const notificacoes = montarNotificacoesDeMencao(
      [mencao('M1', 'C1', 'resposta')],
      mapa(comentario({ author_id: 'U1' })),
      'U1',
    );

    expect(notificacoes).toEqual([]);
  });

  it('descarta auto-menção: o autor não é notificado do que escreveu', () => {
    const notificacoes = montarNotificacoesDeMencao(
      [mencao('M1', 'C1')],
      mapa(comentario({ author_id: 'U1' })),
      'U1',
    );

    expect(notificacoes).toEqual([]);
  });

  it('descarta menção cujo comentário não veio (fora do alcance da RLS ou excluído)', () => {
    const notificacoes = montarNotificacoesDeMencao(
      [mencao('M1', 'C1'), mencao('M2', 'C2')],
      mapa(comentario({ id: 'C2' })),
      'U1',
    );

    expect(notificacoes.map((item) => item.commentId)).toEqual(['C2']);
  });

  it('nomeia autor removido em vez de deixar o item sem quem falou', () => {
    const notificacoes = montarNotificacoesDeMencao(
      [mencao('M1', 'C1')],
      mapa(comentario({ author_id: null, author_name: null })),
      'U1',
    );

    expect(notificacoes[0].authorName).toBe('Usuário removido');
  });
});

describe('mencoesDosComentarios', () => {
  const notificacoes = montarNotificacoesDeMencao(
    [mencao('M1', 'C1'), mencao('M2', 'C2')],
    mapa(comentario(), comentario({ id: 'C2' })),
    'U1',
  );

  it('devolve os ids das menções que estão nos comentários da thread', () => {
    expect(mencoesDosComentarios(notificacoes, ['C2', 'C9'])).toEqual(['M2']);
  });

  it('não devolve nada quando a thread não tem menção minha', () => {
    expect(mencoesDosComentarios(notificacoes, ['C9'])).toEqual([]);
    expect(mencoesDosComentarios(notificacoes, [])).toEqual([]);
  });
});
