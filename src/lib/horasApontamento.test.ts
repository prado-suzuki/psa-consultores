import { describe, expect, it } from 'vitest';

import {
  avaliarHorasApontadas,
  horasApontadasPrecisamConfirmacao,
} from '@/lib/horasApontamento';

describe('avaliarHorasApontadas', () => {
  it('não avisa quando as horas batem com a estimativa', () => {
    expect(avaliarHorasApontadas({ realizadas: 7, estimadas: 5 })).toBeNull();
    expect(avaliarHorasApontadas({ realizadas: 20, estimadas: 5 })).not.toBeNull();
  });

  it('avisa a partir do triplo da estimativa', () => {
    expect(avaliarHorasApontadas({ realizadas: 14.9, estimadas: 5 })).toBeNull();
    expect(avaliarHorasApontadas({ realizadas: 15, estimadas: 5 })?.mensagem).toBe(
      '15h é 3× as 5h estimadas — confira a digitação.',
    );
  });

  it('sugere o valor provável quando o erro é de escala (caso DT: 159h × 1.580h)', () => {
    const aviso = avaliarHorasApontadas({ realizadas: 1580, estimadas: 159 });
    expect(aviso).toEqual({
      mensagem: '1.580h é 9,9× as 159h estimadas — confira a digitação.',
      sugestao: 158,
    });
  });

  it('sugere só quando o valor corrigido cai perto da estimativa', () => {
    expect(avaliarHorasApontadas({ realizadas: 40, estimadas: 4 })).toEqual({
      mensagem: '40h é 10× as 4h estimadas — confira a digitação.',
      sugestao: 4,
    });
    // 20h com 5h estimadas: 2h seria um chute pior que o valor digitado.
    expect(avaliarHorasApontadas({ realizadas: 20, estimadas: 5 })?.sugestao).toBeNull();
  });

  it('avisa por valor absoluto mesmo com estimativa grande', () => {
    expect(avaliarHorasApontadas({ realizadas: 700, estimadas: 300 })?.mensagem).toBe(
      '700h numa tarefa só — confira a digitação.',
    );
    expect(avaliarHorasApontadas({ realizadas: 400, estimadas: 300 })).toBeNull();
  });

  it('usa o teto de 40h quando a tarefa não tem estimativa', () => {
    expect(avaliarHorasApontadas({ realizadas: 40, estimadas: null })).toBeNull();
    expect(avaliarHorasApontadas({ realizadas: 80, estimadas: '' })?.mensagem).toBe(
      '80h numa tarefa sem estimativa — confira a digitação.',
    );
    expect(avaliarHorasApontadas({ realizadas: 80, estimadas: 0 })?.mensagem).toBe(
      '80h numa tarefa sem estimativa — confira a digitação.',
    );
  });

  it('aceita vírgula decimal e ignora campo vazio ou inválido', () => {
    expect(avaliarHorasApontadas({ realizadas: '18,5', estimadas: '5' })).not.toBeNull();
    expect(avaliarHorasApontadas({ realizadas: '', estimadas: 5 })).toBeNull();
    expect(avaliarHorasApontadas({ realizadas: 'abc', estimadas: 5 })).toBeNull();
    expect(avaliarHorasApontadas({ realizadas: 0, estimadas: 5 })).toBeNull();
    expect(avaliarHorasApontadas({ realizadas: null, estimadas: null })).toBeNull();
  });
});

describe('horasApontadasPrecisamConfirmacao', () => {
  it('só pede confirmação quando existe aviso', () => {
    expect(horasApontadasPrecisamConfirmacao({ realizadas: 6, estimadas: 5 })).toBe(false);
    expect(horasApontadasPrecisamConfirmacao({ realizadas: 60, estimadas: 5 })).toBe(true);
  });
});
