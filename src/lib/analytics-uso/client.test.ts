import { describe, expect, it, vi } from 'vitest';
import usoApiFixture from './__fixtures__/uso-api.json';
import arquivosFixture from './__fixtures__/arquivos.json';
import { fetchArquivos, fetchUsoApi, toSearchParams } from './client';

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

describe('fetchUsoApi', () => {
  it('propaga o AbortSignal e desativa retries internos para o TanStack controlar', async () => {
    const fetcher = vi.fn(
      async (_url: string, _init?: RequestInit, _timeoutMs?: number, _maxRetries?: number) =>
        new Response(JSON.stringify(usoApiFixture), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    const controller = new AbortController();

    await fetchUsoApi(fetcher, { inicio: '2026-01-01', fim: '2026-08-06' }, controller.signal);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]).toEqual({ signal: controller.signal });
    expect(fetcher.mock.calls[0][2]).toBe(30_000);
    expect(fetcher.mock.calls[0][3]).toBe(1);
    expect(fetcher.mock.calls[0][0]).toContain('/api/v1/analytics/uso/api-consumo?');
  });

  it('não entrega payload inválido aos componentes', async () => {
    const fetcher = vi.fn(
      async (_url: string, _init?: RequestInit, _timeoutMs?: number, _maxRetries?: number) =>
        new Response(JSON.stringify({ periodo: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );

    await expect(fetchUsoApi(fetcher, { inicio: '2026-01-01', fim: '2026-08-06' })).rejects.toThrow(
      'dados incompatíveis',
    );
  });
});

describe('fetchArquivos', () => {
  it('usa a segunda e última rota remota do dashboard', async () => {
    const fetcher = vi.fn(
      async (_url: string, _init?: RequestInit, _timeoutMs?: number, _maxRetries?: number) =>
        new Response(JSON.stringify(arquivosFixture), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );

    await fetchArquivos(fetcher, {
      inicio: '2026-06-01',
      fim: '2026-08-06',
      clusterId: 'cluster-1',
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toContain('/api/v1/analytics/uso/arquivos?');
    expect(fetcher.mock.calls[0][0]).toContain('cluster_id=cluster-1');
  });
});
