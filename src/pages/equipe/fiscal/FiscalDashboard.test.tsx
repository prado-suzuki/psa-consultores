import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, format, startOfDay } from 'date-fns';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Radix Select usa Pointer Capture, ainda ausente no jsdom.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}

const mocks = vi.hoisted(() => ({
  projects: vi.fn(),
  tasks: vi.fn(),
  contribuintes: vi.fn(),
  clientNames: vi.fn(),
  clients: vi.fn(),
  areas: vi.fn(),
  equipes: vi.fn(),
  members: vi.fn(),
}));

vi.mock('@/hooks/useFiscalDashboardData', () => ({
  useFiscalDashProjects: mocks.projects,
  useFiscalDashTasks: mocks.tasks,
  useFiscalDashContribuintes: mocks.contribuintes,
  useFiscalDashClientNames: mocks.clientNames,
}));
vi.mock('@/hooks/useFiscalClients', () => ({ useFiscalClientsList: mocks.clients }));
vi.mock('@/hooks/useEstruturaAreas', () => ({ useEstruturaAreas: mocks.areas }));
vi.mock('@/hooks/useEstruturaEquipes', () => ({
  useEstruturaEquipesByCategory: mocks.equipes,
}));
vi.mock('@/hooks/useTaxReferenceData', () => ({ useTeamProfilesSafe: mocks.members }));

vi.mock('@/components/equipe/fiscal/FiscalLayout', () => ({
  FiscalLayout: ({
    title,
    subtitle,
    children,
  }: {
    title: string;
    subtitle: string;
    children: ReactNode;
  }) => (
    <main data-testid="fiscal-layout">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </main>
  ),
}));

vi.mock('@/components/equipe/osg/OsgLayout', () => ({
  OsgLayout: ({
    title,
    subtitle,
    children,
  }: {
    title: string;
    subtitle: string;
    children: ReactNode;
  }) => (
    <main data-testid="osg-layout">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </main>
  ),
}));

// Os componentes Momentum são uma fronteira visual compartilhada e congelada nesta onda.
// Estes doubles expõem as props públicas para caracterizar os cálculos do dashboard.
vi.mock('@/components/dashboard/momentum', () => ({
  KpiHero: ({
    label,
    value,
    variation,
    loading,
  }: {
    label: string;
    value: ReactNode;
    variation?: { label: string };
    loading?: boolean;
  }) => (
    <section data-testid={`kpi-${label}`} data-loading={String(Boolean(loading))}>
      <h2>{label}</h2>
      <output>{value}</output>
      {variation?.label && <p>{variation.label}</p>}
    </section>
  ),
  HeroBanner: ({
    area,
    eyebrow,
    title,
    description,
  }: {
    area: string;
    eyebrow: string;
    title: string;
    description: string;
  }) => (
    <section data-testid="hero" data-area={area}>
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  ),
  HatchedBar: ({ segments }: { segments: Array<{ label: string; value: number }> }) => (
    <div data-testid="hatched-bar">
      {segments.map(segment => (
        <span key={segment.label}>{segment.label}:{segment.value}</span>
      ))}
    </div>
  ),
  WorkloadHeatmap: ({
    rows,
    columnLabels,
  }: {
    rows: Array<{ label: string; cells: number[] }>;
    columnLabels: string[];
  }) => (
    <div data-testid="heatmap">
      <span>colunas:{columnLabels.join(',')}</span>
      {rows.map(row => <span key={row.label}>{row.label}:{row.cells.join(',')}</span>)}
    </div>
  ),
}));

import FiscalDashboard, { DashboardContent } from '@/pages/equipe/fiscal/FiscalDashboard';
import OsgDashboard from '@/pages/equipe/osg/OsgDashboard';

const dateAt = (offset: number) => format(addDays(startOfDay(new Date()), offset), 'yyyy-MM-dd');

const projects = [
  { id: 'p-tax', name: 'Projeto Tax Ativo', status: 'active', estrutura_area_id: 'area-tax', equipe_id: 'team-a', external_client_id: 'c1', contribuinte_id: null },
  { id: 'p-tax-hold', name: 'Projeto Tax Pausado', status: 'on_hold', estrutura_area_id: 'area-tax', equipe_id: 'team-b', external_client_id: null, contribuinte_id: 'ct2' },
  { id: 'p-legacy', name: 'Projeto Legado', status: 'completed', estrutura_area_id: null, equipe_id: null, external_client_id: null, contribuinte_id: null },
  { id: 'p-osg', name: 'Projeto OSG', status: 'active', estrutura_area_id: 'area-osg', equipe_id: 'team-osg', external_client_id: 'c4', contribuinte_id: null },
];

