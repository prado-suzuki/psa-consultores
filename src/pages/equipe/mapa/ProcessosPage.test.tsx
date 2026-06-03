// Teste-âncora pra ProcessosPage.
// Cobre o bug #C (60 cards vazios "Sem descrição" + sem nome) — garante que
// os cards renderizam name E description visíveis quando o DB devolve linhas
// MAPA realistas.

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestProviders } from '@/test/queryWrapper';
import { mockSupabaseChain } from '@/test/supabaseMock';
import { PROCESSO_OSG_ROW, PROJETO_OSG_ROW, CLUSTER_ROW } from '@/test/fixtures';
import ProcessosPage from './ProcessosPage';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Cada chamada `supabase.from(<tabela>)` retorna um mock chain configurado pra
// a tabela específica. Roteador simples por nome.
function setupSupabaseMocks(byTable: Record<string, unknown[]>) {
  vi.mocked(supabase.from).mockImplementation((table: string) =>
    mockSupabaseChain({ data: byTable[table] ?? [], error: null }),
  );
}

describe('ProcessosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza cards de processo MAPA com nome e descrição visíveis (bug #C)', async () => {
    setupSupabaseMocks({
      processes: [PROCESSO_OSG_ROW],
      projects: [PROJETO_OSG_ROW],
      process_stages: [],
      gargalos: [],
      process_improvements: [],
      estrutura_clusters: [CLUSTER_ROW],
    });

    render(
      <TestProviders>
        <ProcessosPage />
      </TestProviders>,
    );

    // O nome aparece — não deve estar vazio.
    expect(
      await screen.findByText(/P1\.01 Diagnóstico Patrimonial Inicial/i),
    ).toBeInTheDocument();

    // A descrição aparece (não cai no fallback "Sem descrição.").
    expect(
      screen.getByText(/Levantamento completo do patrimônio do cliente/i),
    ).toBeInTheDocument();

    // O placeholder do bug NÃO aparece.
    expect(screen.queryByText('Sem descrição.')).not.toBeInTheDocument();
  });

  it('smoke: renderiza sem crash com data vazia', async () => {
    setupSupabaseMocks({
      processes: [],
      projects: [],
      process_stages: [],
      gargalos: [],
      process_improvements: [],
      estrutura_clusters: [],
    });

    render(
      <TestProviders>
        <ProcessosPage />
      </TestProviders>,
    );

    // Botão "+ Adicionar Processo" é único e aparece quando a página renderiza.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Adicionar Processo/i })).toBeInTheDocument();
    });
  });
});
