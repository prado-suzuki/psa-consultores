import { describe, it, expect } from 'vitest';
import { areaExtenso, cardinalExtenso, formatarArea, formatarValor, ordinalExtenso, romano, valorExtenso } from './extenso';

describe('cardinalExtenso', () => {
  it.each([
    [0, 'zero'],
    [1, 'um'],
    [2, 'dois'],
    [15, 'quinze'],
    [21, 'vinte e um'],
    [100, 'cem'],
    [101, 'cento e um'],
    [396, 'trezentos e noventa e seis'],
    [1000, 'mil'],
    [2000, 'dois mil'],
    [558413, 'quinhentos e cinquenta e oito mil, quatrocentos e treze'],
    [1000000, 'um milhão'],
  ])('%i → %s', (n, esperado) => {
    expect(cardinalExtenso(n)).toBe(esperado);
  });
});

describe('valorExtenso', () => {
  it('valor da Mat. 9.617', () => {
    expect(valorExtenso(558413.55)).toBe(
      'quinhentos e cinquenta e oito mil, quatrocentos e treze reais e cinquenta e cinco centavos',
    );
  });
  it('singular de real', () => expect(valorExtenso(1)).toBe('um real'));
  it('apenas centavos', () => expect(valorExtenso(0.5)).toBe('cinquenta centavos'));
});

describe('areaExtenso (decomposição hectare/are/centiare)', () => {
  it('área da Mat. 9.617', () => {
    expect(areaExtenso(396.4)).toBe('trezentos e noventa e seis hectares e quarenta ares');
  });
  it('um hectare exato', () => expect(areaExtenso(1)).toBe('um hectare'));
  it('hectares, ares e centiares', () => {
    expect(areaExtenso(2.0305)).toBe('dois hectares, três ares e cinco centiares');
  });
});

describe('ordinalExtenso', () => {
  it.each([
    [1, 'f', 'primeira'],
    [2, 'f', 'segunda'],
    [3, 'f', 'terceira'],
    [9, 'f', 'nona'],
    [10, 'f', 'décima'],
    [15, 'f', 'décima quinta'],
    [20, 'f', 'vigésima'],
    [22, 'f', 'vigésima segunda'],
    [1, 'm', 'primeiro'],
    [3, 'm', 'terceiro'],
    [6, 'm', 'sexto'],
    [21, 'm', 'vigésimo primeiro'],
    [100, 'm', 'centésimo'],
    [134, 'f', 'centésima trigésima quarta'],
  ] as Array<[number, 'm' | 'f', string]>)('%i (%s) → %s', (n, genero, esperado) => {
    expect(ordinalExtenso(n, genero)).toBe(esperado);
  });

  it('rejeita fora do intervalo', () => {
    expect(() => ordinalExtenso(0)).toThrow();
    expect(() => ordinalExtenso(1000)).toThrow();
  });
});

describe('romano', () => {
  it.each([
    [1, 'I'],
    [4, 'IV'],
    [9, 'IX'],
    [13, 'XIII'],
    [40, 'XL'],
    [1994, 'MCMXCIV'],
  ])('%i → %s', (n, esperado) => {
    expect(romano(n)).toBe(esperado);
  });

  it('rejeita fora do intervalo', () => {
    expect(() => romano(0)).toThrow();
    expect(() => romano(4000)).toThrow();
  });
});

describe('formatação numérica pt-BR', () => {
  it('área com 4 casas', () => expect(formatarArea(396.4)).toBe('396,4000 ha'));
  it('valor com milhar e 2 casas', () => expect(formatarValor(558413.55)).toBe('558.413,55'));
});
