import { describe, expect, it } from 'vitest';

import { aberturaDoImposto, aberturaExata, formatMoney, parseMoney } from './itcmd.ts';

const UPF_JAN_2026 = parseMoney('254.36');
const reais = (s: string) => parseMoney(s);
const abrir = (base: string, imposto: string) => {
  const a = aberturaDoImposto(reais(base), UPF_JAN_2026, reais(imposto));
  return { ...a, faixas: a.faixas.map(formatMoney) };
};

/* Que a abertura soma a forma fechada da calculadora (`impostoExato`) é conferido no
   front, em `src/lib/osg/cenariosDoCapitulo04.test.ts`: daqui o teste não alcança o `src/`. */
describe('aberturaExata', () => {
  it('recusa base com mais de duas casas', () => {
    expect(() => aberturaExata(parseMoney('100.005'), UPF_JAN_2026)).toThrow(/duas casas/);
  });
});

/* O gabarito é o Cenário I do deck da Agro Aliança (instituição da Regina, UPF de janeiro/2026): as
   seis colunas da página da instituição, faixa a faixa. */
describe('aberturaDoImposto — o quadro do deck da Agro Aliança', () => {
  it('quotas 100%: 426.052,00 → 9.411,28', () => {
    expect(abrir('426052.00', '9411.28')).toEqual({
      faixas: ['0.00', '2543.60', '6867.68', '0.00', '0.00'], total: reais('9411.28'), fecha: true,
    });
  });

  it('quotas 70%: o centavo do arredondamento vai para a faixa de 4%', () => {
    expect(abrir('298236.40', '4298.66').faixas).toEqual(['0.00', '2543.60', '1755.06', '0.00', '0.00']);
  });

  it('ITR 100% e 70%', () => {
    expect(abrir('1674927.91', '72516.07').faixas)
      .toEqual(['0.00', '2543.60', '30523.20', '39449.27', '0.00']);
    expect(abrir('1172449.53', '42367.37').faixas)
      .toEqual(['0.00', '2543.60', '30523.20', '9300.57', '0.00']);
  });

  it('mercado 100% e 70%, com a faixa de 8%', () => {
    expect(abrir('2882249.70', '151728.38').faixas)
      .toEqual(['0.00', '2543.60', '30523.20', '91569.60', '27091.98']);
    expect(abrir('2017574.79', '93074.89').faixas)
      .toEqual(['0.00', '2543.60', '30523.20', '60008.09', '0.00']);
  });

  it('a soma das faixas é sempre o imposto gravado', () => {
    for (const [base, imposto] of [['298236.40', '4298.66'], ['2017574.79', '93074.89']]) {
      const a = aberturaDoImposto(reais(base), UPF_JAN_2026, reais(imposto));
      expect(a.faixas.reduce((s, v) => s + v, 0n)).toBe(a.total);
    }
  });

  it('imposto gravado que a lei não dá para aquela base: não fecha, e diz', () => {
    // O ITCD contábil da Cristina no Cenário III do deck foi copiado do Cenário I:
    // R$ 184.826,24 sobre a base de R$ 3.730.973,00, onde a tabela dá R$ 219.626,24.
    const a = aberturaDoImposto(reais('3730973.00'), UPF_JAN_2026, reais('184826.24'));
    expect(a.fecha).toBe(false);
    expect(formatMoney(a.faixas.reduce((s, v) => s + v, 0n))).toBe('219626.24');
  });
});
