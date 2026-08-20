import { describe, expect, it } from 'vitest';

import {
  TOTAL_DE_TONS, classeDaCorDaArea, estiloDaCorDaArea, nomeDoTomDaArea, proximoIndiceDeCor,
} from '@/lib/corDaArea';

describe('proximoIndiceDeCor', () => {
  it('a primeira área pega o primeiro tom', () => {
    expect(proximoIndiceDeCor([])).toBe(1);
  });

  it('não colide enquanto há slot livre', () => {
    const usados: number[] = [];
    for (let i = 0; i < TOTAL_DE_TONS; i += 1) usados.push(proximoIndiceDeCor(usados));
    expect(usados).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(new Set(usados).size).toBe(TOTAL_DE_TONS);
  });

  /*
   * O defeito que o índice persistido existe para evitar: com derivação por
   * ordem na leitura, apagar uma área desloca todas as posteriores. Aqui o slot
   * apenas volta para a fila.
   */
  it('apagar uma área devolve o slot, sem mexer nas outras', () => {
    const antes = [1, 2, 3, 4, 5];
    const depoisDeApagarO3 = antes.filter((i) => i !== 3);
    expect(proximoIndiceDeCor(depoisDeApagarO3)).toBe(3);
    // e as que sobraram não mudaram de tom
    expect(depoisDeApagarO3).toEqual([1, 2, 4, 5]);
  });

  it('passando de 8 áreas, reusa o tom MENOS usado', () => {
    const cheio = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(proximoIndiceDeCor(cheio)).toBe(1);
    expect(proximoIndiceDeCor([...cheio, 1])).toBe(2);
    expect(proximoIndiceDeCor([...cheio, 1, 2])).toBe(3);
  });

  it('ignora nulos — área anterior à migração não ocupa slot', () => {
    expect(proximoIndiceDeCor([null, undefined, 1])).toBe(2);
  });
});

describe('classeDaCorDaArea', () => {
  it('devolve a classe literal do slot', () => {
    expect(classeDaCorDaArea({ color_index: 1 })).toBe('bg-area-1');
    expect(classeDaCorDaArea({ color_index: 8 })).toBe('bg-area-8');
  });

  it('sem índice não há ponto — nem um cinza de reserva', () => {
    // Ponto cinza afirmaria "esta área tem cor" sobre uma área que não tem.
    expect(classeDaCorDaArea({ color_index: null })).toBeNull();
    expect(classeDaCorDaArea(null)).toBeNull();
    expect(classeDaCorDaArea(undefined)).toBeNull();
  });

  it('índice fora da faixa não pode sumir com o ponto', () => {
    expect(classeDaCorDaArea({ color_index: 9 })).toBe('bg-area-1');
    expect(classeDaCorDaArea({ color_index: 0 })).toBe('bg-area-2');
    expect(classeDaCorDaArea({ color_index: -3 })).toBe('bg-area-5');
  });

  it('as oito classes existem por extenso — o Tailwind não lê template string', () => {
    for (let i = 1; i <= TOTAL_DE_TONS; i += 1) {
      expect(classeDaCorDaArea({ color_index: i })).toBe(`bg-area-${i}`);
    }
  });
});

describe('override e nome do tom', () => {
  it('o override vira style inline, porque hex não tem classe', () => {
    expect(estiloDaCorDaArea({ color: '#123456' })).toEqual({ backgroundColor: '#123456' });
  });

  it('override vazio ou em branco não conta', () => {
    expect(estiloDaCorDaArea({ color: '' })).toBeUndefined();
    expect(estiloDaCorDaArea({ color: '   ' })).toBeUndefined();
    expect(estiloDaCorDaArea({ color: null })).toBeUndefined();
  });

  it('o nome do tom é o que a tela mostra no lugar do seletor', () => {
    expect(nomeDoTomDaArea({ color_index: 1 })).toBe('terracota');
    expect(nomeDoTomDaArea({ color_index: 5 })).toBe('petróleo');
    expect(nomeDoTomDaArea({ color_index: null })).toBeNull();
  });
});

/*
 * O defeito que este bloco tranca, e ele passou pelo typecheck: `UsersTab`
 * montava `{ id, label, color }` para o seletor de area e passava isso ao ponto.
 * Sem `color_index`, `classeDaCorDaArea` devolve null e o ponto NAO RENDERIZA —
 * silenciosamente, porque os dois campos de `AreaComCor` sao opcionais (e tem de
 * ser: o helper precisa tolerar area sem cor).
 *
 * O teste nao consegue impedir alguem de esquecer o campo na origem. O que ele
 * faz e deixar escrito que "sem ponto" e um resultado POSSIVEL e legitimo — para
 * quem investigar um ponto que sumiu chegar aqui e olhar a origem do objeto.
 */
describe('objeto sem color_index — a origem do ponto que não aparece', () => {
  it('objeto de exibição sem o campo devolve null, sem erro', () => {
    const comoUsersTabMontava = { id: 'x', label: 'Área Digital', color: null };
    expect(classeDaCorDaArea(comoUsersTabMontava)).toBeNull();
    expect(estiloDaCorDaArea(comoUsersTabMontava)).toBeUndefined();
  });

  it('com o campo, o ponto volta', () => {
    const corrigido = { id: 'x', label: 'Área Digital', color: null, color_index: 3 };
    expect(classeDaCorDaArea(corrigido)).toBe('bg-area-3');
    expect(nomeDoTomDaArea(corrigido)).toBe('oliva');
  });

  it('override sem índice ainda pinta — é o escape sem UI', () => {
    expect(classeDaCorDaArea({ color: '#123456' })).toBeNull();
    expect(estiloDaCorDaArea({ color: '#123456' })).toEqual({ backgroundColor: '#123456' });
  });
});
