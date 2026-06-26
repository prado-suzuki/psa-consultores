import { describe, it, expect } from 'vitest';
import { agruparCheckpoints } from './useSnapshots';
import type { ProcessSnapshot } from '@/types';

const snap = (over: Partial<ProcessSnapshot>): ProcessSnapshot => ({
  id: Math.random().toString(36).slice(2),
  checkpoint_id: 'c1', scope_kind: 'project', scope_id: 'proj1',
  process_id: 'p1', snapshot_at: '2026-01-01T00:00:00Z',
  annual_cost: 0, annual_hours: 0, annual_savings: 0, roi_percent: 0,
  payback_months: 0, hours_freed: 0, investment: 0,
  ...over,
});

describe('agruparCheckpoints', () => {
  it('vazio → []', () => {
    expect(agruparCheckpoints([])).toEqual([]);
  });

  it('1 checkpoint com 2 processos → soma KPIs e calcula razões sobre os somatórios', () => {
    const rows = [
      snap({ checkpoint_id: 'cA', process_id: 'p1', annual_cost: 1000, annual_savings: 600, investment: 1000, annual_hours: 30, hours_freed: 10 }),
      snap({ checkpoint_id: 'cA', process_id: 'p2', annual_cost: 500, annual_savings: 400, investment: 500, annual_hours: 20, hours_freed: 5 }),
    ];
    const [c] = agruparCheckpoints(rows);
    expect(c.qtdProcessos).toBe(2);
    expect(c.annual_cost).toBeCloseTo(1500, 6);
    expect(c.annual_savings).toBeCloseTo(1000, 6);
    expect(c.investment).toBeCloseTo(1500, 6);
    expect(c.annual_hours).toBeCloseTo(50, 6);
    expect(c.hours_freed).toBeCloseTo(15, 6);
    // ROI = 1000/1500*100; payback = 1500 / (1000/12)
    expect(c.roi_percent).toBeCloseTo(66.6667, 3);
    expect(c.payback_months).toBeCloseTo(18, 6);
  });

  it('2 checkpoints → 2 pontos ordenados por snapshot_at asc', () => {
    const rows = [
      snap({ checkpoint_id: 'cNovo', snapshot_at: '2026-03-01T00:00:00Z', annual_cost: 200 }),
      snap({ checkpoint_id: 'cVelho', snapshot_at: '2026-01-01T00:00:00Z', annual_cost: 100 }),
    ];
    const out = agruparCheckpoints(rows);
    expect(out.map(c => c.checkpoint_id)).toEqual(['cVelho', 'cNovo']);
    expect(out[0].annual_cost).toBeCloseTo(100, 6);
  });

  it('investimento 0 → ROI/payback null (sem inventar)', () => {
    const rows = [snap({ checkpoint_id: 'cZero', annual_savings: 500, investment: 0 })];
    const [c] = agruparCheckpoints(rows);
    expect(c.roi_percent).toBeNull();
    expect(c.payback_months).toBeNull();
  });
});
