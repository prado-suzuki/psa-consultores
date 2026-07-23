import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnaliseInteligenteAnalysis as Analysis } from '@/lib/analiseInteligente';

const mocks = vi.hoisted(() => ({
  useData: vi.fn(),
  useAnalysis: vi.fn(),
  mutateAsync: vi.fn(),
  toast: vi.fn(),
  loadLogo: vi.fn(),
  exportPdf: vi.fn(),
  useClusters: vi.fn(),
}));

vi.mock('@/hooks/useClusters', () => ({ useClusters: mocks.useClusters }));

vi.mock('@/hooks/useDomainAnaliseInteligenteData', () => ({
  useDomainAnaliseInteligenteData: mocks.useData,
}));
vi.mock('@/hooks/useDomainAnaliseInteligenteAnalysis', () => ({
  useDomainAnaliseInteligenteAnalysis: mocks.useAnalysis,
}));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('@/lib/analiseInteligenteExport', () => ({
  loadAnaliseInteligenteLogo: mocks.loadLogo,
  exportAnaliseInteligentePdf: mocks.exportPdf,
}));
vi.mock('@/components/equipe/EquipeLayout', () => ({
  EquipeLayout: ({
    title,
    subtitle,
    headerActions,
    children,
  }: {
    title: string;
    subtitle: string;
    headerActions: ReactNode;
    children: ReactNode;
  }) => (
    <main>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div>{headerActions}</div>
      {children}
    </main>
  ),
}));
vi.mock('@/components/equipe/dashboards/analise-inteligente/AnaliseInteligenteFilters', () => ({
  AnaliseInteligenteFilters: () => <section aria-label="filtros">Filtros</section>,
}));
vi.mock('@/components/equipe/dashboards/analise-inteligente/AnaliseInteligenteKpis', () => ({
  AnaliseInteligenteKpis: ({ kpis }: { kpis: { score: number } }) => (
    <section aria-label="kpis">Score {kpis.score}</section>
  ),
}));
vi.mock('@/components/equipe/dashboards/analise-inteligente/AnaliseInteligenteCharts', () => ({
  AnaliseInteligenteCharts: () => <section aria-label="gráficos">Gráficos</section>,
}));
vi.mock('@/components/equipe/dashboards/analise-inteligente/AnaliseInteligenteAnalysis', () => ({
  AnaliseInteligenteAnalysis: ({ analise }: { analise: Analysis | null }) => (
    <section aria-label="análise">{analise?.sintese_executiva ?? 'Sem análise'}</section>
  ),
}));

import AnaliseInteligente from '@/pages/equipe/dashboards/AnaliseInteligente';

const emptyData = {
  sprints: [],
  projects: [],
  processes: [],
  deliverables: [],
  dailys: [],
  improvements: [],
};

const analysis: Analysis = {
  sintese_executiva: 'Síntese gerada pela IA',
  evolucao_entregas: 'Evolução',
  tempo_vs_resultado: 'Tempo',
  saudabilidade_sprint: 'Saúde',
  aderencia_escopo: 'Escopo',
  gastos_extras: 'Gastos',
  riscos: [],
  oportunidades: [],
  recomendacoes: [],
  nivel_risco: 'baixo',
  score_saude: 90,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useData.mockReturnValue({ data: emptyData, isFetching: false, error: null });
  mocks.useAnalysis.mockReturnValue({ isPending: false, mutateAsync: mocks.mutateAsync });
  mocks.useClusters.mockReturnValue({ data: [] });
  mocks.loadLogo.mockResolvedValue(undefined);
  mocks.exportPdf.mockReturnValue(true);
});

describe('AnaliseInteligente', () => {
  it('renderiza cabeçalho e loading sem montar KPIs ou gráficos', () => {
    mocks.useData.mockReturnValue({ data: emptyData, isFetching: true, error: null });
    const { container } = render(<AnaliseInteligente />);

    expect(screen.getByRole('heading', { name: 'Análise Inteligente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerar Análise IA' })).toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByLabelText('kpis')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('gráficos')).not.toBeInTheDocument();
  });

  it('expõe estado pendente da IA e bloqueia nova geração', () => {
    mocks.useAnalysis.mockReturnValue({ isPending: true, mutateAsync: mocks.mutateAsync });
    render(<AnaliseInteligente />);

    expect(screen.getByRole('button', { name: 'Analisando…' })).toBeDisabled();
    expect(screen.getByLabelText('kpis')).toHaveTextContent('Score 75');
  });

  it('gera análise com os filtros iniciais e apresenta o resultado e toast de sucesso', async () => {
    mocks.mutateAsync.mockResolvedValue(analysis);
    const user = userEvent.setup();
    render(<AnaliseInteligente />);

    expect(screen.getByLabelText('análise')).toHaveTextContent('Sem análise');
    await user.click(screen.getByRole('button', { name: 'Gerar Análise IA' }));

    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      startDate: '',
      endDate: '',
      sprintFilter: '__ALL__',
      projectFilter: '__ALL__',
      processFilter: '__ALL__',
      clusterFilter: '',
    });
    expect(await screen.findByText('Síntese gerada pela IA')).toBeInTheDocument();
    expect(mocks.toast).toHaveBeenCalledWith({
      title: 'Análise gerada',
      description: 'Insights estratégicos atualizados.',
    });
  });

  it('mantém estado vazio e mostra erro da geração rejeitada', async () => {
    const error = new Error('limite excedido');
    mocks.mutateAsync.mockRejectedValue(error);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(<AnaliseInteligente />);

    await user.click(screen.getByRole('button', { name: 'Gerar Análise IA' }));

    expect(screen.getByLabelText('análise')).toHaveTextContent('Sem análise');
    expect(mocks.toast).toHaveBeenCalledWith({
      title: 'Erro ao gerar análise',
      description: 'limite excedido',
      variant: 'destructive',
    });
    consoleSpy.mockRestore();
  });

  it('aciona exportação e orienta popup quando o navegador bloqueia a janela', async () => {
    mocks.exportPdf.mockReturnValue(false);
    const user = userEvent.setup();
    render(<AnaliseInteligente />);

    await user.click(screen.getByRole('button', { name: 'Exportar PDF' }));

    expect(mocks.exportPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        analise: null,
        startDate: '',
        endDate: '',
        scoreBg: '#10b981',
      }),
    );
    expect(mocks.toast).toHaveBeenCalledWith({
      title: 'Bloqueado',
      description: 'Permita pop-ups para exportar o PDF.',
      variant: 'destructive',
    });
  });
});
