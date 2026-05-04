import { describe, expect, it } from 'vitest';
import { deriveDetailChecks, deriveTotalsChecks } from './derivedChecks';

describe('deriveDetailChecks', () => {
  it('calcula o check do detalhe como calculado menos C190', () => {
    expect(
      deriveDetailChecks(
        {
          VALOR_ICMS: 125.5,
          VL_ICMS_C190: 120.25,
        },
        'etanol_interestado',
      ),
    ).toMatchObject({
      C190_CHECK: 5.25,
    });
  });

  it('preserva checks ja vindos da API', () => {
    const row = {
      ICMS_17_CALCULADO: 90,
      VL_ICMS_C190: 100,
      C190_CHECK: -10,
    };

    expect(deriveDetailChecks(row, 'etanol_interno')).toBe(row);
  });
});

describe('deriveTotalsChecks', () => {
  it('calcula checks C190 e E116 derivados quando os campos crus estao presentes', () => {
    const row = deriveTotalsChecks({
      ICMS_NORMAL: 100,
      VL_ICMS_C190: 103,
      ICMS_RECOLHER: 25,
      ICMS_RECOLHER_EFD: 24.5,
      FUNDES: 6,
      FUNDES_EFD: 6.1,
      FUNDED: 1,
      FUNDED_EFD: 0.95,
    });

    expect(row.ICMS_C190_CHECK).toBe(3);
    expect(row.ICMS_RECOLHER_E116_CHECK).toBe(-0.5);
    expect(row.FUNDES_E116_CHECK).toBeCloseTo(0.1);
    expect(row.FUNDED_E116_CHECK).toBeCloseTo(-0.05);
  });
});
