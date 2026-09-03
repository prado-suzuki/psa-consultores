import { describe, it, expect } from 'vitest';
import { areaExtenso, cardinalExtenso, dataExtenso, formatarArea, formatarPercentual, formatarValor, numeralContrato, ordinalExtenso, percentualExtenso, romano, valorExtenso } from './extenso';
import { formatarDataBR } from './mapeadores';

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
  it('parte decimal sai em centímetros quadrados, não em are/centiare', () => {
    expect(areaExtenso(699.8677, 'm2')).toBe(
      'seiscentos e noventa e nove metros quadrados e oito mil seiscentos e setenta e sete centímetros quadrados',
    );
    expect(areaExtenso(87.5, 'm2')).toBe(
      'oitenta e sete metros quadrados e cinco mil centímetros quadrados',
    );
  });
  it('preserva zeros à esquerda da fração e o singular de 1 cm²', () => {
    expect(areaExtenso(699.0677, 'm2')).toBe(
      'seiscentos e noventa e nove metros quadrados e seiscentos e setenta e sete centímetros quadrados',
    );
    expect(areaExtenso(0.0001, 'm2')).toBe('um centímetro quadrado');
  });
  it('zero não produz componente fracionário', () => {
    expect(areaExtenso(0, 'm2')).toBe('zero metros quadrados');
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
  it('área urbana segue o padrão PSA de 4 casas e sufixo m²', () => {
    expect(formatarArea(360, 'm2')).toBe('360,0000 m²');
    expect(formatarArea(1234.5, 'm2')).toBe('1.234,5000 m²');
    expect(formatarArea(699.8677, 'm2')).toBe('699,8677 m²');
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

// A data na redação dos instrumentos. Duas coisas se defendem aqui: o PONTO no
// ano ("10 de outubro de 2.025", como os assinados escrevem) e a INDEPENDÊNCIA
// DE FUSO — `new Date('2022-10-10')` é lida como UTC e, em fuso negativo, volta o
// dia 9. Um contrato com a data errada por um dia é o tipo de defeito que ninguém
// revisa.
describe('dataExtenso', () => {
  it.each([
    ['2025-10-10', '10 de outubro de 2.025'],
    ['2022-10-11', '11 de outubro de 2.022'],
    ['2024-08-28', '28 de agosto de 2.024'],
    ['1957-05-23', '23 de maio de 1.957'],
    ['2026-01-01', '1 de janeiro de 2.026'],
  ])('ISO %s → "%s"', (iso, esperado) => {
    expect(dataExtenso(iso)).toBe(esperado);
  });

  // A forma que um campo DERIVADO recebe: a base foi publicada por
  // `formatarDataBR` e é essa que o consultor edita no "Ajustar dados
  // manualmente". Sem aceitar as duas, o derivado devolvia a própria data crua.
  it.each([
    ['10/10/2025', '10 de outubro de 2.025'],
    ['1/1/2026', '1 de janeiro de 2.026'],
    // COM o ponto de milhar no ano, que é a forma que `formatarDataBR` publica
    // desde 02/09/2026. Sem isto o derivado devolvia "10/10/2.025" intacto, e a
    // vigência da parceria saía em dd/mm/aaaa no lugar do extenso.
    ['10/10/2.025', '10 de outubro de 2.025'],
    ['23/05/1.957', '23 de maio de 1.957'],
    ['1/1/2.026', '1 de janeiro de 2.026'],
  ])('dd/mm/aaaa %s → "%s"', (br, esperado) => {
    expect(dataExtenso(br)).toBe(esperado);
  });

  // Guarda de ida e volta: o que `formatarDataBR` escreve, `dataExtenso` tem de
  // ler. As duas funções vivem em arquivos diferentes e mudaram no mesmo dia por
  // motivos diferentes — foi assim que uma quebrou a outra em silêncio.
  it('lê de volta tudo o que formatarDataBR escreve', () => {
    for (const iso of ['2025-10-10', '2022-10-11', '1957-05-23', '2026-01-01']) {
      expect(dataExtenso(formatarDataBR(iso))).toBe(dataExtenso(iso));
    }
  });

  it('não passa por Date: o primeiro dia do mês em ISO não retrocede um dia', () => {
    expect(dataExtenso('2022-10-01')).toBe('1 de outubro de 2.022');
  });

  it('o que não é data volta como veio, sem inventar', () => {
    expect(dataExtenso(null)).toBe('');
    expect(dataExtenso('')).toBe('');
    expect(dataExtenso('a combinar')).toBe('a combinar');
    expect(dataExtenso('2022-13-01')).toBe('2022-13-01');
  });
});