const tasks = [
  { id: 't-overdue', title: 'Obrigação atrasada', status: 'todo', project_id: 'p-tax', client_id: 'c1', contribuinte_id: null, assigned_to: 'm1', assigned_to_name: 'Responsável gravado', estimated_hours: 8, due_date: dateAt(-5) },
  { id: 't-soon', title: 'Apuração próxima', status: 'in_progress', project_id: 'p-tax-hold', client_id: null, contribuinte_id: 'ct2', assigned_to: 'm2', assigned_to_name: null, estimated_hours: 4, due_date: dateAt(2) },
  { id: 't-later', title: 'Revisão futura', status: 'review', project_id: 'p-tax', client_id: 'c3', contribuinte_id: null, assigned_to: 'm1', assigned_to_name: null, estimated_hours: 3, due_date: dateAt(10) },
  { id: 't-done', title: 'Entrega concluída', status: 'done', project_id: 'p-tax', client_id: 'c1', contribuinte_id: null, assigned_to: 'm1', assigned_to_name: null, estimated_hours: 2, due_date: dateAt(-10) },
  { id: 't-no-due', title: 'Backlog legado', status: 'backlog', project_id: 'p-legacy', client_id: null, contribuinte_id: null, assigned_to: null, assigned_to_name: null, estimated_hours: null, due_date: null },
  { id: 't-osg', title: 'Pendência OSG', status: 'todo', project_id: 'p-osg', client_id: 'c4', contribuinte_id: null, assigned_to: 'm3', assigned_to_name: null, estimated_hours: 6, due_date: dateAt(-3) },
  { id: 't-orphan', title: 'Sem projeto', status: 'todo', project_id: null, client_id: 'c1', contribuinte_id: null, assigned_to: 'm1', assigned_to_name: null, estimated_hours: 99, due_date: dateAt(-20) },
];

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

