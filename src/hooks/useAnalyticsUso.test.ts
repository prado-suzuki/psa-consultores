import { describe, expect, it } from 'vitest';
import { analyticsUsoKeys, normalizarFiltrosAnalytics } from '@/lib/analytics-uso/queryKeys';

describe('analyticsUsoKeys', () => {
  it('isola a mesma consulta entre duas sessões', () => {
    const filtros = { inicio: '2026-01-01', fim: '2026-08-06' };
    expect(analyticsUsoKeys.api('usuario-a', filtros)).not.toEqual(
      analyticsUsoKeys.api('usuario-b', filtros),
    );
  });

  it('inclui todos os filtros que alteram a resposta', () => {
    const base = { inicio: '2026-01-01', fim: '2026-08-06' };
    expect(analyticsUsoKeys.api('usuario-a', { ...base, ferramenta: 'Mapa' })).not.toEqual(
      analyticsUsoKeys.api('usuario-a', { ...base, usuario: 'Pessoa A' }),
    );
  });

  it('mantém somente chaves remotas das duas fontes', () => {
    expect(Object.keys(analyticsUsoKeys)).toEqual(['api', 'arquivos']);
  });

  it('normaliza propriedades ausentes para produzir uma chave canônica', () => {
    expect(normalizarFiltrosAnalytics({ inicio: '2026-01-01', fim: '2026-08-06' })).toEqual({
      inicio: '2026-01-01',
      fim: '2026-08-06',
      clusterId: null,
      usuario: null,
      ferramenta: null,
    });
  });
});
