import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useMutation: vi.fn((options: unknown) => options),
  invalidateQueries: vi.fn(),
  rpc: vi.fn(),
  assertCanPerform: vi.fn(),
  logActionOrThrow: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: mocks.useMutation,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: mocks.rpc },
}));
vi.mock('@/hooks/useRlsPrecheck', () => ({
  assertCanPerform: mocks.assertCanPerform,
}));
vi.mock('@/hooks/useAuditLog', () => ({
  useAuditLog: () => ({ logActionOrThrow: mocks.logActionOrThrow }),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));

import { useDeleteCliente } from '@/hooks/useDeleteCliente';

type MutationOptions = {
  mutationFn: (params: { id: string; nome: string }) => Promise<void>;
};

function mutationOptions(): MutationOptions {
  renderHook(() => useDeleteCliente());
  return mocks.useMutation.mock.calls.at(-1)?.[0] as MutationOptions;
}

describe('useDeleteCliente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertCanPerform.mockResolvedValue(undefined);
    mocks.logActionOrThrow.mockResolvedValue(undefined);
    mocks.rpc.mockResolvedValue({ data: 1, error: null });
  });

  it('audita e usa a RPC de exclusao logica com o id do cliente', async () => {
    await mutationOptions().mutationFn({ id: 'cliente-1', nome: 'Cliente Um' });

    expect(mocks.assertCanPerform).toHaveBeenCalledWith('cliente', 'update', 'cliente-1');
    expect(mocks.logActionOrThrow).toHaveBeenCalledWith({
      area: 'cadastros',
      entity_type: 'cliente',
      entity_id: 'cliente-1',
      entity_name: 'Cliente Um',
      action: 'deleted',
      changed_fields: { excluido: { old: false, new: true } },
    });
    expect(mocks.rpc).toHaveBeenCalledWith('soft_delete_cliente', { _ids: ['cliente-1'] });
    expect(mocks.logActionOrThrow.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.rpc.mock.invocationCallOrder[0]);
  });

  it('nao trata retorno zero como exclusao concluida', async () => {
    mocks.rpc.mockResolvedValue({ data: 0, error: null });

    await expect(mutationOptions().mutationFn({ id: 'cliente-1', nome: 'Cliente Um' }))
      .rejects.toThrow('O cliente não foi excluído');
  });
});
