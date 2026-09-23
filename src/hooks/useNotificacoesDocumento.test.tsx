import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));
const dbMocks = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: dbMocks.from } }));

import { mockSupabaseChain } from '@/test/supabaseMock';
import { useNotificacoesDocumento } from '@/hooks/useNotificacoesDocumento';

describe('useNotificacoesDocumento', () => {
  it('o carimbo do registro nos movimentos não chega à aba Notificações', async () => {
    const cadeia = mockSupabaseChain({
      data: [{
        id: 'l1', entity_type: 'movimentacao_quotas', entity_id: 'm1', entity_name: 'Cessão', action: 'updated',
        changed_fields: { documento_gerado_id: { old: '3b53f1ac', new: '690a8517' } },
        performed_by: 'u1', performed_at: '2026-09-22T12:00:00Z',
      }],
      error: null,
    });
    cadeia.gt = vi.fn().mockReturnValue(cadeia);
    dbMocks.from.mockReturnValue(cadeia);
    const { result } = renderHook(() => useNotificacoesDocumento({
      documentoGeradoId: 'doc', validadoEm: '2026-09-21T00:00:00Z', vistoEm: null, entidadeIds: ['m1'],
    }));
    const opcoes = result.current as unknown as { queryFn: () => Promise<unknown[]> };
    await expect(opcoes.queryFn()).resolves.toEqual([]);
  });
});
