// Helper compartilhado para criar mocks supabase de páginas de smoke.
// Reduz o boilerplate de cada teste.

import { vi } from 'vitest';
import { mockSupabaseChain } from './supabaseMock';
import { supabase } from '@/integrations/supabase/client';

/**
 * Roteia chamadas de `supabase.from(table)` pra rows-stub.
 * Tabelas não listadas retornam `[]` por padrão.
 */
export function setupSupabaseMocks(byTable: Record<string, unknown[]>) {
  vi.mocked(supabase.from).mockImplementation((table: string) =>
    mockSupabaseChain({ data: byTable[table] ?? [], error: null }),
  );
}

/** Mock vazio total — todas as tabelas devolvem []. */
export function setupSupabaseEmpty() {
  vi.mocked(supabase.from).mockImplementation(() =>
    mockSupabaseChain({ data: [], error: null }),
  );
}
