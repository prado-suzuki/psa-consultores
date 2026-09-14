import { describe, expect, it } from 'vitest';

import { LIMITE_DO_SINO, aconteceuDepois, ordenarItensDoSino } from '@/lib/sinoNotificacoes';

const item = (chave: string, quando: string, naoLido: boolean) => ({ chave, quando, naoLido });

describe('aconteceuDepois', () => {
  it('compara o acontecimento com o marco de "já olhei"', () => {
    expect(aconteceuDepois('2026-09-14T12:00:00Z', '2026-09-14T11:00:00Z')).toBe(true);
    expect(aconteceuDepois('2026-09-14T10:00:00Z', '2026-09-14T11:00:00Z')).toBe(false);
  });

  it('o mesmo instante não conta como novo', () => {
    expect(aconteceuDepois('2026-09-14T11:00:00Z', '2026-09-14T11:00:00Z')).toBe(false);
  });

  /*
   * Sem marco é navegador novo, `localStorage` limpo ou primeira vez: o padrão
   * seguro é o comportamento antigo, em que todo pendente contava na bolinha.
   * Data ilegível cai no mesmo lugar — bolinha à toa incomoda, chamado atrasado
   * escondido custa.
   */
  it('sem marco, ou com data ilegível, tudo conta como novo', () => {
    expect(aconteceuDepois('2026-09-14T12:00:00Z', null)).toBe(true);
    expect(aconteceuDepois('ontem', '2026-09-14T11:00:00Z')).toBe(true);
    expect(aconteceuDepois('2026-09-14T12:00:00Z', 'qualquer coisa')).toBe(true);
  });
});

describe('ordenarItensDoSino', () => {
  it('o que é novo vem primeiro, na ordem em que chegou', () => {
    // A ordem de entrada carrega a prioridade entre fontes e a urgência já
    // calculada dos chamados; reordenar o bloco novo por data jogaria as duas
    // fora.
    const lista = ordenarItensDoSino([
      item('mencao-1', '2026-09-01T09:00:00Z', true),
      item('ticket-1', '2026-09-10T09:00:00Z', true),
    ]);

    expect(lista.map((i) => i.chave)).toEqual(['mencao-1', 'ticket-1']);
  });

  it('o histórico vem depois, do mais recente para o mais antigo', () => {
    const lista = ordenarItensDoSino([
      item('mencao-1', '2026-08-01T09:00:00Z', false),
      item('interna-1', '2026-09-10T09:00:00Z', false),
      item('ticket-1', '2026-09-05T09:00:00Z', false),
    ]);

    expect(lista.map((i) => i.chave)).toEqual(['interna-1', 'ticket-1', 'mencao-1']);
  });

  it('nenhum item lido passa na frente de um novo, por mais recente que seja', () => {
    const lista = ordenarItensDoSino([
      item('interna-1', '2026-09-14T09:00:00Z', false),
      item('mencao-1', '2026-01-01T09:00:00Z', true),
    ]);

    expect(lista.map((i) => i.chave)).toEqual(['mencao-1', 'interna-1']);
  });

  it('data ilegível vai para o fim do histórico em vez de embaralhar a lista', () => {
    // `Date.parse` devolve `NaN` para lixo, e `NaN` num comparador de `sort`
    // deixa a ordem do array inteiro a cargo do motor.
    const lista = ordenarItensDoSino([
      item('a', 'sem data', false),
      item('b', '2026-09-10T09:00:00Z', false),
      item('c', '2026-09-12T09:00:00Z', false),
    ]);

    expect(lista.map((i) => i.chave)).toEqual(['c', 'b', 'a']);
  });

  it('o corte sacrifica histórico antigo, nunca item novo', () => {
    const novos = Array.from({ length: 4 }, (_, i) =>
      item(`novo-${i}`, `2026-09-0${i + 1}T09:00:00Z`, true),
    );
    const antigos = Array.from({ length: 10 }, (_, i) =>
      item(`velho-${i}`, `2026-08-0${(i % 9) + 1}T09:00:00Z`, false),
    );

    const lista = ordenarItensDoSino([...novos, ...antigos], 5);

    expect(lista).toHaveLength(5);
    expect(lista.slice(0, 4).map((i) => i.chave)).toEqual(['novo-0', 'novo-1', 'novo-2', 'novo-3']);
  });

  it('o limite padrão é o tamanho do histórico que o balão mostra', () => {
    const muitos = Array.from({ length: 40 }, (_, i) =>
      item(`n-${i}`, '2026-09-14T09:00:00Z', false),
    );

    expect(ordenarItensDoSino(muitos)).toHaveLength(LIMITE_DO_SINO);
    expect(LIMITE_DO_SINO).toBe(30);
  });
});
