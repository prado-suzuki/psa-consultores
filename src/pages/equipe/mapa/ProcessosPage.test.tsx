// Teste-âncora pra ProcessosPage (redesign "Cadastro Puro").
// A listagem é enxuta: só nome + código + projeto. Etapas, descrição e demais
// vínculos vivem na "Modal da Paz" (detalhe), aberta ao clicar na linha.
// A complexidade legada em inglês é normalizada no selo e no form de edição.

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

  it('lista mostra o nome; sub-etapas e descrição não aparecem na lista', async () => {
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

    // Grupos vêm recolhidos: expande o processo para ver suas etapas.
    fireEvent.click(await screen.findByTitle('Expandir etapas'));

    // O nome da etapa aparece após expandir.
    await screen.findByText(/P1\.01 Diagnóstico Patrimonial Inicial/i);

    // Sub-etapas e descrição NÃO aparecem na lista (vivem no mapeamento; clicar
    // na linha navega direto para /mapear, sem modal de detalhe).
    expect(screen.queryByText(/Solicitar documentos/i)).not.toBeInTheDocument();
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
      expect(screen.getByRole('button', { name: /Adicionar Etapa/i })).toBeInTheDocument();
    });
  });

  it('normaliza complexidade legada em inglês no selo e no modal de edição', async () => {
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

    // Expande o grupo para ver o selo de complexidade e as ações da etapa.
    fireEvent.click(await screen.findByTitle('Expandir etapas'));

    expect(await screen.findByText('Média')).toBeInTheDocument();
    expect(screen.queryByText(/^medium$/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle(`Editar ${PROCESSO_OSG_ROW.name}`));

    // O form de edição abre com a seção "Identificação" e o sub "Editar processo".
    const modal = (await screen.findByText('Identificação')).closest('.modal');
    expect(modal).not.toBeNull();
    expect(within(modal as HTMLElement).getByText('Editar etapa')).toBeInTheDocument();
    expect(within(modal as HTMLElement).getByRole('button', { name: /Média/i })).toBeInTheDocument();
  });
});
