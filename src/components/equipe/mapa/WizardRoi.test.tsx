import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Etapa,
  Gargalo,
  Melhoria,
  Processo,
  ProcessSnapshot,
  Responsavel,
  Sistema,
} from '@/types';
import WizardRoi from './WizardRoi';

const snapshotBoundary = vi.hoisted(() => ({
  data: [] as ProcessSnapshot[],
  mutateAsync: vi.fn(),
}));

vi.mock('@/hooks/useSnapshots', () => ({
  useSnapshots: vi.fn(() => ({ data: snapshotBoundary.data })),
  useCreateSnapshot: vi.fn(() => ({ mutateAsync: snapshotBoundary.mutateAsync })),
}));

const processo = {
  id: 'processo-1',
  name: 'Fechamento Fiscal',
  volume_executions: 10,
} as unknown as Processo;

const responsavel = {
  id: 'resp-1',
  name: 'Analista Fiscal',
  level: 'Pleno',
  hourly_rate: 100,
} as unknown as Responsavel;

const etapa = {
  id: 'etapa-1',
  name: 'Conferir documentos',
  description: 'Conferência manual',
  process_id: processo.id,
  execution: 'Manual',
  rework_rate: 0.1,
  error_rate: 0.2,
  volume_per_process: 1,
  volumeMensal: 10,
  docsEntrada: [],
  docsSaida: [],
  executadoPor: [{ responsavelId: responsavel.id, nome: responsavel.name, horas: 2 }],
  sistemas: ['sistema-1'],
  ficou: {
    rework_rate: 0.05,
    error_rate: 0.1,
    volume_per_process: 1,
    executadoPor: [{ responsavelId: responsavel.id, nome: responsavel.name, horas: 1 }],
    sistemas: ['sistema-1'],
  },
} as unknown as Etapa;

const sistema = {
  id: 'sistema-1',
  nome: 'ERP PSA',
  descricao: 'ERP principal',
  custo_licenca_mensal: 0,
  custo_variavel_por_uso: 50,
} as unknown as Sistema;

const melhoria = {
  id: 'melhoria-1',
  improvement_description: 'Automatizar conferência',
  improvement_status: 'Em progresso',
  processos: [processo.id],
  sistemas: [],
  training_hours: 2,
  one_time_external_cost: 500,
  executadoPor: [{ responsavelId: responsavel.id, nome: responsavel.name, horas: 3 }],
} as unknown as Melhoria;

const gargalo = {
  id: 'gargalo-1',
  nome: 'Digitação repetitiva',
  descricao: 'Entrada manual',
  processos: [processo.id],
  etapasOrigem: [],
  horas_gastas: 4,
} as unknown as Gargalo;