function renderContent(area: 'tax' | 'osg' = 'tax') {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="*" element={<><DashboardContent area={area} /><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

function kpi(label: string) {
  return screen.getByTestId(`kpi-${label}`);
}

async function chooseSelect(user: ReturnType<typeof userEvent.setup>, index: number, option: string | RegExp) {
  await user.click(screen.getAllByRole('combobox')[index]);
  await user.click(await screen.findByRole('option', { name: option }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.projects.mockReturnValue({ data: projects, isLoading: false });
  mocks.tasks.mockReturnValue({ data: tasks, isLoading: false });
  mocks.contribuintes.mockReturnValue({ data: [{ id: 'ct2', cliente_id: 'c2' }] });
  mocks.clientNames.mockReturnValue({
    data: [
      { id: 'c1', nome: 'Cliente Alfa' },
      { id: 'c2', nome: 'Cliente Beta' },
      { id: 'c3', nome: 'Cliente Inativo' },
      { id: 'c4', nome: 'Cliente OSG' },
    ],
  });
  mocks.clients.mockReturnValue({
    data: [
      { id: 'c2', nome: 'Cliente Beta' },
      { id: 'c1', nome: 'Cliente Alfa' },
      { id: 'c4', nome: 'Cliente OSG' },
    ],
  });
  mocks.areas.mockImplementation((area: string) => ({
    data: area === 'osg'
      ? [{ id: 'area-osg', name: 'Operações OSG' }]
      : [{ id: 'area-tax', name: 'Fiscal Federal' }],
    isLoading: false,
  }));
  mocks.equipes.mockImplementation((area: string) => ({
    data: area === 'osg'
      ? [{ id: 'team-osg', name: 'Equipe OSG' }]
      : [{ id: 'team-b', name: 'Equipe B' }, { id: 'team-a', name: 'Equipe A' }],
  }));
  mocks.members.mockReturnValue({
    data: [
      { id: 'm2', first_name: 'Bruna', last_name: 'Bastos' },
      { id: 'm1', first_name: 'Ana', last_name: 'Alves' },
      { id: 'm3', first_name: 'Caio', last_name: 'Costa' },
    ],
  });
});

describe('FiscalDashboard e contrato público compartilhado', () => {
  it('mantém a página Tax como fachada com layout, textos e DashboardContent exportado', () => {
    render(<MemoryRouter><FiscalDashboard /></MemoryRouter>);

    expect(screen.getByTestId('fiscal-layout')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Visão geral da área fiscal — atualizado em tempo real')).toBeInTheDocument();
    expect(screen.getByTestId('hero')).toHaveAttribute('data-area', 'tax');
    expect(screen.getByText('PSA Tax')).toBeInTheDocument();
    expect(mocks.areas).toHaveBeenCalledWith('tax');
    expect(mocks.equipes).toHaveBeenCalledWith('tax');
  });

  it('permite que OsgDashboard consuma o named export e aplica escopo e navegação OSG', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/equipe/osg/dashboard']}>
        <Routes>
          <Route path="*" element={<><OsgDashboard /><LocationProbe /></>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('osg-layout')).toBeInTheDocument();
    expect(screen.getByText('Visão geral da área OSG')).toBeInTheDocument();
    expect(screen.getByTestId('hero')).toHaveAttribute('data-area', 'osg');
    expect(screen.getByText('PSA OSG')).toBeInTheDocument();
    expect(kpi('Total Projetos')).toHaveTextContent('1');
    expect(kpi('Total Tarefas')).toHaveTextContent('1');
    expect(screen.getByText('Pendência OSG')).toBeInTheDocument();
    expect(screen.queryByText('Obrigação atrasada')).not.toBeInTheDocument();
    expect(mocks.areas).toHaveBeenCalledWith('osg');
    expect(mocks.equipes).toHaveBeenCalledWith('osg');

    await user.click(screen.getByText('Pendência OSG'));
    expect(screen.getByTestId('location')).toHaveTextContent('/equipe/osg/projetos/tarefas?taskId=t-osg');
  });
});

describe('DashboardContent Tax', () => {
  it('recorta projetos legados como Tax e caracteriza KPIs, distribuições, heatmap e rankings', () => {
    renderContent();

    expect(kpi('Projetos Ativos')).toHaveTextContent('1');
    expect(kpi('Projetos Ativos')).toHaveTextContent('33% do portfólio');
    expect(kpi('Taxa de Conclusão')).toHaveTextContent('20%');
    expect(kpi('Taxa de Conclusão')).toHaveTextContent('1 de 5 tarefas concluídas');
    expect(kpi('Tarefas Atrasadas')).toHaveTextContent('1');
    expect(kpi('Horas Planejadas')).toHaveTextContent('17h');
    expect(kpi('Horas Planejadas')).toHaveTextContent('3h em média por tarefa');
    expect(kpi('Total Projetos')).toHaveTextContent('3');
    expect(kpi('Concluídos')).toHaveTextContent('1');
    expect(kpi('Pausados')).toHaveTextContent('1');
    expect(kpi('Total Tarefas')).toHaveTextContent('5');

    expect(screen.getByTestId('hero')).toHaveTextContent('1 tarefas precisam de atenção');
    expect(screen.getByText('Backlog:1')).toBeInTheDocument();
    expect(screen.getByText('A Fazer:1')).toBeInTheDocument();
    expect(screen.getByText('Em Progresso:1')).toBeInTheDocument();
    expect(screen.getByText('Revisão:1')).toBeInTheDocument();
    expect(screen.getByText('Concluído:1')).toBeInTheDocument();
    expect(screen.getByText('Fiscal Federal:4')).toBeInTheDocument();
    expect(screen.getByText('Sem área:1')).toBeInTheDocument();

    const heatmap = screen.getByTestId('heatmap');
    expect(heatmap).toHaveTextContent('BB:0,0,4,0,0,0,0,0,0,0,0,0,0,0');
    expect(heatmap).toHaveTextContent('AA:0,0,0,0,0,0,0,0,0,0,3,0,0,0');

    const topClients = screen.getByText('Top Clientes · Horas').parentElement!.parentElement!;
    expect(within(topClients).getByText('Cliente Alfa')).toBeInTheDocument();
    expect(within(topClients).getByText('10h')).toBeInTheDocument();
    expect(within(topClients).getByText('Cliente Beta')).toBeInTheDocument();
    expect(within(topClients).getByText('4h')).toBeInTheDocument();
    expect(within(topClients).getByText('Cliente Inativo')).toBeInTheDocument();
    expect(within(topClients).getByText('3h')).toBeInTheDocument();
  });

  it('ordena tabelas, resolve nomes por suas prioridades e abre o deep-link Tax', async () => {
    const user = userEvent.setup();
    renderContent();

    const overdueRow = screen.getByText('Obrigação atrasada').closest('tr')!;
    expect(within(overdueRow).getByText('Cliente Alfa')).toBeInTheDocument();
    expect(within(overdueRow).getByText('Responsável gravado')).toBeInTheDocument();
    expect(within(overdueRow).getByText('5d')).toBeInTheDocument();

    const anaRow = screen.getByText('Ana Alves').closest('tr')!;
    expect(within(anaRow).getAllByRole('cell').map(cell => cell.textContent)).toEqual([
      'Ana Alves', '2', '11h', '1',
    ]);
    const brunaRow = screen.getByText('Bruna Bastos').closest('tr')!;
    expect(within(brunaRow).getAllByRole('cell').map(cell => cell.textContent)).toEqual([
      'Bruna Bastos', '1', '4h', '0',
    ]);

    await user.click(overdueRow);
    expect(screen.getByTestId('location')).toHaveTextContent('/equipe/tax/projetos/tarefas?taskId=t-overdue');
  });

  it('aplica filtros estratégicos, atalhos combinados e limpeza sem misturar o escopo', async () => {
    const user = userEvent.setup();
    renderContent();

    await chooseSelect(user, 3, 'Cliente Beta');
    expect(kpi('Total Tarefas')).toHaveTextContent('1');
    expect(screen.getByTestId('hero')).toHaveTextContent('Visão com 1 filtro(s) aplicado(s). 1 tarefas no recorte atual.');
    expect(screen.getByText('Em Progresso:1')).toBeInTheDocument();
    expect(kpi('Horas Planejadas')).toHaveTextContent('4h');
    expect(screen.queryByText('Obrigação atrasada')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpar tudo' }));
    await chooseSelect(user, 0, /Sem prazo definido/);
    expect(kpi('Total Tarefas')).toHaveTextContent('1');
    expect(screen.getByText('Backlog:1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Próximos 7 dias' }));
    expect(kpi('Total Tarefas')).toHaveTextContent('1');
    expect(screen.getByText('Em Progresso:1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Apenas atrasadas' }));
    expect(kpi('Total Tarefas')).toHaveTextContent('1');
    expect(screen.getByText('Obrigação atrasada')).toBeInTheDocument();
    expect(screen.getByText('1 ativo')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Backlog ativo' }));
    expect(kpi('Total Projetos')).toHaveTextContent('1');
    expect(kpi('Total Tarefas')).toHaveTextContent('1');
    expect(screen.getByText('2 ativos')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpar tudo' }));
    expect(kpi('Total Projetos')).toHaveTextContent('3');
    expect(kpi('Total Tarefas')).toHaveTextContent('5');
    expect(screen.queryByRole('button', { name: 'Limpar tudo' })).not.toBeInTheDocument();
  });

  it('filtra período pelos limites inclusivos, preserva tarefas sem prazo e filtra responsável', async () => {
    const user = userEvent.setup();
    const { container } = renderContent();
    const dateInputs = container.querySelectorAll<HTMLInputElement>('input[type="date"]');

    await user.type(dateInputs[0], dateAt(2));
    await user.type(dateInputs[1], dateAt(2));
    // Caracterização: o período só compara tarefas que possuem due_date; sem prazo permanece.
    expect(kpi('Total Tarefas')).toHaveTextContent('2');
    expect(screen.getByText('Em Progresso:1')).toBeInTheDocument();
    expect(screen.getByText('Backlog:1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpar tudo' }));
    await chooseSelect(user, 5, 'Ana Alves');
    expect(kpi('Total Tarefas')).toHaveTextContent('3');
    expect(kpi('Horas Planejadas')).toHaveTextContent('13h');
  });

  it('mostra loading nas visualizações e não antecipa estados vazios', () => {
    mocks.projects.mockReturnValue({ data: [], isLoading: true });
    mocks.tasks.mockReturnValue({ data: [], isLoading: true });
    mocks.areas.mockReturnValue({ data: [], isLoading: true });

    const { container } = renderContent();

    expect(screen.getAllByTestId(/^kpi-/)).toHaveLength(8);
    screen.getAllByTestId(/^kpi-/).forEach(element => {
      expect(element).toHaveAttribute('data-loading', 'true');
    });
    expect(container.querySelectorAll('.animate-spin')).toHaveLength(6);
    expect(screen.queryByText('Nenhuma tarefa no recorte atual')).not.toBeInTheDocument();
    expect(screen.queryByText('Nenhuma tarefa atrasada no recorte atual')).not.toBeInTheDocument();
  });

  it('preserva mensagens e textos de todos os estados vazios', () => {
    mocks.projects.mockReturnValue({ data: [], isLoading: false });
    mocks.tasks.mockReturnValue({ data: [], isLoading: false });
    mocks.areas.mockReturnValue({ data: [], isLoading: false });

    renderContent();

    expect(kpi('Projetos Ativos')).toHaveTextContent('sem projetos cadastrados');
    expect(kpi('Taxa de Conclusão')).toHaveTextContent('0 de 0 tarefas concluídas');
    expect(kpi('Tarefas Atrasadas')).toHaveTextContent('nenhuma pendência');
    expect(kpi('Horas Planejadas')).toHaveTextContent('sem tarefas planejadas');
    expect(screen.getByTestId('hero')).toHaveTextContent('Operação sem atrasos — momentum alto');
    expect(screen.getByText('Nenhuma tarefa no recorte atual')).toBeInTheDocument();
    expect(screen.getByText('Sem dados de área')).toBeInTheDocument();
    expect(screen.getByText('Sem atribuições no recorte atual')).toBeInTheDocument();
    expect(screen.getByText('Sem horas estimadas')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma tarefa atrasada no recorte atual')).toBeInTheDocument();
    expect(screen.getByText('Sem dados de atribuição')).toBeInTheDocument();
  });
});
