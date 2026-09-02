import { describe, expect, it } from 'vitest';
import { eClusterLegado, filtrarLegado } from './boardLegado';

describe('eClusterLegado', () => {
  it('corta os três nomes da reunião e preserva a estrutura viva', () => {
    expect(eClusterLegado('PSA Consultores')).toBe(true);
    expect(eClusterLegado('P Consultores')).toBe(true);
    expect(eClusterLegado('Prado Suzuki')).toBe(true);
    expect(eClusterLegado('PSA Auditores')).toBe(false);
    expect(eClusterLegado('PSA Norte')).toBe(false);
    expect(eClusterLegado('Prado Advogados')).toBe(false);
  });

  it('ignora caixa e espaço; vazio não é legado', () => {
    expect(eClusterLegado('  prado   suzuki  ')).toBe(true);
    expect(eClusterLegado(null)).toBe(false);
    expect(eClusterLegado('')).toBe(false);
  });
});

describe('filtrarLegado', () => {
  it('tira a linha pelo cluster_nome', () => {
    const rows = [
      { id: '1', cluster_nome: 'PSA Norte' },
      { id: '2', cluster_nome: 'PSA Consultores' },
      { id: '3', cluster_nome: 'Prado Advogados' },
    ];
    expect(filtrarLegado(rows).map((r) => r.id)).toEqual(['1', '3']);
  });
});
