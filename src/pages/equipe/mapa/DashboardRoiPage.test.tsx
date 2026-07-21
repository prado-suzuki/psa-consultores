import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestProviders, createTestQueryClient } from '@/test/queryWrapper';
import DashboardRoiPage from './DashboardRoiPage';

const mocks = vi.hoisted(() => ({
  projetos: [] as Array<Record<string, unknown>>,
  processos: [] as Array<Record<string, unknown>>,
  etapas: [] as Array<Record<string, unknown>>,
  etapasFuturo: [] as Array<Record<string, unknown>>,
  responsaveis: [] as Array<Record<string, unknown>>,
  sistemas: [] as Array<Record<string, unknown>>,
  gargalos: [] as Array<Record<string, unknown>>,
  melhorias: [] as Array<Record<string, unknown>>,
  documentos: [] as Array<Record<string, unknown>>,
  snapshots: [] as Array<Record<string, unknown>>,
  freshSnapshots: [] as Array<Record<string, unknown>>,
  cluster: '',
  clusters: [] as Array<Record<string, unknown>>,
  buildRoiCsv: vi.fn(),
  triggerCsvDownload: vi.fn(),
  fetchSnapshotsLatest: vi.fn(),
  capturarNodePng: vi.fn(),
  montarHtml: vi.fn(),
  montarPdf: vi.fn(),
  baixarBlob: vi.fn(),
}));

vi.mock('@/hooks/useDominioListas', () => ({
  useProjetosLista: () => ({ data: mocks.projetos }),
  useProcessosLista: () => ({ data: mocks.processos }),
  useEtapasLista: () => ({ data: mocks.etapas }),
  useEtapasToBeLista: () => ({ data: mocks.etapasFuturo }),
  useResponsaveisLista: () => ({ data: mocks.responsaveis }),
  useSistemasLista: () => ({ data: mocks.sistemas }),
  useGargalosLista: () => ({ data: mocks.gargalos }),
  useMelhoriasLista: () => ({ data: mocks.melhorias }),
  useDocumentosLista: () => ({ data: mocks.documentos }),
}));

vi.mock('@/hooks/useSnapshots', () => ({
  SNAPSHOTS_LATEST_QUERY_KEY: ['roi_snapshots', '_latest'],
  useSnapshotsLatest: () => ({ data: mocks.snapshots }),
  useSnapshots: () => ({ data: [], isLoading: false }),
  fetchSnapshotsLatest: mocks.fetchSnapshotsLatest,
}));

vi.mock('@/hooks/useClusterGlobal', () => ({ useClusterGlobal: () => ({ cluster: mocks.cluster }) }));
vi.mock('@/hooks/useClusters', () => ({ useClusters: () => ({ data: mocks.clusters }) }));

vi.mock('@/lib/roiCsv', () => ({
  buildRoiCsv: mocks.buildRoiCsv,
  triggerCsvDownload: mocks.triggerCsvDownload,
}));

vi.mock('@/lib/roiVisualExport', () => ({
  capturarNodePng: mocks.capturarNodePng,
  montarHtml: mocks.montarHtml,
  montarPdf: mocks.montarPdf,
  baixarBlob: mocks.baixarBlob,
}));

const TAB_LABELS = [
  'Sumário Executivo',
  'O Mapeamento',
  'Diagnóstico',
  'As Melhorias',
  'Cenário Futuro',
  'Evolução',
];

const PROJECTS = [
  { id: 'P1', name: 'Projeto Alfa', description: '', status: 'ROI', cluster_id: 'C1' },
  { id: 'P2', name: 'Projeto Beta', description: '', status: 'Mapeamento', cluster_id: 'C2' },
];

const PROCESSES = [
  { id: 'PR1', name: 'Processo Alfa', project_id: 'P1', volume_executions: 12 },
  { id: 'PR2', name: 'Processo Beta', project_id: 'P2', volume_executions: 6 },
];

const RESPONSAVEIS = [
  { id: 'R1', name: 'Analista', level: 'Pleno', hourly_rate: 100 },
];

