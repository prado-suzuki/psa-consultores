// Teste-âncora pra ProcessosPage.
// O card mostra o NOME e as ETAPAS do processo empilhadas em ordem — a
// descrição foi movida pra tela de detalhes (/processos/:id/mapear) e não
// deve mais aparecer na listagem.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestProviders } from '@/test/queryWrapper';
import { mockSupabaseChain } from '@/test/supabaseMock';
import { PROCESSO_OSG_ROW, PROJETO_OSG_ROW, CLUSTER_ROW, ETAPA_ROW } from '@/test/fixtures';
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

  it('card mostra nome e etapas em ordem; descrição fica só na tela de detalhes', async () => {
    setupSupabaseMocks({
      processes: [PROCESSO_OSG_ROW],
      projects: [PROJETO_OSG_ROW],
      process_stages: [ETAPA_ROW],
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

    // As etapas do processo aparecem empilhadas no card.
    expect(await screen.findByText(/Solicitar documentos/i)).toBeInTheDocument();

    // A descrição NÃO aparece no card (vive na tela de detalhes).
    expect(
      screen.queryByText(/Levantamento completo do patrimônio do cliente/i),
    ).not.toBeInTheDocument();
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

  it('normaliza complexidade legada em inglês no card e no modal de edição', async () => {
    setupSupabaseMocks({
      processes: [{ ...PROCESSO_OSG_ROW, complexity_level: 'medium' }],
      projects: [PROJETO_OSG_ROW],
      process_stages: [ETAPA_ROW],
      gargalos: [],
      process_improvements: [],
      estrutura_clusters: [CLUSTER_ROW],
    });

    render(
      <TestProviders>
        <ProcessosPage />
      </TestProviders>,
    );

    expect(await screen.findByText('Média')).toBeInTheDocument();
    expect(screen.queryByText(/^medium$/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Editar metadados do processo'));

    const modal = (await screen.findByText('Editar Processo')).closest('.modal');
    expect(modal).not.toBeNull();
    expect(within(modal as HTMLElement).getByRole('button', { name: /Média/i })).toBeInTheDocument();
  });
});
