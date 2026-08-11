import { describe, expect, it } from 'vitest';
import { derivarValoresDoBem, totalizarValoresDosBens } from '@/lib/osg/valoresDoBem';

// Cenário do aceite (B9), fora do caso MMS: uma fazenda desmembrada em DUAS
// matrículas (cada uma com o seu valor) convivendo com uma participação
// societária, que não tem matrícula nenhuma e é digitada no próprio bem.
const fazendaDesmembrada = { vlr_contabil: null, vlr_mercado: null };
const matriculasDaFazenda = [
  { vlr_contabil: 558_413.55, vlr_mercado: 900_000 },
  { vlr_contabil: 241_586.45, vlr_mercado: 400_000 },
];
const quotasAlfa = { vlr_contabil: 12.5, vlr_mercado: 30 };

describe('valores do bem', () => {
  it('soma as duas matrículas do bem, em vez de ler a coluna que ninguém preenche', () => {
    const valores = derivarValoresDoBem(fazendaDesmembrada, matriculasDaFazenda);
    expect(valores).toEqual({
      vlr_contabil: 800_000,
      vlr_mercado: 1_300_000,
      origem: 'matriculas',
      matriculas: 2,
    });
  });

  it('mostra o valor digitado quando o bem não tem matrícula', () => {
    expect(derivarValoresDoBem(quotasAlfa, [])).toEqual({
      vlr_contabil: 12.5,
      vlr_mercado: 30,
      origem: 'bem',
      matriculas: 0,
    });
  });

  it('ignora a coluna do bem assim que existe matrícula (uma fonte só)', () => {
    // Valor legado na coluna do bem, de antes de os valores migrarem para a
    // matrícula: a matrícula manda, e o legado não volta a aparecer.
    const bemComLegado = { vlr_contabil: 1, vlr_mercado: 2 };
    const valores = derivarValoresDoBem(bemComLegado, [{ vlr_contabil: 7, vlr_mercado: null }]);
    expect(valores.vlr_contabil).toBe(7);
    expect(valores.vlr_mercado).toBeNull();
  });

  it('distingue "não preenchido" de zero na soma das matrículas', () => {
    const valores = derivarValoresDoBem(fazendaDesmembrada, [
      { vlr_contabil: null, vlr_mercado: null },
      { vlr_contabil: null, vlr_mercado: 0 },
    ]);
    expect(valores.vlr_contabil).toBeNull();
    expect(valores.vlr_mercado).toBe(0);
  });

  it('totaliza a lista sempre pelo valor derivado', () => {
    const bens = [
      { valores: derivarValoresDoBem(fazendaDesmembrada, matriculasDaFazenda) },
      { valores: derivarValoresDoBem(quotasAlfa, []) },
      { valores: derivarValoresDoBem({ vlr_contabil: null, vlr_mercado: null }, []) },
    ];
    expect(totalizarValoresDosBens(bens)).toEqual({
      contabil: 800_012.5,
      mercado: 1_300_030,
    });
  });
});