const ETAPAS = [
  {
    id: 'E1', name: 'Conferir', description: '', process_id: 'PR1', execution: '',
    rework_rate: 0, volume_per_process: 1, volumeMensal: 1,
    executadoPor: [{ responsavelId: 'R1', nome: 'Analista', horas: 2 }],
    sistemas: [], docsEntrada: [], docsSaida: [],
  },
  {
    id: 'E2', name: 'Aprovar', description: '', process_id: 'PR2', execution: '',
    rework_rate: 0, volume_per_process: 1, volumeMensal: 1,
    executadoPor: [{ responsavelId: 'R1', nome: 'Analista', horas: 1 }],
    sistemas: [], docsEntrada: [], docsSaida: [],
  },
];

function renderPage() {
  const queryClient = createTestQueryClient();
  return {
    ...render(
    <TestProviders queryClient={queryClient}>
      <DashboardRoiPage />
    </TestProviders>,
    ),
    queryClient,
  };
}

function usePortfolio() {
  mocks.projetos = [...PROJECTS];
  mocks.processos = [...PROCESSES];
  mocks.etapas = [...ETAPAS];
  mocks.responsaveis = [...RESPONSAVEIS];
}

async function selectOption(currentLabel: string, optionLabel: string) {
  await userEvent.click(screen.getByRole('button', { name: currentLabel }));
  await userEvent.click(screen.getByRole('option', { name: optionLabel }));
}

async function openExport() {
  await userEvent.click(screen.getByRole('button', { name: 'Exportar' }));
  expect(screen.getByRole('heading', { name: 'Exportar Dashboard ROI' })).toBeInTheDocument();
}

