import { describe, expect, it } from 'vitest';
import type { MelhoriaRoi } from '@/lib/boardExecutivo';
import {
  catalogoFerramentas, ftePorArea, melhoriaEstaImplementada,
} from './boardFerramentasLeitura';

const m = (over: Partial<MelhoriaRoi> & Pick<MelhoriaRoi, 'id'>): MelhoriaRoi => ({
  cost_saved_monthly: null,
  implementation_cost: null,
  one_time_external_cost: null,
  created_at: null,
  ...over,
});

describe('melhoriaEstaImplementada', () => {
  it('aceita Concluído e completed; recusa backlog', () => {
    expect(melhoriaEstaImplementada({ improvement_status: 'Concluído', evaluation_status: null })).toBe(true);
    expect(melhoriaEstaImplementada({ improvement_status: null, evaluation_status: 'completed' })).toBe(true);
    expect(melhoriaEstaImplementada({ improvement_status: 'Backlog', evaluation_status: 'pending' })).toBe(false);
  });
});

describe('catalogoFerramentas / ftePorArea', () => {
  it('agrupa avaliações do mesmo processo e soma hora', () => {
    const rows = [
      m({ id: '1', process_name: 'DIFAL', process_area: 'Fiscal', time_saved_hours: 80, baseline_time_hours: 125, improved_time_hours: 45, cost_saved_monthly: 6400, evaluation_status: 'completed' }),
      m({ id: '2', process_name: 'DIFAL', process_area: 'Fiscal', time_saved_hours: 32, baseline_time_hours: 40, improved_time_hours: 8, cost_saved_monthly: 2030, improvement_status: 'Concluído' }),
      m({ id: '3', process_name: 'SPED', process_area: 'Consultoria', time_saved_hours: 28, improvement_status: 'Concluído' }),
      m({ id: '4', process_name: 'Fila', improvement_status: 'Backlog' }),
    ];
    const cat = catalogoFerramentas(rows);
    expect(cat.map((c) => c.nome)).toEqual(['DIFAL', 'SPED']);
    expect(cat[0].implementacoes).toBe(2);
    expect(cat[0].horasLiberadas).toBe(112);
    expect(cat[0].fte).toBeCloseTo(112 / 176, 5);

    const areas = ftePorArea(rows);
    expect(areas[0].area).toBe('Fiscal');
    expect(areas[0].ferramentas).toBe(1);
    expect(areas[0].horasLiberadas).toBe(112);
  });
});
