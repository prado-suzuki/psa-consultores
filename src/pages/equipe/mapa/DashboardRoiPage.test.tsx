// Smoke: DashboardRoiPage renderiza sem crash.

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestProviders } from '@/test/queryWrapper';
import { setupSupabaseEmpty } from '@/test/smokeHelpers';
import DashboardRoiPage from './DashboardRoiPage';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

describe('DashboardRoiPage smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSupabaseEmpty();
  });

  it('renderiza sem crash', async () => {
    render(
      <TestProviders>
        <DashboardRoiPage />
      </TestProviders>,
    );
    // Botão "Editar Escopo" é único e estável no hero da página.
    await waitFor(() => {
      expect(screen.getByText(/Editar Escopo/i)).toBeInTheDocument();
    });
  });
});
