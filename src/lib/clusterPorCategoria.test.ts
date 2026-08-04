import { describe, expect, it } from 'vitest';
import { resolverClusterDaCategoria, type AreaComCluster } from './clusterPorCategoria';

const area = (name: string, cluster_id: string | null): AreaComCluster => ({ name, cluster_id });

describe('resolverClusterDaCategoria', () => {
  it('devolve o cluster da área que atende a categoria', () => {
    expect(resolverClusterDaCategoria('osg', [area('OSG', 'cluster-osg')]))
      .toBe('cluster-osg');
  });

  it('aceita várias áreas do mesmo cluster — não é ambiguidade', () => {
    // O caso real da categoria 'tax': cinco áreas, um cluster.
    const areas = [
      area('Área Fiscal', 'cluster-tax'),
      area('Área Fixos', 'cluster-tax'),
      area('Tax', 'cluster-tax'),
    ];

    expect(resolverClusterDaCategoria('tax', areas)).toBe('cluster-tax');
  });

  it('levanta quando nenhuma área atende a categoria', () => {
    expect(() => resolverClusterDaCategoria('osg', []))
      .toThrow(/Nenhuma área com cluster atende a categoria "osg"/);
  });

  it('levanta quando a área existe mas está sem cluster', () => {
    expect(() => resolverClusterDaCategoria('osg', [area('OSG', null)]))
      .toThrow(/Nenhuma área com cluster/);
  });

  it('levanta quando a categoria aponta para clusters diferentes', () => {
    const areas = [area('OSG', 'cluster-osg'), area('Compartilhados', 'cluster-tax')];

    expect(() => resolverClusterDaCategoria('osg', areas))
      .toThrow(/está em áreas de 2 clusters diferentes \(OSG, Compartilhados\)/);
  });
});