interface RenderOptions {
  processo?: Processo;
  etapas?: Etapa[];
  responsaveis?: Responsavel[];
  sistemas?: Sistema[];
  gargalos?: Gargalo[];
  melhorias?: Melhoria[];
  onSnapshotCriado?: (snapshot: ProcessSnapshot) => void;
  onEditarEtapas?: (etapaId?: string) => void;
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderWizard(options: RenderOptions = {}) {
  const props = {
    processo: Object.prototype.hasOwnProperty.call(options, 'processo') ? options.processo : processo,
    etapas: options.etapas ?? [etapa],
    responsaveis: options.responsaveis ?? [responsavel],
    sistemas: options.sistemas ?? [sistema],
    gargalos: options.gargalos ?? [gargalo],
    melhorias: options.melhorias ?? [melhoria],
    onSnapshotCriado: options.onSnapshotCriado ?? vi.fn(),
    onEditarEtapas: options.onEditarEtapas,
  };

  return render(
    <MemoryRouter initialEntries={['/wizard-roi']}>
      <WizardRoi {...props} />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function irParaPasso(numero: number, nome: string) {
  fireEvent.click(screen.getByRole('button', { name: `Ir para o passo ${numero}: ${nome}` }));
}

function snapshot(overrides: Partial<ProcessSnapshot>): ProcessSnapshot {
  return {
    id: 'snapshot-base',
    checkpoint_id: 'checkpoint-base',
    process_id: processo.id,
    snapshot_at: '2026-01-01T12:00:00.000Z',
    scope_kind: 'process',
    annual_cost: 100,
    annual_hours: 10,
    annual_savings: 20,
    roi_percent: 20,
    payback_months: 6,
    hours_freed: 2,
    investment: 100,
    ...overrides,
  } as ProcessSnapshot;
}

describe('WizardRoi — API pública standalone', () => {
  beforeEach(() => {
    snapshotBoundary.data = [];
    snapshotBoundary.mutateAsync.mockReset();
  });

  it('não renderiza conteúdo sem um processo', () => {
    const { container } = renderWizard({ processo: undefined });

    expect(container.querySelector('.roi-config-shell')).not.toBeInTheDocument();
  });

  it('caracteriza diagnóstico, estados, textos e mapa de dados, incluindo destinos editáveis', () => {
    const onEditarEtapas = vi.fn();
    const responsavelSemCusto = { ...responsavel, hourly_rate: 0 } as Responsavel;
    const processoSemVolume = { ...processo, volume_executions: 0, frequency: null } as Processo;
    const etapaIncompleta = {
      ...etapa,
      volume_per_process: 0,
      error_rate: 0,
      rework_rate: 0,
      sistemas: [],
      ficou: null,
    } as Etapa;

    renderWizard({
      processo: processoSemVolume,
      etapas: [etapaIncompleta],
      responsaveis: [responsavelSemCusto],
      sistemas: [],
      gargalos: [],
      melhorias: [],
      onEditarEtapas,
    });

    expect(screen.getByText('Diagnóstico e baseline do retorno do processo')).toBeInTheDocument();
    expect(screen.getByText('Há campos pendentes.')).toBeInTheDocument();
    expect(screen.getByText('Mapa de dados do ROI')).toBeInTheDocument();
    expect(screen.getByText('OK:').parentElement).toHaveTextContent('OK: 1');
    expect(screen.getByText('Pendentes:').parentElement).toHaveTextContent('Pendentes: 2');
    expect(screen.getByText('Vazios:').parentElement).toHaveTextContent('Vazios: 4');
    expect(screen.getByText('Total:').parentElement).toHaveTextContent('Total: 7');
    expect(screen.getAllByText('OK').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Faltando').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pendente').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Vazio').length).toBeGreaterThan(0);
    expect(screen.getByRole('columnheader', { name: 'Fórmula' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Campos-fonte' })).toBeInTheDocument();

    fireEvent.click(screen.getAllByText('Etapa "Conferir documentos" — Volume/Projeto')[0]);
    expect(onEditarEtapas).toHaveBeenCalledWith(etapa.id);

    fireEvent.click(screen.getAllByText('Responsável "Analista Fiscal"')[0]);
    expect(screen.getByTestId('location')).toHaveTextContent('/responsaveis');
  });

  it('expõe os cinco passos e preserva stepper, navegação, footer, comparações e KPIs', () => {
    renderWizard();

    expect(screen.getByText((_, element) =>
      element?.tagName === 'SPAN' && element.textContent === 'Passo 1 de 5',
    )).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Próximo' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Ir para o passo 1: Diagnóstico' })).toHaveAttribute('aria-current', 'step');

    fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(screen.getByRole('heading', { name: 'Mão de obra — atual × estimado' })).toBeInTheDocument();
    expect(screen.getByText('R$ 2.000,00')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 1.000,00').length).toBeGreaterThan(0);
    expect(screen.getByText('2,0h')).toBeInTheDocument();
    expect(screen.getByText('1,0h')).toBeInTheDocument();

    irParaPasso(3, 'Qualidade');
    expect(screen.getByRole('heading', { name: 'Custo da Não-Qualidade' })).toBeInTheDocument();
    expect(screen.getByText('Retrabalho Atual / Ano')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 200,00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('R$ 50,00').length).toBeGreaterThan(0);

    irParaPasso(4, 'Sistemas & Invest.');
    expect(screen.getByRole('heading', { name: 'Sistemas & Investimento' })).toBeInTheDocument();
    expect(screen.getByText('ERP PSA')).toBeInTheDocument();
    expect(screen.getByText('Automatizar conferência')).toBeInTheDocument();
    expect(screen.getByText('Investimento Total')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 1.000,00').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('heading', { name: 'Custo da Não-Qualidade' })).toBeInTheDocument();

    irParaPasso(5, 'Prévia & Salvar');
    expect(screen.getByRole('heading', { name: 'Prévia do ROI' })).toBeInTheDocument();
    expect(screen.getByText('Todos os campos críticos estão preenchidos.')).toBeInTheDocument();
    expect(screen.getByText('Custo Anual')).toBeInTheDocument();
    expect(screen.getByText('R$ 2.800,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 1.150,00')).toBeInTheDocument();
    expect(screen.getByText('115,0%')).toBeInTheDocument();
    expect(screen.getByText('10,43 meses')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar mensuração' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Próximo' })).not.toBeInTheDocument();
  });

  it('ordena snapshots, exibe KPIs estáticos e bloqueia criação durante a visualização histórica', () => {
    snapshotBoundary.data = [
      snapshot({ id: 'mais-novo', snapshot_at: '2026-06-10T15:00:00.000Z' }),
      snapshot({
        id: 'mais-antigo',
        snapshot_at: '2025-02-01T09:00:00.000Z',
        annual_cost: 9999,
        annual_hours: 444,
        annual_savings: 777,
        roi_percent: 321,
        payback_months: 4.5,
        hours_freed: 222,
        investment: 333,
      }),
    ];
    renderWizard();
    irParaPasso(5, 'Prévia & Salvar');

    const selector = screen.getByLabelText('Visualizar mensuração:');
    const options = within(selector).getAllByRole('option');
    expect(options.map(option => option.getAttribute('value'))).toEqual(['ao-vivo', 'mais-novo', 'mais-antigo']);

    fireEvent.change(selector, { target: { value: 'mais-antigo' } });
    expect(screen.getByText(/Você está vendo dados/)).toBeInTheDocument();
    expect(screen.getByText('R$ 9.999,00')).toBeInTheDocument();
    expect(screen.getByText('444,0h')).toBeInTheDocument();
    expect(screen.getByText('321,0%')).toBeInTheDocument();
    expect(screen.getByText('4,5 meses')).toBeInTheDocument();
    const salvar = screen.getByRole('button', { name: 'Salvar mensuração' });
    expect(salvar).toBeDisabled();
    expect(salvar).toHaveAttribute('title', 'Volte para "Ao vivo" antes de salvar uma nova mensuração');

    fireEvent.change(selector, { target: { value: 'ao-vivo' } });
    expect(screen.queryByText(/Você está vendo dados/)).not.toBeInTheDocument();
    expect(salvar).toBeEnabled();
  });

  it('cria mensuração com o payload calculado, mostra estado de salvamento e notifica o consumidor', async () => {
    let resolver: (value: ProcessSnapshot) => void = () => undefined;
    const criado = snapshot({ id: 'snapshot-criado' });
    snapshotBoundary.mutateAsync.mockImplementation(() => new Promise<ProcessSnapshot>(resolve => {
      resolver = resolve;
    }));
    const onSnapshotCriado = vi.fn();
    renderWizard({ onSnapshotCriado });
    irParaPasso(5, 'Prévia & Salvar');

    fireEvent.click(screen.getByRole('button', { name: 'Salvar mensuração' }));

    expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled();
    expect(snapshotBoundary.mutateAsync).toHaveBeenCalledWith({
      process_id: processo.id,
      annual_cost: 2800,
      annual_hours: 20,
      annual_savings: 1150,
      roi_percent: 114.99999999999999,
      payback_months: 10.434782608695652,
      hours_freed: 10,
      investment: 1000,
    });

    resolver(criado);
    await waitFor(() => expect(onSnapshotCriado).toHaveBeenCalledWith(criado));
    expect(screen.getByRole('button', { name: 'Salvar mensuração' })).toBeEnabled();
  });

  it('preserva a mensagem de erro da criação e restaura o footer', async () => {
    snapshotBoundary.mutateAsync.mockRejectedValue(new Error('Falha ao registrar mensuração'));
    renderWizard();
    irParaPasso(5, 'Prévia & Salvar');

    fireEvent.click(screen.getByRole('button', { name: 'Salvar mensuração' }));

    expect(await screen.findByText('Falha ao registrar mensuração')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar mensuração' })).toBeEnabled();
  });
});
