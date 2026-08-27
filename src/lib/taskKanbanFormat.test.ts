import { describe, expect, it } from 'vitest';
import { formatKanbanDate } from '@/lib/taskKanbanFormat';

describe('formatKanbanDate', () => {
  it('mostra dia e mês do prazo', () => {
    expect(formatKanbanDate('2026-08-31')).toBe('31/08');
  });

  it('lê a data no fuso local, não em UTC', () => {
    // Sem o T00:00:00 o dia 1º voltaria como 31 do mês anterior em fuso negativo.
    expect(formatKanbanDate('2026-03-01')).toBe('01/03');
  });

  it('devolve vazio quando não há prazo', () => {
    expect(formatKanbanDate(null)).toBe('');
  });
});
