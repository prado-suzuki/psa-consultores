import { describe, expect, it } from 'vitest';
import {
  FRACAO_DECIMAIS,
  FRACAO_STEP,
  clampFracaoInput,
} from '@/components/equipe/osg/diagnostico-patrimonial/fracaoUtils';

// A restrição é NOVA: antes o passo de 0,01 era só o das setinhas e a digitação
// aceitava qualquer número de casas. Estes testes fixam o que se perde e o que
// se ganha, com as composses periódicas que aparecem em partilha.
const porcentagem = (numerador: number, denominador: number) =>
  String((numerador / denominador) * 100);

describe('precisão da fração de titularidade', () => {
  it('mantém quatro casas das frações periódicas usuais', () => {
    expect(clampFracaoInput(porcentagem(1, 3))).toBe('33.3333');
    expect(clampFracaoInput(porcentagem(1, 6))).toBe('16.6666');
    expect(clampFracaoInput(porcentagem(1, 7))).toBe('14.2857');
  });

  it('não arredonda ao cortar: trunca, como a digitação de área', () => {
    // 1/6 = 16,66666…: com arredondamento viraria 16,6667. O corte é o mesmo
    // comportamento da área, para o consultor não ver dois critérios no módulo.
    expect(clampFracaoInput('16.66666666')).toBe('16.6666');
    expect(clampFracaoInput('14.285714')).toBe('14.2857');
  });

  it('deixa passar o que já cabe, inclusive inteiro e vazio', () => {
    expect(clampFracaoInput('50')).toBe('50');
    expect(clampFracaoInput('33.33')).toBe('33.33');
    expect(clampFracaoInput('')).toBe('');
  });

  it('assume que a soma pode não fechar 100% (decisão registrada no módulo)', () => {
    const tresComunheiros = [1, 2, 3].map(() => Number(clampFracaoInput(porcentagem(1, 3))));
    expect(tresComunheiros.reduce((a, b) => a + b, 0)).toBeCloseTo(99.9999, 4);

    const seteHerdeiros = Array.from({ length: 7 }, () =>
      Number(clampFracaoInput(porcentagem(1, 7))),
    );
    expect(seteHerdeiros.reduce((a, b) => a + b, 0)).toBeCloseTo(99.9999, 4);
    // O erro residual por titular fica na quinta casa: nada é normalizado para
    // fechar a conta, porque isso escreveria número que o registro não diz.
    expect(100 - seteHerdeiros.reduce((a, b) => a + b, 0)).toBeLessThan(0.001);
  });

  it('deriva o passo do input da mesma precisão', () => {
    expect(FRACAO_DECIMAIS).toBe(4);
    expect(FRACAO_STEP).toBe('0.0001');
  });
});
