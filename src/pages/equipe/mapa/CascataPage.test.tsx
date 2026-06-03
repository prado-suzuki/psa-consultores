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
    // Botão "+ Novo Evento" único confirma render sem crash.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Novo Evento/i })).toBeInTheDocument();
    });
  });
});
