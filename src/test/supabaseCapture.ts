// Mock de supabase que CAPTURA os payloads de escrita (insert/update/delete/…),
// para testes de hook/sync asseverarem exatamente o que vai pro banco — sem
// tocar em banco real (offline, sem token). Complementa o supabaseMock (smoke).
//
// Uso:
//   vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
//   const cap = mockSupabaseCapture({ sistemas_processo: [{ id: 'S1', ... }] });
//   await hook.mutateAsync(...);
//   expect(cap.payloads('sistemas_processo', 'insert')[0]).toMatchObject({ cluster_id: 'C' });

import { vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

export interface CapturedCall {
  table: string;
  method: string;
  args: unknown[];
}

export interface Capture {
  calls: CapturedCall[];
  /** Payloads (1º argumento) das chamadas de um método numa tabela. */
  payloads: (table: string, method: 'insert' | 'update' | 'upsert') => unknown[];
  /** Se um método foi chamado numa tabela. */
  called: (table: string, method: string) => boolean;
}

/**
 * `byTable`: linhas devolvidas por tabela nas LEITURAS.
 *  - cadeia awaitada (`.select().eq()...`) resolve `{ data: linhas }`;
 *  - `.single()`/`.maybeSingle()` resolvem `{ data: linhas[0] ?? null }`.
 */
export function mockSupabaseCapture(byTable: Record<string, unknown[]> = {}): Capture {
  const calls: CapturedCall[] = [];
  const impl = (table: string) => {
    const rows = byTable[table] ?? [];
    const listResult = { data: rows, error: null };
    const singleResult = { data: rows[0] ?? null, error: null };
    const rec = (method: string) =>
      vi.fn((...args: unknown[]) => { calls.push({ table, method, args }); return chain; });
    const chain: Record<string, unknown> = {
      select: rec('select'), insert: rec('insert'), update: rec('update'),
      upsert: rec('upsert'), delete: rec('delete'),
      eq: rec('eq'), neq: rec('neq'), in: rec('in'), is: rec('is'),
      not: rec('not'), or: rec('or'), order: rec('order'), limit: rec('limit'), range: rec('range'),
      single: vi.fn().mockResolvedValue(singleResult),
      maybeSingle: vi.fn().mockResolvedValue(singleResult),
      then: (onFulfilled: (r: unknown) => unknown) => Promise.resolve(listResult).then(onFulfilled),
    };
    return chain;
  };
  vi.mocked(supabase.from).mockImplementation(impl as never);
  return {
    calls,
    payloads: (table, method) =>
      calls.filter((c) => c.table === table && c.method === method).map((c) => c.args[0]),
    called: (table, method) => calls.some((c) => c.table === table && c.method === method),
  };
}
