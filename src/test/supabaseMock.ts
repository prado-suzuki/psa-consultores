// Helper pra construir a cadeia mocked de supabase.from().select().order().etc.
// Cada método retorna `this` (chain), e o `then` final resolve com { data, error }.
//
// Uso típico em testes:
//
//   import { mockSupabaseChain } from '@/test/supabaseMock';
//   import { supabase } from '@/integrations/supabase/client';
//   import { vi } from 'vitest';
//
//   vi.mocked(supabase.from).mockImplementation(() =>
//     mockSupabaseChain({ data: [PROCESSO_OSG_ROW], error: null }),
//   );

import { vi } from 'vitest';

interface MockResult {
  data: unknown;
  error: { message: string } | null;
}

/**
 * Cria uma cadeia mocked que resolve com `result` quando awaitada
 * ou quando `.single()`/`.maybeSingle()` for chamado no fim.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mockSupabaseChain(result: MockResult): any {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    // Cadeia awaitada (`await supabase.from(...).select(...)`) precisa que
    // o objeto seja thenable. O Supabase JS faz isso via PostgrestBuilder
    // que implementa .then(). Replicamos pro mock funcionar igual.
    then: (onFulfilled: (r: MockResult) => unknown) => Promise.resolve(result).then(onFulfilled),
  };
  return chain;
}
