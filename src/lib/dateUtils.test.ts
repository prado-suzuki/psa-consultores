import { describe, expect, it } from 'vitest';

import { dataHoraCurta } from '@/lib/dateUtils';

describe('dataHoraCurta', () => {
  it('formata data e hora no padrão curto brasileiro', () => {
    expect(dataHoraCurta(new Date(2026, 7, 31, 14, 10))).toBe('31/08/2026 14:10');
  });

  it('completa dia, mês, hora e minuto com zero à esquerda', () => {
    expect(dataHoraCurta(new Date(2026, 0, 5, 9, 7))).toBe('05/01/2026 09:07');
  });

  it('aceita a string ISO que vem do banco', () => {
    const iso = new Date(2026, 7, 31, 14, 10).toISOString();
    expect(dataHoraCurta(iso)).toBe('31/08/2026 14:10');
  });

  it('data inválida não escreve "Invalid Date" na tela', () => {
    expect(dataHoraCurta('nao é data')).toBe('');
  });
});
