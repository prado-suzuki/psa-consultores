import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useMutation: vi.fn((options: unknown) => options),
}));

const toastMocks = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const createSignedUrl = vi.hoisted(() => vi.fn());
const storageFrom = vi.hoisted(() => vi.fn(() => ({ createSignedUrl })));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('sonner', () => toastMocks);
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: storageFrom } },
}));

import { useBaixarModelo } from '@/hooks/useDomainModeloDocumento';

const modelo = {
  bucket: 'osg-modelos',
  path: 'documento-tipo/bem--x/Modelo X.xlsx',
  nome: 'Planilha X (modelo).xlsx',
};

/** O mock de `useMutation` devolve as próprias opções, então é isso que se testa. */
const opcoes = () => renderHook(() => useBaixarModelo()).result.current as unknown as {
  mutationFn: (m: typeof modelo) => Promise<string>;
  onError: (e: Error) => void;
};

describe('useBaixarModelo', () => {
  beforeEach(() => {
    createSignedUrl.mockReset();
    storageFrom.mockClear();
    toastMocks.toast.error.mockClear();
  });

  it('assina a URL no balde do modelo, com o nome amigável para download', async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://assinada' }, error: null });

    await expect(opcoes().mutationFn(modelo)).resolves.toBe('https://assinada');

    expect(storageFrom).toHaveBeenCalledWith('osg-modelos');
    expect(createSignedUrl).toHaveBeenCalledWith(
      'documento-tipo/bem--x/Modelo X.xlsx',
      3600,
      { download: 'Planilha X (modelo).xlsx' },
    );
  });

  it('erro do storage sobe, e nenhuma URL é devolvida', async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: new Error('sem permissão') });
    await expect(opcoes().mutationFn(modelo)).rejects.toThrow('sem permissão');
  });

  it('resposta sem URL vira erro com texto de gente', async () => {
    createSignedUrl.mockResolvedValue({ data: {}, error: null });
    await expect(opcoes().mutationFn(modelo)).rejects.toThrow('não está disponível');
  });

  it('a falha avisa o usuário por toast', () => {
    opcoes().onError(new Error('sem permissão'));
    expect(toastMocks.toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Não foi possível baixar o modelo'),
    );
  });
});
