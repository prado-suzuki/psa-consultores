import { describe, expect, it } from 'vitest';
import {
  agruparDigitos, agruparValorDigitado, brlDeDecimal, pctDeDecimal, quotasDeBigint, TRACO,
} from './itcmdFmt';

// Os dois agrupadores de CAMPO são o que este teste existe para prender: eles rodam a
// cada tecla, e engolir a vírgula ou perder um dígito no meio da digitação é o tipo de
// falha que só aparece na mão do analista.

describe('agrupar dígitos num campo de quotas', () => {
  it('agrupa de três em três', () => {
    expect(agruparDigitos('1000000')).toBe('1.000.000');
    expect(agruparDigitos('100')).toBe('100');
    expect(agruparDigitos('1000')).toBe('1.000');
    expect(agruparDigitos('9557944')).toBe('9.557.944');
  });

  it('campo vazio segue vazio — não vira zero', () => {
    expect(agruparDigitos('')).toBe('');
    expect(agruparDigitos('abc')).toBe('');
  });

  it('ignora o que não é dígito, inclusive os pontos que ele mesmo pôs', () => {
    // É o caminho de volta: o campo mostra "1.000.000", o `onChange` recebe isso.
    expect(agruparDigitos('1.000.000')).toBe('1.000.000');
    expect(agruparDigitos('1.000.0007')).toBe('10.000.007');
  });

  it('agrupa dígito a dígito, como quem digita', () => {
    const passos = ['1', '10', '100', '1000', '10000', '100000', '1000000'];
    expect(passos.map(agruparDigitos)).toEqual([
      '1', '10', '100', '1.000', '10.000', '100.000', '1.000.000',
    ]);
  });
});

describe('agrupar valor em reais sendo digitado', () => {
  it('agrupa o inteiro e preserva os centavos', () => {
    expect(agruparValorDigitado('1000000,00')).toBe('1.000.000,00');
    expect(agruparValorDigitado('1112125,38')).toBe('1.112.125,38');
  });

  it('NÃO engole a vírgula recém-digitada', () => {
    // O passo em que o analista acabou de teclar a vírgula e ainda não os centavos.
    expect(agruparValorDigitado('1000000,')).toBe('1.000.000,');
    expect(agruparValorDigitado('1000000,0')).toBe('1.000.000,0');
  });

  it('corta na segunda casa: centavo não tem terceira', () => {
    expect(agruparValorDigitado('1000,123')).toBe('1.000,12');
  });

  it('aceita o próprio texto de volta, sem duplicar pontos', () => {
    expect(agruparValorDigitado('1.000.000,00')).toBe('1.000.000,00');
  });

  it('vazio segue vazio', () => {
    expect(agruparValorDigitado('')).toBe('');
    expect(agruparValorDigitado('   ')).toBe('');
  });

  it('agrupa passo a passo, como quem digita um milhão', () => {
    const passos = ['1', '10', '100', '1000', '10000', '100000', '1000000'];
    expect(passos.map(agruparValorDigitado)).toEqual([
      '1', '10', '100', '1.000', '10.000', '100.000', '1.000.000',
    ]);
  });
});

describe('formatação de leitura', () => {
  it('reais a partir do decimal do motor', () => {
    expect(brlDeDecimal('25678598.54')).toBe('R$ 25.678.598,54');
    expect(brlDeDecimal('1152528.00')).toBe('R$ 1.152.528,00');
    // Ausência é traço, nunca R$ 0,00: zero e ausência são coisas diferentes.
    expect(brlDeDecimal(null)).toBe(TRACO);
  });

  it('percentual e quotas', () => {
    expect(pctDeDecimal('50.0000')).toBe('50,0000%');
    expect(quotasDeBigint(6_649_400n)).toBe('6.649.400');
  });
});
