import { describe, expect, it } from 'vitest';
import {
  aporteDigitado, aporteEmTexto, aporteParaBanco, quotasDoAporte,
} from '@/lib/osg/aporteEmMoeda';
import { parseMoney } from '@/lib/osg/itcmd/dinheiro';

// Os números são do AGRO ALIANÇA: capital de 9.557.944 quotas e acervo contábil de
// R$ 9.557.944,00 — quota de R$ 1,00, que é o caso desta carteira.

const CAPITAL = 9_557_944n;
const ACERVO = parseMoney('9557944.00');

describe('quantas quotas o aporte compra', () => {
  it('quota de R$ 1,00: o valor e a quantidade coincidem', () => {
    expect(quotasDoAporte(parseMoney('3000000.00'), ACERVO, CAPITAL)).toBe(3_000_000n);
    expect(quotasDoAporte(parseMoney('1.00'), ACERVO, CAPITAL)).toBe(1n);
  });

  it('quota de OUTRO valor converte pelo preço, e não pela paridade', () => {
    // Capital de 1.000 quotas e acervo de R$ 10.000,00 → quota de R$ 10,00.
    const acervo = parseMoney('10000.00');
    expect(quotasDoAporte(parseMoney('2500.00'), acervo, 1_000n)).toBe(250n);
    // Quota de R$ 0,50: cada real compra duas.
    expect(quotasDoAporte(parseMoney('100.00'), parseMoney('500.00'), 1_000n)).toBe(200n);
  });

  it('arredonda a quota, que é indivisível', () => {
    // Quota de R$ 3,00: R$ 10,00 compram 3,33… → 3.
    expect(quotasDoAporte(parseMoney('10.00'), parseMoney('3000.00'), 1_000n)).toBe(3n);
    // R$ 11,00 compram 3,66… → 4.
    expect(quotasDoAporte(parseMoney('11.00'), parseMoney('3000.00'), 1_000n)).toBe(4n);
  });

  it('sem acervo não há preço de quota: devolve zero em vez de dividir por zero', () => {
    expect(quotasDoAporte(parseMoney('1000.00'), 0n, CAPITAL)).toBe(0n);
    expect(quotasDoAporte(parseMoney('1000.00'), ACERVO, 0n)).toBe(0n);
    expect(quotasDoAporte(0n, ACERVO, CAPITAL)).toBe(0n);
    // Valor negativo não é aporte.
    expect(quotasDoAporte(parseMoney('-500.00'), ACERVO, CAPITAL)).toBe(0n);
  });
});

describe('o texto do campo', () => {
  it('aceita vírgula, ponto de milhar e digitação incompleta', () => {
    expect(aporteDigitado('3.000.000,00')).toBe(parseMoney('3000000.00'));
    expect(aporteDigitado('1500,5')).toBe(parseMoney('1500.50'));
    expect(aporteDigitado('42')).toBe(parseMoney('42.00'));
    // Digitação a meio caminho passa como zero, sem quebrar a tela.
    expect(aporteDigitado('')).toBe(0n);
    expect(aporteDigitado('1500,')).toBe(parseMoney('1500.00'));
    expect(aporteDigitado('abc')).toBe(0n);
  });

  it('volta formatado, e ZERO volta VAZIO', () => {
    // Zero é a ausência de aporte, e "0,00" num campo em branco pareceria valor posto.
    expect(aporteEmTexto(0n)).toBe('');
    expect(aporteEmTexto(parseMoney('3000000.00'))).toBe('3.000.000,00');
    expect(aporteEmTexto(parseMoney('1500.50'))).toBe('1.500,50');
    expect(aporteEmTexto(parseMoney('7.38'))).toBe('7,38');
  });

  it('para o banco vai decimal com ponto, como o numeric(18,2)', () => {
    expect(aporteParaBanco(parseMoney('3000000.00'))).toBe('3000000.00');
    expect(aporteParaBanco(0n)).toBe('0.00');
  });
});
