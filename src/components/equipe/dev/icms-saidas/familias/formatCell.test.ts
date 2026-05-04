import { describe, expect, it } from 'vitest';
import { formatCell } from './formatCell';

describe('formatCell', () => {
  it('formata competencias numericas em mes por extenso sem o ano', () => {
    expect(formatCell('MES_ANO', '07/2025')).toBe('Julho');
    expect(formatCell('MES_ANO', '2025-08')).toBe('Agosto');
    expect(formatCell('MES_ANO', '2025-09-01')).toBe('Setembro');
  });

  it('normaliza competencias textuais para capitalizacao consistente', () => {
    expect(formatCell('competencia', 'janeiro')).toBe('Janeiro');
    expect(formatCell('COMPETENCIA', 'fevereiro/2025')).toBe('Fevereiro');
  });
});
