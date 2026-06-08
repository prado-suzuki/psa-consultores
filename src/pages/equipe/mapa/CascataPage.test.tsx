// Smoke: CascataPage renderiza sem crash.

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestProviders } from '@/test/queryWrapper';
import { setupSupabaseEmpty } from '@/test/smokeHelpers';
import CascataPage from './CascataPage';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

describe('CascataPage smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSupabaseEmpty();
  });

  it('renderiza sem crash', async () => {
    render(
      <TestProviders>
        <CascataPage />
      </TestProviders>,
    );
    // Cascata é derivada dos gargalos (etapas-origem), sem eventos manuais.
    // O heading confirma render sem crash.
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^Cascata$/i })).toBeInTheDocument();
    });
  });
});
