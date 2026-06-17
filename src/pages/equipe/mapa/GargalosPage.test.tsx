// Smoke: GargalosPage renderiza sem crash.

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestProviders } from '@/test/queryWrapper';
import { setupSupabaseEmpty } from '@/test/smokeHelpers';
import GargalosPage from './GargalosPage';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

describe('GargalosPage smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSupabaseEmpty();
  });

  it('renderiza sem crash', async () => {
    render(
      <TestProviders>
        <GargalosPage />
      </TestProviders>,
    );
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Novo gargalo/i }),
      ).toBeInTheDocument();
    });
  });

  it('sem registros, exibe empty state convidativo', async () => {
    render(
      <TestProviders>
        <GargalosPage />
      </TestProviders>,
    );
    await waitFor(() => {
      expect(screen.getByText(/Nenhum gargalo cadastrado/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Cadastrar primeiro gargalo/i }),
      ).toBeInTheDocument();
    });
  });
});
