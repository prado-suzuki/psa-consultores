import { describe, expect, it } from 'vitest';
import { calcularHistoricoCapital } from './historicoCapital';

describe('calcularHistoricoCapital', () => {
  it('lê o capital pt-BR do snapshot substituído e calcula o delta', () => {
    expect(calcularHistoricoCapital(5_272_449, {
      selecao: { sociedade: { capitalValor: '525.744,00' } },
    })).toEqual({
      capitalAnterior: 525_744,
      capitalDelta: 4_746_705,
    });
  });

  it('encontra o capital mesmo quando o binding da sociedade tem outro nome', () => {
    expect(calcularHistoricoCapital(1_500, {
      selecao: { empresaAlterada: { capitalValor: '1.000,00' } },
    })).toEqual({
      capitalAnterior: 1_000,
      capitalDelta: 500,
    });
  });

  it('não inventa valores quando o documento anterior não congelou capital', () => {
    expect(calcularHistoricoCapital(1_500, { selecao: {} })).toEqual({
      capitalAnterior: null,
      capitalDelta: null,
    });
  });
});
