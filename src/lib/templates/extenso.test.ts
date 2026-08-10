import { describe, it, expect } from 'vitest';
import { areaExtenso, cardinalExtenso, formatarArea, formatarPercentual, formatarValor, ordinalExtenso, percentualExtenso, romano, valorExtenso } from './extenso';

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

describe('areaExtenso em metro quadrado (imóvel urbano)', () => {
  it('área urbana inteira', () => {
    expect(areaExtenso(360, 'm2')).toBe('trezentos e sessenta metros quadrados');
  });
  it('um metro quadrado exato', () => expect(areaExtenso(1, 'm2')).toBe('um metro quadrado'));
  it('parte decimal sai em centésimos, não em are/centiare', () => {
    expect(areaExtenso(87.5, 'm2')).toBe('oitenta e sete metros quadrados e cinquenta centésimos de metro quadrado');
    expect(areaExtenso(0.01, 'm2')).toBe('um centésimo de metro quadrado');
  });
  it('hectare segue sendo o default (não muda quem já chamava com um argumento)', () => {
    expect(areaExtenso(360)).toBe(areaExtenso(360, 'ha'));
    expect(areaExtenso(360)).toBe('trezentos e sessenta hectares');
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
  it('área urbana com 2 casas e sufixo m²', () => {
    expect(formatarArea(360, 'm2')).toBe('360,00 m²');
    expect(formatarArea(1234.5, 'm2')).toBe('1.234,50 m²');
  });
  it('valor com milhar e 2 casas', () => expect(formatarValor(558413.55)).toBe('558.413,55'));
  it('percentual com 3 casas e sufixo %', () => {
    expect(formatarPercentual(100)).toBe('100,000%');
    // Valores do quadro societário real (quotas ÷ 185.757 × 100).
    expect(formatarPercentual((44395 / 185757) * 100)).toBe('23,900%');
    expect(formatarPercentual((906 / 185757) * 100)).toBe('0,488%');
  });
});

describe('percentualExtenso (forma cartorial "inteiros … por cento")', () => {
  it.each([
    [50, 'cinquenta inteiros por cento'],
    [1, 'um inteiro por cento'],
    [100, 'cem inteiros por cento'],
    [33.333, 'trinta e três inteiros e trezentos e trinta e três milésimos por cento'],
    [50.5, 'cinquenta inteiros e quinhentos milésimos por cento'],
    [0.5, 'quinhentos milésimos por cento'],
    [0, 'zero por cento'],
  ])('%s%% → %s', (n, esperado) => {
    expect(percentualExtenso(n)).toBe(esperado);
  });
});

describe('cardinalExtenso — feminino (conta quotas)', () => {
  it.each([
    [1, 'uma'],
    [2, 'duas'],
    [500, 'quinhentas'],
    [200, 'duzentas'],
    [100, 'cem'],
    [1000, 'mil'],
    [1500, 'mil e quinhentas'],
    // A forma do contrato registrado da MMS Agro.
    [872674, 'oitocentas e setenta e duas mil, seiscentas e setenta e quatro'],
    // Dezenas e especiais não flexionam; milhão é substantivo masculino.
    [15, 'quinze'],
    [30, 'trinta'],
    [2000000, 'dois milhões'],
  ])('%s → %s', (n, esperado) => {
    expect(cardinalExtenso(n, true)).toBe(esperado);
  });

  it('sem o sinalizador, segue masculino', () => {
    expect(cardinalExtenso(500)).toBe('quinhentos');
    expect(cardinalExtenso(2)).toBe('dois');
  });
});
