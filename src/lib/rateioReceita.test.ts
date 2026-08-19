import { describe, expect, it } from 'vitest';
import { formatarPercentual, resumoRateio } from '@/lib/rateioReceita';

const linha = (percentual_rateio: number) => ({ percentual_rateio });

describe('resumoRateio', () => {
  it('lista vazia não fecha e se declara vazia', () => {
    const r = resumoRateio([]);

    expect(r.vazio).toBe(true);
    expect(r.total).toBe(0);
    expect(r.fecha).toBe(false);
    expect(r.faltam).toBe(100);
  });

  it('aceita nulo sem estourar, porque o rascunho pode não ter a lista', () => {
    expect(resumoRateio(null).vazio).toBe(true);
    expect(resumoRateio(undefined).total).toBe(0);
  });

  it('soma e fecha quando dá 100', () => {
    const r = resumoRateio([linha(60), linha(40)]);

    expect(r.total).toBe(100);
    expect(r.fecha).toBe(true);
    expect(r.faltam).toBe(0);
    expect(r.excede).toBe(0);
  });

  // A tolerância é de um centésimo: erra por menos que isso e fecha. É o que
  // absorve o ruído da soma binária, sem precisar afirmar qual combinação o
  // produz (a maioria das somas redondas fecha exata em JavaScript).
  it('erro menor que um centésimo fecha', () => {
    const r = resumoRateio([linha(99.995)]);

    expect(r.total).not.toBe(100);
    expect(r.fecha).toBe(true);
  });

  // E não existe para perdoar centavo faltando: três linhas de 33,33 somam 99,99
  // de verdade, e uma delas tem de levar 33,34.
  it('três linhas de 33,33 NÃO fecham, porque 99,99 não é 100', () => {
    const r = resumoRateio([linha(33.33), linha(33.33), linha(33.33)]);

    expect(r.total).toBeCloseTo(99.99, 2);
    expect(r.fecha).toBe(false);
    expect(r.faltam).toBeCloseTo(0.01, 2);
  });

  it('com 33,34 numa das linhas, fecha', () => {
    expect(resumoRateio([linha(33.34), linha(33.33), linha(33.33)]).fecha).toBe(true);
  });

  it('dois centésimos a menos não fecham', () => {
    expect(resumoRateio([linha(99.98)]).fecha).toBe(false);
  });

  it('diz quanto falta', () => {
    const r = resumoRateio([linha(60), linha(30)]);

    expect(r.fecha).toBe(false);
    expect(r.faltam).toBeCloseTo(10, 2);
    expect(r.excede).toBe(0);
  });

  it('diz quanto excedeu', () => {
    const r = resumoRateio([linha(60), linha(60)]);

    expect(r.fecha).toBe(false);
    expect(r.excede).toBeCloseTo(20, 2);
    expect(r.faltam).toBe(0);
  });

  it('percentual ausente conta como zero em vez de virar NaN', () => {
    const r = resumoRateio([linha(50), { percentual_rateio: undefined as unknown as number }]);

    expect(r.total).toBe(50);
    expect(Number.isNaN(r.total)).toBe(false);
  });
});

describe('formatarPercentual', () => {
  it('inteiro sai sem casas', () => {
    expect(formatarPercentual(60)).toBe('60');
    expect(formatarPercentual(100)).toBe('100');
  });

  it('mantém as casas quando o valor as tem', () => {
    expect(formatarPercentual(33.33)).toBe('33.33');
    expect(formatarPercentual(12.5)).toBe('12.5');
  });

  it('zero sai como zero', () => {
    expect(formatarPercentual(0)).toBe('0');
  });
});
