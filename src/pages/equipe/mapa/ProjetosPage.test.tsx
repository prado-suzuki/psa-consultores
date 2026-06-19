// Teste-âncora pra ProjetosPage (redesign "Cadastro Puro").
// Deixou de ser placeholder ("Projetos em breve"): virou página completa que
// busca dados (useProjetos) e lista os projetos do mapa em linhas enxutas.
// Por isso o teste agora mocka o supabase — sem mock a página fica presa no
// orb de "Carregando" (useProjetos nunca resolve no jsdom).

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestProviders } from '@/test/queryWrapper';
import { mockSupabaseChain } from '@/test/supabaseMock';
import { PROJETO_OSG_ROW, CLUSTER_ROW } from '@/test/fixtures';
import ProjetosPage from './ProjetosPage';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Cada chamada `supabase.from(<tabela>)` retorna um mock chain configurado pra
// a tabela específica. Tabelas não listadas resolvem com [].
function setupSupabaseMocks(byTable: Record<string, unknown[]>) {
  vi.mocked(supabase.from).mockImplementation((table: string) =>
    mockSupabaseChain({ data: byTable[table] ?? [], error: null }),
  );
}

describe('ProjetosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('smoke: renderiza o cabeçalho e lista o projeto cadastrado', async () => {
    setupSupabaseMocks({
      projects: [PROJETO_OSG_ROW],
      processes: [],
      process_stages: [],
      process_improvements: [],
      gargalos: [],
      estrutura_clusters: [CLUSTER_ROW],
    });

    render(
      <TestProviders>
        <ProjetosPage />
      </TestProviders>,
    );

    // Depois que useProjetos resolve, o orb de loading some e o cabeçalho aparece.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Projetos' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Adicionar Projeto/i })).toBeInTheDocument();

    // O projeto da fixture aparece como linha da lista.
    expect(await screen.findByText(PROJETO_OSG_ROW.name)).toBeInTheDocument();
  });

  it('mostra o empty state quando não há projetos', async () => {
    setupSupabaseMocks({
      projects: [],
      processes: [],
      process_stages: [],
      process_improvements: [],
      gargalos: [],
      estrutura_clusters: [],
    });

    render(
      <TestProviders>
        <ProjetosPage />
      </TestProviders>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Nenhum projeto cadastrado/i)).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: /Cadastrar primeiro projeto/i }),
    ).toBeInTheDocument();
  });
});
