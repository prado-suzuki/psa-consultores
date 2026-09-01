import { describe, expect, it } from 'vitest';
import { formatMoney, parseMoney, quantizar2 } from '@/lib/osg/itcmd/dinheiro';

// A especificação do motor (SPEC-motor-itcmd-mt.md §2.3) proíbe float. O projeto
// não tem biblioteca decimal e não vai ganhar uma, então a aritmética é `bigint`
// em escala fixa de 1e-4. Estes testes prendem a fronteira: string decimal entra,
// string decimal sai, e o que não é número é recusado em vez de virar NaN.

describe('dinheiro — aritmética exata em escala 1e-4', () => {
  it('ida e volta: o que entra como string decimal sai igual', () => {
    for (const s of ['0.00', '1.00', '0.01', '3324700.00', '14577996.03', '221.03']) {
      expect(formatMoney(parseMoney(s))).toBe(s);
    }
    // A escala é literal, não uma promessa: 1 real = 10.000 unidades internas.
    expect(parseMoney('3324700.00')).toBe(33_247_000_000n);
    expect(parseMoney('1.00')).toBe(10_000n);
  });

  it('limite do arredondamento: meio centavo exato vai para cima', () => {
    // 0,005 é o ponto onde truncar e arredondar divergem — e onde o float erra.
    expect(quantizar2(parseMoney('0.005'))).toBe(parseMoney('0.01'));
    expect(formatMoney(parseMoney('0.005'))).toBe('0.01');
    // Um décimo de centavo abaixo do meio continua para baixo.
    expect(formatMoney(parseMoney('0.0049'))).toBe('0.00');
    // Caso real: a base de ITR exata é ...,025 e a publicada é ...,03 (§8, F79).
    expect(formatMoney(parseMoney('14577996.025'))).toBe('14577996.03');
  });

  it('referência: o total de mercado do acervo não perde centavo', () => {
    // R$ 322.960.281,82 — o maior número da cadeia (§5, passo 1). Em float de
    // dupla precisão a soma desse valor com centavos já não é confiável.
    const total = parseMoney('322960281.82');
    expect(total).toBe(3_229_602_818_200n);
    expect(formatMoney(total)).toBe('322960281.82');
    // Metade exata, que é a base do donatário no cenário de mercado (§8, I79).
    expect(formatMoney(total / 2n)).toBe('161480140.91');
  });

  it('quantizar2 não mexe em valor que já tem duas casas', () => {
    const m = parseMoney('186864.00');
    expect(quantizar2(m)).toBe(m);
    expect(quantizar2(quantizar2(parseMoney('1087127.6824')))).toBe(parseMoney('1087127.68'));
  });

  it('string malformada é recusada com erro, nunca virando zero', () => {
    for (const s of ['', ' ', 'abc', '1,00', '1.2.3', '1e5', 'R$ 10,00', '1.00000', '.5']) {
      expect(() => parseMoney(s)).toThrow();
    }
  });
});
