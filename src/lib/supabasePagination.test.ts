import { describe, expect, it, vi } from 'vitest';
import { fetchAllRows, SUPABASE_PAGE_SIZE } from '@/lib/supabasePagination';

const rows = (count: number, prefix: string) =>
  Array.from({ length: count }, (_, index) => ({ id: `${prefix}-${index}` }));

describe('fetchAllRows', () => {
  it('percorre as páginas até a incompleta e devolve tudo na ordem lida', async () => {
    const pages = [
      { data: rows(SUPABASE_PAGE_SIZE, 'p1'), error: null, count: 1120 },
      { data: rows(SUPABASE_PAGE_SIZE, 'p2'), error: null, count: 1120 },
      { data: rows(120, 'p3'), error: null, count: 1120 },
    ];
    const fetchPage = vi.fn(() => Promise.resolve(pages.shift()!));

    const result = await fetchAllRows(fetchPage);

    expect(result.rows).toHaveLength(1120);
    expect(result).toMatchObject({ error: null, truncated: false });
    expect(result.rows[0]).toEqual({ id: 'p1-0' });
    expect(fetchPage.mock.calls).toEqual([
      [0, 499],
      [500, 999],
      [1000, 1499],
    ]);
  });

  it('para pelo total quando a última página vem cheia', async () => {
    const pages = [
      { data: rows(SUPABASE_PAGE_SIZE, 'p1'), error: null, count: 1000 },
      { data: rows(SUPABASE_PAGE_SIZE, 'p2'), error: null, count: 1000 },
    ];
    const fetchPage = vi.fn(() => Promise.resolve(pages.shift()!));

    const result = await fetchAllRows(fetchPage);

    expect(result.rows).toHaveLength(1000);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('sem count devolvido, segue paginando em vez de truncar na primeira página', async () => {
    const pages = [
      { data: rows(SUPABASE_PAGE_SIZE, 'p1'), error: null, count: null },
      { data: rows(SUPABASE_PAGE_SIZE, 'p2'), error: null },
      { data: rows(7, 'p3'), error: null, count: null },
    ];
    const fetchPage = vi.fn(() => Promise.resolve(pages.shift()!));

    const result = await fetchAllRows(fetchPage);

    expect(result.rows).toHaveLength(SUPABASE_PAGE_SIZE * 2 + 7);
    expect(result.truncated).toBe(false);
  });

  it('devolve o erro com o que já leu, sem seguir paginando', async () => {
    const failure = new Error('rls');
    const pages = [
      { data: rows(SUPABASE_PAGE_SIZE, 'p1'), error: null, count: 2000 },
      { data: null, error: failure, count: null },
    ];
    const fetchPage = vi.fn(() => Promise.resolve(pages.shift()!));

    const result = await fetchAllRows(fetchPage);

    expect(result).toMatchObject({ error: failure, truncated: false });
    expect(result.rows).toHaveLength(SUPABASE_PAGE_SIZE);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('sinaliza truncamento ao bater no teto de páginas em vez de rodar sem fim', async () => {
    const fetchPage = vi.fn(() =>
      Promise.resolve({ data: rows(10, 'cheia'), error: null, count: 999_999 }),
    );

    const result = await fetchAllRows(fetchPage, { pageSize: 10, maxPages: 3 });

    expect(result).toMatchObject({ truncated: true, error: null });
    expect(result.rows).toHaveLength(30);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });
});
