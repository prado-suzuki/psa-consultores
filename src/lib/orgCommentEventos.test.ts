import { describe, expect, it } from 'vitest';

import {
  ROTULOS_DE_EVENTO,
  corpoDoEvento,
  ehEventoDeSistema,
  rotuloDoEvento,
} from '@/lib/orgCommentEventos';

describe('ehEventoDeSistema', () => {
  it('só o comentário humano fica de fora', () => {
    expect(ehEventoDeSistema('comment')).toBe(false);
    expect(ehEventoDeSistema('review_submitted')).toBe(true);
    expect(ehEventoDeSistema('documentos_conferidos')).toBe(true);
  });
});

describe('rotuloDoEvento', () => {
  it('devolve o título revisado pela Patricia', () => {
    expect(rotuloDoEvento('documentos_cobrados')).toBe('Cobrança de documentos pendentes');
    expect(rotuloDoEvento('documentos_conferidos')).toBe('Solicitação finalizada');
  });

  it('comentário humano não tem rótulo', () => {
    expect(rotuloDoEvento('comment')).toBe('');
  });

  it('kind sem rótulo cai num texto genérico, nunca em undefined', () => {
    // Kind novo no banco, migration à frente do front: a tela não pode
    // escrever "undefined" no lugar do nome do autor.
    expect(rotuloDoEvento('kind_que_ainda_nao_existe' as never)).toBe('Atualização do sistema');
  });

  it('todo kind de evento conhecido tem rótulo', () => {
    for (const rotulo of Object.values(ROTULOS_DE_EVENTO)) {
      expect(rotulo.length).toBeGreaterThan(0);
    }
  });
});

describe('corpoDoEvento', () => {
  it('tira o prefixo de envio para revisão, com e sem o nome do revisor', () => {
    expect(
      corpoDoEvento({ kind: 'review_submitted', body: 'Enviado para revisão de Anne Strini: confere o quadro' }),
    ).toBe('confere o quadro');
    expect(corpoDoEvento({ kind: 'review_submitted', body: 'Enviado para revisão: confere' })).toBe(
      'confere',
    );
  });

  it('tira o prefixo de devolução para ajustes', () => {
    expect(corpoDoEvento({ kind: 'review_adjustments', body: 'Devolvido para ajustes: faltou a data' })).toBe(
      'faltou a data',
    );
  });

  it('aprovação sem texto próprio não deixa corpo para desenhar', () => {
    expect(corpoDoEvento({ kind: 'review_approved', body: 'Tarefa aprovada' })).toBe('');
  });

  it('aprovação com texto próprio preserva o corpo', () => {
    expect(corpoDoEvento({ kind: 'review_approved', body: 'Aprovada com ressalva' })).toBe(
      'Aprovada com ressalva',
    );
  });

  it('evento da GES-03 passa inteiro, não tem prefixo a remover', () => {
    const body = 'A lista de documentos foi enviada ao cliente e o acesso ao portal foi liberado.';
    expect(corpoDoEvento({ kind: 'documentos_solicitados', body })).toBe(body);
  });
});
