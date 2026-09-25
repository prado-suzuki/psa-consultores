import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: mocks.invoke } },
}));

import { useEnriquecerTexto } from '@/hooks/useEnriquecerTexto';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useEnriquecerTexto', () => {
  it('envia somente os destinos dos campos definidos pelo contrato consumidor', async () => {
    mocks.invoke.mockResolvedValue({
      data: {
        estruturado: true,
        campos: {
          titulo: { valor: { tipo: 'texto', texto: 'Revisar contrato' }, destino: 'simples' },
          descricao: {
            valor: { tipo: 'texto', texto: '**Contexto:** contrato.' },
            destino: 'rico',
          },
        },
      },
      error: null,
    });
    const destinos = { titulo: 'simples', descricao: 'rico' } as const;
    const { result } = renderHook(
      () => useEnriquecerTexto('comentario-para-tarefa', { destinos }),
      { wrapper },
    );

    await act(async () => {
      await result.current.mutateAsync('  Revisar o contrato.  ');
    });

    expect(mocks.invoke).toHaveBeenCalledWith('enriquecer-texto', {
      body: {
        perfil: 'comentario-para-tarefa',
        texto: 'Revisar o contrato.',
        destinos,
      },
    });
  });
});
