// Smoke: ResponsaveisPage renderiza sem crash.

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestProviders } from '@/test/queryWrapper';
import { setupSupabaseEmpty } from '@/test/smokeHelpers';
import ResponsaveisPage from './ResponsaveisPage';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

describe('ResponsaveisPage smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSupabaseEmpty();
  });

  it('renderiza sem crash', async () => {
    render(
      <TestProviders>
        <ResponsaveisPage />
      </TestProviders>,
    );
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Adicionar Responsável/i }),
      ).toBeInTheDocument();
    });
  });
});
