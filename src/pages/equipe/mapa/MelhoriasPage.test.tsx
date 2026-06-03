// Teste-âncora pra MelhoriasPage.
// Cobre o bug #D: crash "Cannot read properties of undefined (reading 'length')"
// quando rows de process_improvements não trazem os arrays required do tipo
// Melhoria (sistemas, processos, executadoPor, acoesTd).

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestProviders } from '@/test/queryWrapper';
import { mockSupabaseChain } from '@/test/supabaseMock';
import { MELHORIA_ROW, CLUSTER_ROW } from '@/test/fixtures';
import MelhoriasPage from './MelhoriasPage';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

function setupSupabaseMocks(byTable: Record<string, unknown[]>) {
  vi.mocked(supabase.from).mockImplementation((table: string) =>
    mockSupabaseChain({ data: byTable[table] ?? [], error: null }),
  );
}

describe('MelhoriasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza sem crash com row de process_improvements sem junções (bug #D)', async () => {
    setupSupabaseMocks({
      process_improvements: [MELHORIA_ROW],
      processes: [],
      gargalos: [],
      sistemas_processo: [],
      job_roles: [],
      estrutura_clusters: [CLUSTER_ROW],
    });

    render(
      <TestProviders>
        <MelhoriasPage />
      </TestProviders>,
    );

    // Botão "Adicionar Melhoria" confirma render sem crash.
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Avaliar Melhorias/i }),
      ).toBeInTheDocument();
    });
  });

  it('smoke: renderiza sem crash com data vazia', async () => {
    setupSupabaseMocks({
      process_improvements: [],
      processes: [],
      gargalos: [],
      sistemas_processo: [],
      job_roles: [],
      estrutura_clusters: [],
    });

    render(
      <TestProviders>
        <MelhoriasPage />
      </TestProviders>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Avaliar Melhorias/i }),
      ).toBeInTheDocument();
    });
  });
});
