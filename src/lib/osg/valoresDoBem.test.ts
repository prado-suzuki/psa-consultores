import { describe, expect, it } from 'vitest';
import {
  derivarValoresDoBem,
  origemDoValor,
  totalizarValoresDosBens,
} from '@/lib/osg/valoresDoBem';

// Cenário do aceite (B9), fora do caso MMS: uma fazenda desmembrada em DUAS
// matrículas (cada uma com o seu valor) convivendo com uma participação
// societária, que não tem matrícula nenhuma e é digitada no próprio bem.
const fazendaDesmembrada = { vlr_contabil: null, vlr_mercado: null, vlr_imposto_anual: null };
const matriculasDaFazenda = [
  { vlr_contabil: 558_413.55, vlr_mercado: 900_000, vlr_imposto_anual: null },
  { vlr_contabil: 241_586.45, vlr_mercado: 400_000, vlr_imposto_anual: null },
];
const quotasAlfa = { vlr_contabil: 12.5, vlr_mercado: 30, vlr_imposto_anual: null };

describe('valores do bem', () => {
  it('soma as duas matrículas do bem, em vez de ler a coluna que ninguém preenche', () => {
    const valores = derivarValoresDoBem(fazendaDesmembrada, matriculasDaFazenda);
    expect(valores).toEqual({
      contabil: { valor: 800_000, comValor: 2 },
      mercado: { valor: 1_300_000, comValor: 2 },
      itr: { valor: null, comValor: 0 },
      origem: 'matriculas',
      matriculas: 2,
    });
    expect(origemDoValor(valores, 'contabil')).toBe('Soma das 2 matrícula(s) do bem');
  });

  it('mostra o valor digitado quando o bem não tem matrícula', () => {
    const valores = derivarValoresDoBem(quotasAlfa, []);
    expect(valores).toEqual({
      contabil: { valor: 12.5, comValor: 0 },
      mercado: { valor: 30, comValor: 0 },
      itr: { valor: null, comValor: 0 },
      origem: 'bem',
      matriculas: 0,
    });
    expect(origemDoValor(valores, 'contabil')).toBe('Valor do próprio bem (sem matrícula)');
  });

  it('ignora a coluna do bem assim que existe matrícula (uma fonte só)', () => {
    // Valor legado na coluna do bem, de antes de os valores migrarem para a
    // matrícula: a matrícula manda, e o legado não volta a aparecer.
    const bemComLegado = { vlr_contabil: 1, vlr_mercado: 2, vlr_imposto_anual: null };
    const valores = derivarValoresDoBem(bemComLegado, [{ vlr_contabil: 7, vlr_mercado: null, vlr_imposto_anual: null }]);
    expect(valores.contabil.valor).toBe(7);
    expect(valores.mercado.valor).toBeNull();
  });

  it('não apresenta soma parcial como total: diz quantas matrículas contribuíram', () => {
    // Duas matrículas, só uma com valor contábil: o número é MENOR que o real, e
    // a legenda não pode afirmar "soma de 2".
    const valores = derivarValoresDoBem(fazendaDesmembrada, [
      { vlr_contabil: 558_413.55, vlr_mercado: 900_000, vlr_imposto_anual: null },
      { vlr_contabil: null, vlr_mercado: 400_000, vlr_imposto_anual: null },
    ]);
    expect(valores.contabil).toEqual({ valor: 558_413.55, comValor: 1 });
    expect(origemDoValor(valores, 'contabil')).toBe(
      'Soma parcial: 1 de 2 matrículas com este valor',
    );
    // A outra métrica está completa e continua se apresentando como total.
    expect(origemDoValor(valores, 'mercado')).toBe('Soma das 2 matrícula(s) do bem');
  });

  it('distingue "não preenchido" de zero na soma das matrículas', () => {
    const valores = derivarValoresDoBem(fazendaDesmembrada, [
      { vlr_contabil: null, vlr_mercado: null, vlr_imposto_anual: null },
      { vlr_contabil: null, vlr_mercado: 0, vlr_imposto_anual: null },
    ]);
    expect(valores.contabil).toEqual({ valor: null, comValor: 0 });
    expect(valores.mercado).toEqual({ valor: 0, comValor: 1 });
    expect(origemDoValor(valores, 'contabil')).toBe(
      'Nenhuma das 2 matrículas do bem tem este valor',
    );
  });

  it('o valor de ITR sai de vlr_imposto_anual, com a mesma regra dos outros dois', () => {
    // A coluna se chama imposto, mas guarda o valor DECLARADO no ITR. A regra é
    // a mesma: bem com matrícula soma as matrículas.
    const valores = derivarValoresDoBem(
      { vlr_contabil: null, vlr_mercado: null, vlr_imposto_anual: 9 },
      [
        { vlr_contabil: 1, vlr_mercado: null, vlr_imposto_anual: 7_162_722.78 },
        { vlr_contabil: 2, vlr_mercado: null, vlr_imposto_anual: 1_833_039.19 },
      ],
    );
    expect(valores.itr).toEqual({ valor: 8_995_761.97, comValor: 2 });
    expect(origemDoValor(valores, 'itr')).toBe('Soma das 2 matrícula(s) do bem');
    // Sem matrícula, o valor é o do próprio bem — e o legado 9 aparece só aí.
    const semMatricula = derivarValoresDoBem(
      { vlr_contabil: null, vlr_mercado: null, vlr_imposto_anual: 9 }, [],
    );
    expect(semMatricula.itr).toEqual({ valor: 9, comValor: 0 });
  });

  it('totaliza a lista sempre pelo valor derivado', () => {
    const bens = [
      { valores: derivarValoresDoBem(fazendaDesmembrada, matriculasDaFazenda) },
      { valores: derivarValoresDoBem(quotasAlfa, []) },
      { valores: derivarValoresDoBem({ vlr_contabil: null, vlr_mercado: null, vlr_imposto_anual: null }, []) },
    ];
    expect(totalizarValoresDosBens(bens)).toEqual({
      contabil: 800_012.5,
      mercado: 1_300_030,
    });
  });
});
