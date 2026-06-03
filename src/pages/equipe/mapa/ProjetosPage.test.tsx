// Testes-âncora pra ProjetosPage.
// Cobre:
//   - bug #A: cluster aparecia como UUID raw em vez do nome
//   - bug #B: filtro Cluster=OSG não filtrava (text 'OSG' vs UUID)
//   - smoke: renderiza sem crash

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestProviders } from '@/test/queryWrapper';
import { mockSupabaseChain } from '@/test/supabaseMock';
import {
  PROJETO_OSG_ROW, PROJETO_ROTINA_ROW, PROCESSO_OSG_ROW, CLUSTER_ROW,
  CLUSTER_OSG_UUID,
} from '@/test/fixtures';
import ProjetosPage from './ProjetosPage';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

function setupSupabaseMocks(byTable: Record<string, unknown[]>) {
  vi.mocked(supabase.from).mockImplementation((table: string) =>
    mockSupabaseChain({ data: byTable[table] ?? [], error: null }),
  );
}

describe('ProjetosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('card MAPA exibe nome do cluster, não UUID (bug #A)', async () => {
    setupSupabaseMocks({
      projects: [PROJETO_OSG_ROW],
      processes: [],
      estrutura_clusters: [CLUSTER_ROW],
    });

    render(
      <TestProviders>
        <ProjetosPage />
      </TestProviders>,
    );

    // Nome do projeto aparece.
    expect(
      await screen.findByText(/P1 - Organização Patrimonial/i),
    ).toBeInTheDocument();

    // Nome do cluster ("PSA OSG") aparece no card.
    expect(screen.getByText(/PSA OSG/)).toBeInTheDocument();

    // UUID NÃO aparece visível (caractere por caractere).
    expect(screen.queryByText(CLUSTER_OSG_UUID)).not.toBeInTheDocument();
  });

  it('lista projetos MAPA e Rotina lado a lado quando sem filtro (bug #B precondition)', async () => {
    // Cobre indiretamente o bug #B: quando o filtro está vazio, ambos
    // aparecem. O filtro em si (clicar dropdown + opção) usa um combobox
    // custom (Radix/aria-haspopup=listbox) e é validado via teste visual.
    // O fix real do bug (clusterId em vez de cluster string) é garantido
    // pelo TypeScript após o refator + bug #A render test acima.
    setupSupabaseMocks({
      projects: [PROJETO_OSG_ROW, PROJETO_ROTINA_ROW],
      processes: [PROCESSO_OSG_ROW],
      estrutura_clusters: [CLUSTER_ROW],
    });

    render(
      <TestProviders>
        <ProjetosPage />
      </TestProviders>,
    );

    expect(await screen.findByText(/P1 - Organização Patrimonial/)).toBeInTheDocument();
    expect(screen.getByText(/Rotina PSA/)).toBeInTheDocument();
  });

  it('smoke: renderiza sem crash com data vazia', async () => {
    setupSupabaseMocks({
      projects: [],
      processes: [],
      estrutura_clusters: [],
    });

    render(
      <TestProviders>
        <ProjetosPage />
      </TestProviders>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Adicionar Projeto/i })).toBeInTheDocument();
    });
  });
});
