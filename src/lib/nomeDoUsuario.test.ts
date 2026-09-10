import { describe, expect, it } from 'vitest';

import { NOME_SEM_DONO, nomeDeExibicao } from './nomeDoUsuario';

describe('nomeDeExibicao', () => {
  it('prefere o nome do perfil ao pedaço do e-mail', () => {
    expect(
      nomeDeExibicao({ first_name: 'Joana', last_name: 'Silva' }, 'joana.silva@psaconsultores.com.br'),
    ).toBe('Joana Silva');
  });

  it('com sobrenome vazio, mostra só o primeiro nome — e não deixa espaço sobrando', () => {
    // O convite sem sobrenome grava string vazia, não `null`: os dois caminhos
    // precisam dar no mesmo lugar.
    expect(nomeDeExibicao({ first_name: 'Joana', last_name: '' }, null)).toBe('Joana');
    expect(nomeDeExibicao({ first_name: 'Joana', last_name: null }, null)).toBe('Joana');
  });

  it('perfil só com espaço não conta como nome preenchido', () => {
    // Este é o caso que punha o cartão em branco: `'   '` é verdadeiro em JS, e
    // sem o `trim` ele vencia o e-mail e não pintava nada na tela.
    expect(nomeDeExibicao({ first_name: '   ', last_name: '  ' }, 'bi@psaconsultores.com.br')).toBe(
      'bi',
    );
  });

  it('sem perfil, cai no pedaço do e-mail antes do @ — o que o cartão sempre mostrou', () => {
    expect(nomeDeExibicao(null, 'joana.silva@psaconsultores.com.br')).toBe('joana.silva');
    expect(nomeDeExibicao(undefined, 'joana.silva@psaconsultores.com.br')).toBe('joana.silva');
  });

  it('sem perfil e sem e-mail, não devolve vazio', () => {
    expect(nomeDeExibicao(null, null)).toBe(NOME_SEM_DONO);
    expect(nomeDeExibicao(null, undefined)).toBe(NOME_SEM_DONO);
    expect(nomeDeExibicao(null, '')).toBe(NOME_SEM_DONO);
  });
});
