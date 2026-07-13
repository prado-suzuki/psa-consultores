// Testa useReorderProcessos — o arraste na lista grava `order_index` em lote com
// update OTIMISTA do cache (os códigos P1.01… recomputam na hora) e ROLLBACK se
// a persistência falhar (sem fallback silencioso).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { supabase } from '@/integrations/supabase/client';
import { mockSupabaseCapture } from '@/test/supabaseCapture';
import { mockSupabaseChain } from '@/test/supabaseMock';
import { makeHookWrapper } from '@/test/queryWrapper';
import { useReorderProcessos } from './useProcessos';

// QueryClient com gcTime alto: sem observador ativo, o cache seria coletado e a
// asserção sobre o cache ficaria flaky. Aqui ele persiste durante o teste.
function qcComCache(rows: Array<{ id: string; name: string; order_index: number }>) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 60_000 }, mutations: { retry: false } },
  });
  qc.setQueryData(['processes'], rows);
  return qc;
}

const ROWS = [
  { id: 'A', name: 'A', order_index: 0 },
  { id: 'B', name: 'B', order_index: 1 },
];
const NOVA_ORDEM = [
  { id: 'A', order_index: 1 },
  { id: 'B', order_index: 0 },
];

describe('useReorderProcessos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('grava order_index em lote (só a coluna) e atualiza o cache otimista', async () => {
    const cap = mockSupabaseCapture({});
    const qc = qcComCache(ROWS);
    const { result } = renderHook(() => useReorderProcessos(), { wrapper: makeHookWrapper(qc) });

    await act(async () => { await result.current.mutateAsync(NOVA_ORDEM); });

    // uma chamada de update por processo, com APENAS a coluna order_index
    expect(cap.payloads('processes', 'update')).toEqual([{ order_index: 1 }, { order_index: 0 }]);
    // cache refletiu a nova ordem sem esperar o refetch
    const cache = qc.getQueryData(['processes']) as typeof ROWS;
    expect(cache.find(p => p.id === 'A')?.order_index).toBe(1);
    expect(cache.find(p => p.id === 'B')?.order_index).toBe(0);
  });

  it('erro na persistência faz ROLLBACK do cache otimista', async () => {
    vi.mocked(supabase.from).mockImplementation(
      () => mockSupabaseChain({ data: null, error: { message: 'boom' } }) as never,
    );
    const qc = qcComCache(ROWS);
    const { result } = renderHook(() => useReorderProcessos(), { wrapper: makeHookWrapper(qc) });

    await act(async () => { await result.current.mutateAsync(NOVA_ORDEM).catch(() => {}); });

    // rollback: cache voltou à ordem original
    const cache = qc.getQueryData(['processes']) as typeof ROWS;
    expect(cache.find(p => p.id === 'A')?.order_index).toBe(0);
    expect(cache.find(p => p.id === 'B')?.order_index).toBe(1);
  });
});
