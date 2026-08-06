import { describe, expect, it } from 'vitest';
import { toSearchParams } from './client';

describe('toSearchParams', () => {
  it('serializa o filtro global por pessoa sem perder o período e o cluster', () => {
    const parametros = new URLSearchParams(
      toSearchParams({
        inicio: '2026-01-01',
        fim: '2026-08-06',
        usuario: 'João Cruz',
        clusterId: 'cluster-1',
      }),
    );

    expect(Object.fromEntries(parametros)).toEqual({
      inicio: '2026-01-01',
      fim: '2026-08-06',
      usuario: 'João Cruz',
      cluster_id: 'cluster-1',
    });
  });

  it('omite dimensões não selecionadas', () => {
    expect(toSearchParams({ inicio: '2026-01-01', fim: '2026-08-06' })).toBe(
      'inicio=2026-01-01&fim=2026-08-06',
    );
  });
});