describe('DashboardRoiPage — caracterização pública', () => {
  beforeEach(() => {
    const realSetTimeout = window.setTimeout;
    vi.clearAllMocks();
    mocks.projetos = [];
    mocks.processos = [];
    mocks.etapas = [];
    mocks.etapasFuturo = [];
    mocks.responsaveis = [];
    mocks.sistemas = [];
    mocks.gargalos = [];
    mocks.melhorias = [];
    mocks.documentos = [];
    mocks.snapshots = [];
    mocks.freshSnapshots = [];
    mocks.cluster = '';
    mocks.clusters = [];
    mocks.fetchSnapshotsLatest.mockImplementation(async () => mocks.freshSnapshots);
    mocks.buildRoiCsv.mockReturnValue('csv-gerado');
    mocks.capturarNodePng.mockResolvedValue({ dataUrl: 'data:image/png;base64,AA', width: 100, height: 50 });
    mocks.montarHtml.mockReturnValue('<html>dashboard</html>');
    mocks.montarPdf.mockResolvedValue(undefined);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'setTimeout').mockImplementation((handler, timeout, ...args) => {
      if (timeout === 380) {
        return realSetTimeout(() => {
          if (typeof handler === 'function') handler(...args);
        }, 0) as unknown as NodeJS.Timeout;
      }
      return realSetTimeout(handler, timeout, ...args) as unknown as NodeJS.Timeout;
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('mantém seis abas na ordem, textos vazios e marcadores data-tour', async () => {
    const { container } = renderPage();

    expect(screen.getByRole('heading', { name: 'Visão Geral — Todos os projetos' })).toBeInTheDocument();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(6);
    expect(tabs.map((tab) => tab.querySelector('.dashv2-tab-label')?.textContent)).toEqual(TAB_LABELS);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Nenhum processo no escopo selecionado.')).toBeInTheDocument();
    expect(screen.getAllByText('em construção').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/ROI e payback aparecem como "em construção"/)).toBeInTheDocument();
    expect(container.querySelector('[data-tour="roi-export"]')).toBeInTheDocument();
    expect(container.querySelector('[data-tour="roi-filtros"]')).toBeInTheDocument();
    expect(container.querySelector('[data-tour="roi-stepper"]')).toBeInTheDocument();
  });

  it('aplica e limpa filtros públicos, preservando o horizonte independente', async () => {
    usePortfolio();
    const { container } = renderPage();

    expect(screen.getByText('Projeto')).toBeInTheDocument();
    expect(screen.getByText('Processo')).toBeInTheDocument();
    expect(screen.getByText('Fase / Maturidade')).toBeInTheDocument();
    expect(screen.getByText('Horizonte')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '24m' })).toHaveClass('active');

    await selectOption('Todos os projetos', 'Projeto Alfa');
    expect(screen.getByRole('heading', { name: 'Projeto Alfa' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Editar Escopo' })).toHaveAttribute(
      'href',
      '/equipe/digital/mapa/processos?focus=P1',
    );

    await selectOption('Todos os processos', 'Processo Alfa');
    await selectOption('Todas as fases', 'Implementado');
    await userEvent.click(screen.getByRole('button', { name: '12m' }));
    expect(screen.getByText('Economia / Ano')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(screen.getByRole('button', { name: 'Todos os projetos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Todos os processos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Todas as fases' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '12m' })).toHaveClass('active');
    expect(container.querySelector('.dashv2-content')).toHaveTextContent('Processo Alfa');
  });

  it('respeita o cluster global ativo no título e nas opções de projeto', async () => {
    usePortfolio();
    mocks.cluster = 'C1';
    mocks.clusters = [{ id: 'C1', nome: 'Cluster Um' }];
    renderPage();

    expect(screen.getByRole('heading', { name: 'Visão Geral — Cluster Um' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Todos os projetos' }));
    const options = screen.getAllByRole('option');
    expect(within(options[0].parentElement as HTMLElement).getByRole('option', { name: 'Projeto Alfa' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Projeto Beta' })).not.toBeInTheDocument();
  });

  it('usa o cálculo ao vivo no consolidado e snapshot somente na data de atualização', () => {
    usePortfolio();
    mocks.projetos = [PROJECTS[0]];
    mocks.processos = [PROCESSES[0]];
    mocks.etapas = [ETAPAS[0]];
    mocks.snapshots = [{
      id: 'S1', checkpoint_id: 'CP1', process_id: 'PR1', snapshot_at: '2026-07-19T10:00:00Z',
      scope_kind: 'process', annual_cost: 999999, annual_hours: 999999,
      annual_savings: 888888, roi_percent: 777, payback_months: 1,
      hours_freed: 666666, investment: 555555,
    }];

    renderPage();

    expect(document.querySelector('.dashv2-content')).toHaveTextContent('R$ 4.800,00');
    expect(screen.queryByText(/1\.999\.998,00/)).not.toBeInTheDocument();
    expect(screen.getAllByText('Última atualização: 19/07/2026')).toHaveLength(2);
  });

  it('refaz snapshots antes de montar e baixar o CSV, exibindo o estado de loading', async () => {
    usePortfolio();
    const fresh = [{ process_id: 'PR1', annual_cost: 321 }];
    let releaseFetch: (value: Array<Record<string, unknown>>) => void = () => undefined;
    mocks.fetchSnapshotsLatest.mockImplementation(() => new Promise((resolve) => { releaseFetch = resolve; }));
    const { queryClient } = renderPage();
    const fetchQuerySpy = vi.spyOn(queryClient, 'fetchQuery');

    await openExport();
    fireEvent.click(screen.getByRole('button', { name: /CSV.*Dados consolidados por processo/ }));

    expect(screen.getByRole('button', { name: 'Exportando…' })).toBeDisabled();
    expect(mocks.buildRoiCsv).not.toHaveBeenCalled();

    await act(async () => releaseFetch(fresh));
    await waitFor(() => expect(mocks.triggerCsvDownload).toHaveBeenCalledWith('csv-gerado', 'roi.csv'));
    expect(mocks.buildRoiCsv).toHaveBeenCalledWith({
      projetos: PROJECTS,
      processos: PROCESSES,
      snapshotsLatest: fresh,
      project_id: undefined,
    });
    expect(mocks.fetchSnapshotsLatest.mock.invocationCallOrder[0]).toBeLessThan(mocks.buildRoiCsv.mock.invocationCallOrder[0]);
    expect(mocks.buildRoiCsv.mock.invocationCallOrder[0]).toBeLessThan(mocks.triggerCsvDownload.mock.invocationCallOrder[0]);
    expect(fetchQuerySpy).toHaveBeenCalledWith({
      queryKey: ['roi_snapshots', '_latest'],
      queryFn: mocks.fetchSnapshotsLatest,
      staleTime: 0,
    });
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeEnabled();
  });

  it('exporta HTML percorrendo as seis seções na ordem e restaura aba, filtros e horizonte', async () => {
    usePortfolio();
    mocks.capturarNodePng.mockImplementation(async (node: HTMLElement) => ({
      dataUrl: node.querySelector('h2')?.textContent || '', width: 100, height: 50,
    }));
    renderPage();

    await selectOption('Todos os projetos', 'Projeto Alfa');
    await userEvent.click(screen.getByRole('tab', { name: /Diagnóstico.*Como era/ }));
    await userEvent.click(screen.getByRole('button', { name: '12m' }));
    await openExport();
    fireEvent.click(screen.getByRole('button', { name: /HTML.*Apresentação visual/ }));

    await waitFor(() => expect(mocks.baixarBlob).toHaveBeenCalled());
    expect(mocks.capturarNodePng).toHaveBeenCalledTimes(7); // warm-up + seis capturas
    expect(mocks.montarHtml.mock.calls[0][0].map((secao: { label: string }) => secao.label)).toEqual(TAB_LABELS);
    expect(mocks.montarHtml.mock.calls[0][0].map((secao: { dataUrl: string }) => secao.dataUrl)).toEqual([
      'Sumário Executivo', 'O Mapeamento', 'Diagnóstico — Como Era',
      'As Melhorias Propostas', 'Cenário Futuro — Como Ficará', 'Evolução — Realizado vs Potencial',
    ]);
    expect(mocks.baixarBlob.mock.calls[0][1]).toBe('dashboard-roi-Projeto_Alfa.html');
    expect(screen.getByRole('tab', { name: /DiagnósticoComo era/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: 'Diagnóstico — Como Era' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Projeto Alfa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '12m' })).toHaveClass('active');
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Exportar Dashboard ROI' })).not.toBeInTheDocument();
    });
  });

  it('encaminha as seis seções ordenadas ao PDF e não baixa blob de HTML', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: /Evolução.*Realizado vs Potencial/ }));
    await openExport();
    fireEvent.click(screen.getByRole('button', { name: /PDF.*Apresentação visual/ }));

    await waitFor(() => expect(mocks.montarPdf).toHaveBeenCalled());
    expect(mocks.montarPdf.mock.calls[0][0].map((secao: { label: string }) => secao.label)).toEqual(TAB_LABELS);
    expect(mocks.montarPdf.mock.calls[0][1]).toBe('dashboard-roi.pdf');
    expect(mocks.baixarBlob).not.toHaveBeenCalled();
    expect(screen.getByRole('tab', { name: /EvoluçãoRealizado vs Potencial/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('tolera falha no warm-up e restaura aba e estado visual ao concluir a exportação', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: /As Melhorias.*Plano de ação/ }));
    await openExport();
    mocks.capturarNodePng
      .mockRejectedValueOnce(new Error('falha no warm-up'))
      .mockResolvedValue({ dataUrl: 'captura', width: 1, height: 1 });
    fireEvent.click(screen.getByRole('button', { name: /HTML.*Apresentação visual/ }));

    await waitFor(() => expect(mocks.montarHtml).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeEnabled();
    expect(screen.getByRole('tab', { name: /As MelhoriasPlano de ação/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: 'As Melhorias Propostas' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Exportar Dashboard ROI' })).not.toBeInTheDocument();
    });
    expect(document.querySelector('.dashv2-content')).not.toHaveClass('exporting');
    expect(mocks.capturarNodePng).toHaveBeenCalledTimes(7);
  });

});
