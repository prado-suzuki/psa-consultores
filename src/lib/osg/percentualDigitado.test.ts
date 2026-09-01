import { describe, expect, it } from 'vitest';
import {
  divisaoNoCampo, fatiaIgual, mascararPercentual, percentualEscalado,
} from './percentualDigitado';

describe('a vírgula entra sozinha, no lugar onde cabe', () => {
  it('o dígito que passaria de 100 abre as decimais', () => {
    // O caso que motivou tudo: quatro dígitos liam como cinco mil e quinhentos por
    // cento, o teto aparava e o campo mostrava 100%.
    expect(mascararPercentual('5555')).toBe('55,55');
    expect(mascararPercentual('245')).toBe('24,5');
    expect(mascararPercentual('1234')).toBe('12,34');
    expect(mascararPercentual('9999')).toBe('99,99');
  });

  it('o que cabe em 100 fica inteiro', () => {
    expect(mascararPercentual('5')).toBe('5');
    expect(mascararPercentual('51')).toBe('51');
    expect(mascararPercentual('100')).toBe('100');
  });

  it('digitar além de 100 continua nas decimais, sem rejeitar tecla', () => {
    // Máscara, não validação: o valor sai de faixa e quem apura decide. Rejeitar a
    // tecla faria o campo parecer travado.
    expect(mascararPercentual('1005')).toBe('100,5');
  });

  it('quatro casas, e a quinta não entra', () => {
    expect(mascararPercentual('12345678')).toBe('12,3456');
  });

  it('vírgula digitada manda — é o escape para valor de um dígito', () => {
    expect(mascararPercentual('5,5')).toBe('5,5');
    expect(mascararPercentual('5,')).toBe('5,');
    expect(mascararPercentual('0,3333')).toBe('0,3333');
    // Ponto vale como vírgula: teclado numérico tem ponto, não vírgula.
    expect(mascararPercentual('33.33')).toBe('33,33');
  });

  it('zero à esquerda sai, o zero sozinho fica', () => {
    expect(mascararPercentual('05')).toBe('5');
    expect(mascararPercentual('0')).toBe('0');
    expect(mascararPercentual(',5')).toBe('0,5');
  });

  it('letra e espaço não existem para o campo', () => {
    expect(mascararPercentual('')).toBe('');
    expect(mascararPercentual('abc')).toBe('');
    expect(mascararPercentual(' 55 ')).toBe('55');
  });
});

describe('a conta que o campo entende', () => {
  it('`/2` sem dividendo: quem divide é o ato, e o campo só diz em quantas partes', () => {
    expect(divisaoNoCampo('/2')).toEqual({ esquerda: '', partes: 2 });
    expect(divisaoNoCampo('/3')).toEqual({ esquerda: '', partes: 3 });
  });

  it('com dividendo, divide o número escrito', () => {
    expect(divisaoNoCampo('53,4576/2')).toEqual({ esquerda: '53,4576', partes: 2 });
    expect(divisaoNoCampo('5109444/3')).toEqual({ esquerda: '5109444', partes: 3 });
  });

  it('enquanto a conta não fecha, nada se resolve', () => {
    // Digitando `/`, o divisor ainda não existe: o texto fica no campo e o valor não
    // muda. Dividir em uma parte é não dividir; em zero não existe.
    expect(divisaoNoCampo('/')).toBeNull();
    expect(divisaoNoCampo('/1')).toBeNull();
    expect(divisaoNoCampo('/0')).toBeNull();
    expect(divisaoNoCampo('55,55')).toBeNull();
  });

  it('a máscara deixa a conta passar, e cuida dos dois lados', () => {
    expect(mascararPercentual('/2')).toBe('/2');
    expect(mascararPercentual('5555/2')).toBe('55,55/2');
    // Divisor de três dígitos não entra: irmão não passa de 99.
    expect(mascararPercentual('/123')).toBe('/12');
  });

  it('a fatia igual é meio para cima, em quota inteira', () => {
    expect(fatiaIgual(5_109_444n, 2)).toBe(2_554_722n);
    expect(fatiaIgual(5_109_444n, 3)).toBe(1_703_148n);
    // Ímpar: a fatia arredonda para cima e o resto some no que sobra para o outro.
    expect(fatiaIgual(7n, 2)).toBe(4n);
  });
});

describe('o valor sai na escala da apuração', () => {
  it('quatro casas em bigint, sem passar por number', () => {
    expect(percentualEscalado('55,55')).toBe(555_500n);
    expect(percentualEscalado('100')).toBe(1_000_000n);
    expect(percentualEscalado('0,3333')).toBe(3_333n);
    expect(percentualEscalado('55,')).toBe(550_000n);
  });

  it('campo vazio é vazio, não zero por cento', () => {
    expect(percentualEscalado('')).toBeNull();
    expect(percentualEscalado(',')).toBeNull();
  });
});
