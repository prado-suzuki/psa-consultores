import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TicketFirstResponse, TicketListItem } from '@/hooks/useTickets';

Object.defineProperties(HTMLElement.prototype, {
  hasPointerCapture: { configurable: true, value: () => false },
  setPointerCapture: { configurable: true, value: () => undefined },
  releasePointerCapture: { configurable: true, value: () => undefined },
});

const mocks = vi.hoisted(() => ({
  tickets: vi.fn(),
  agents: vi.fn(),
  firstResponses: vi.fn(),
  areas: vi.fn(),
  clusters: vi.fn(),
}));

vi.mock('@/hooks/useTickets', () => ({
  useTicketsList: mocks.tickets,
  useTicketAgents: mocks.agents,
  useTicketsFirstResponse: mocks.firstResponses,
}));

vi.mock('@/hooks/useEstruturaAreas', () => ({
  useAllActiveAreas: mocks.areas,
  useAllActiveClusters: mocks.clusters,
}));

vi.mock('@/components/gestao/GestaoLayout', () => ({
  GestaoLayout: ({
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
      {headerActions}
      {children}
    </main>
  ),
}));

import GestaoChamadosDashboard from '@/pages/gestao/GestaoChamadosDashboard';

const NOW = new Date('2026-07-21T12:00:00.000Z');
const hour = 60 * 60 * 1000;
const day = 24 * hour;

function iso(msFromNow: number) {
  return new Date(NOW.getTime() + msFromNow).toISOString();
}

function ticket(overrides: Partial<TicketListItem> & Pick<TicketListItem, 'id'>): TicketListItem {
  return {
    id: overrides.id,
    title: 'Assunto sem termo fiscal',
    description: '',
    status: 'aberto',
    priority: 'normal',
    department: 'outros',
    created_at: iso(-day),
    updated_at: iso(-day),
    closed_at: null,
    user_id: 'representante-1',
    assigned_to: null,
    activity_status: null,
    deadline: null,
    estrutura_area_id: null,
    cluster_id: null,
    ...overrides,
  };
}

function response(ticketId: string, userId: string, createdAt: string): TicketFirstResponse {
  return { ticket_id: ticketId, user_id: userId, created_at: createdAt };
}

const baseTickets: TicketListItem[] = [
  ticket({
    id: 't1',
    title: 'ICMS, ICMS e ICMS-ST',
    description: 'Substituição tributária; ICMS-ST novamente e PIS.',
    created_at: iso(-2 * day),
    updated_at: iso(-2 * day),
    department: 'icms_ipi',
    estrutura_area_id: 'area-fiscal',
    cluster_id: 'cluster-a',
    cliente_nome: 'Cliente A',
    user_id: 'representante-1',
    profiles: { id: 'representante-1', first_name: 'Ana', last_name: 'Portal' },
    assigned_to: 'agente-fallback',
  }),
  ticket({
    id: 't2',
    title: 'DIFAL interestadual',
    created_at: iso(-6 * day),
    updated_at: iso(-6 * day),
    closed_at: iso(-3 * day),
    status: 'resolvido',
    department: 'icms_ipi',
    estrutura_area_id: 'area-fiscal',
    cluster_id: 'cluster-b',
    cliente_nome: 'Cliente A',
    user_id: 'representante-2',
    profiles: { id: 'representante-2', first_name: 'Ana', last_name: 'Portal' },
  }),
  ticket({
    id: 't3',
    title: 'COFINS na apuração',
    created_at: iso(-20 * day),
    updated_at: iso(-20 * day),
    closed_at: iso(-19 * day),
    status: 'fechado',
    department: 'pis_cofins',
    estrutura_area_id: 'area-contabil',
    cluster_id: 'cluster-a',
    cliente_nome: 'Cliente B',
    user_id: 'representante-1',
    profiles: { id: 'representante-1', first_name: 'Ana', last_name: 'Portal' },
    assigned_to: 'agente-fallback',
  }),
  ticket({
    id: 't-antigo',
    title: 'EFD Contribuições',
    created_at: iso(-31 * day),
    updated_at: iso(-31 * day),
    status: 'em_andamento',
    department: 'contabilidade',
    estrutura_area_id: 'area-contabil',
    cluster_id: 'cluster-b',
    cliente_nome: 'Cliente Antigo',
    user_id: 'representante-3',
    profiles: { id: 'representante-3', first_name: 'Beto', last_name: 'Portal' },
  }),
  ticket({
    id: 't-futuro',
    title: 'IRPJ futuro',
    created_at: iso(day),
    updated_at: iso(day),
    department: 'irpj_csll',
    estrutura_area_id: 'area-fiscal',
    cluster_id: 'cluster-a',
    cliente_nome: 'Cliente Futuro',
    user_id: 'representante-4',
  }),
];

const baseResponses = new Map<string, TicketFirstResponse>([
  ['t1', response('t1', 'agente-1', iso(-2 * day + 0.5 * hour))],
  ['t2', response('t2', 'agente-2', iso(-6 * day + 2 * hour))],
  // A existência da resposta conta no KPI; timestamp anterior não entra no tempo médio.
  ['t3', response('t3', 'agente-1', iso(-20 * day - hour))],
]);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/gestao/chamados/dashboard']}>
      <Routes>
        <Route path="/gestao/chamados/dashboard" element={<GestaoChamadosDashboard />} />
        <Route path="/gestao/chamados" element={<h1>Destino lista</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

function card(title: string) {
  const heading = screen.getByRole('heading', { name: title });
  const container = heading.closest('.rounded-2xl');
  if (!(container instanceof HTMLElement)) throw new Error(`Card não encontrado: ${title}`);
  return within(container);
}

function kpi(label: string) {
  const labelElement = screen.getByText(label, { selector: 'span' });
  const container = labelElement.parentElement?.parentElement?.parentElement;
  if (!container) throw new Error(`KPI não encontrado: ${label}`);
  return container;
}

function chooseFilter(index: number, option: string) {
  fireEvent.keyDown(screen.getAllByRole('combobox')[index], { key: 'ArrowDown' });
  fireEvent.click(screen.getByRole('option', { name: option }));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  mocks.tickets.mockReturnValue({ data: baseTickets, isLoading: false });
  mocks.agents.mockReturnValue({
    data: [
      { id: 'agente-1', first_name: 'Alice', last_name: 'Fiscal' },
      { id: 'agente-2', first_name: 'Bruno', last_name: 'Contábil' },
      { id: 'agente-fallback', first_name: 'Carla', last_name: 'Fallback' },
    ],
  });
  mocks.firstResponses.mockReturnValue({ data: baseResponses });
  mocks.areas.mockReturnValue({
    data: [
      { id: 'area-fiscal', name: 'Fiscal', color: null, cluster_id: 'cluster-a' },
      { id: 'area-contabil', name: 'Contábil', color: null, cluster_id: 'cluster-b' },
    ],
  });
  mocks.clusters.mockReturnValue({
    data: [
      { id: 'cluster-a', name: 'Cluster Alfa' },
      { id: 'cluster-b', name: 'Cluster Beta' },
    ],
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GestaoChamadosDashboard', () => {
  it('calcula KPIs, tempos e distribuições sobre o intervalo móvel padrão', () => {
    renderPage();

    expect(kpi('Total')).toHaveTextContent('3');
    expect(kpi('Total')).toHaveTextContent('Últimos 30 dias');
    expect(kpi('Respondidos')).toHaveTextContent('3');
    expect(kpi('Respondidos')).toHaveTextContent('100% taxa de resposta');
    expect(kpi('Sem Resposta')).toHaveTextContent('0');
    expect(kpi('Resolvidos')).toHaveTextContent('2');
    expect(kpi('Tempo Médio Resposta')).toHaveTextContent('1.3h');
    expect(kpi('Tempo Médio Resolução')).toHaveTextContent('2.0d');

    expect(card('Distribuição por Status').getByText('Aberto').parentElement).toHaveTextContent(
      'Aberto 33.3%',
    );
    expect(card('Distribuição por Status').getByText('Resolvido').parentElement).toHaveTextContent(
      'Resolvido 33.3%',
    );
    expect(card('Distribuição por Status').getByText('Fechado').parentElement).toHaveTextContent(
      'Fechado 33.3%',
    );
    expect(
      card('Distribuição por Departamento').getByText('ICMS/IPI').parentElement,
    ).toHaveTextContent('ICMS/IPI 66.7%');
    expect(
      card('Distribuição por Departamento').getByText('PIS/COFINS').parentElement,
    ).toHaveTextContent('PIS/COFINS 33.3%');
  });

  it('mantém períodos móveis, exclui datas futuras e permite remover o recorte temporal', async () => {
    renderPage();

    chooseFilter(0, 'Últimos 7 dias');
    expect(kpi('Total')).toHaveTextContent('2');
    expect(kpi('Resolvidos')).toHaveTextContent('1');

    chooseFilter(0, 'Todas as datas');
    expect(kpi('Total')).toHaveTextContent('5');
    expect(screen.getByTitle('EFD — 1 chamado')).toBeInTheDocument();
    expect(screen.getByTitle('IRPJ — 1 chamado')).toBeInTheDocument();
  });

  it('aplica filtros por departamento, área e cluster usando os IDs carregados', async () => {
    renderPage();

    chooseFilter(1, 'ICMS/IPI');
    expect(kpi('Total')).toHaveTextContent('2');

    chooseFilter(2, 'Fiscal');
    expect(kpi('Total')).toHaveTextContent('2');

    chooseFilter(3, 'Cluster Beta');
    expect(kpi('Total')).toHaveTextContent('1');
    expect(card('Clientes com Mais Chamados').getByText('Cliente A')).toBeInTheDocument();
  });

  it('preserva os agrupamentos atuais por nome ou ID e os responsáveis efetivos/fallback', () => {
    renderPage();

    expect(card('Clientes com Mais Chamados').getByText('Cliente A')).toBeInTheDocument();
    expect(
      card('Clientes com Mais Chamados').getByText('Cliente A').closest('li'),
    ).toHaveTextContent(/2\s*chamados/);

    const representantes = card('Representantes (quem abriu)');
    expect(representantes.getAllByText('Ana Portal')).toHaveLength(2);
    expect(representantes.getAllByText('Ana Portal')[0].closest('li')).toHaveTextContent(
      /2\s*chamados/,
    );
    expect(representantes.getAllByText('Ana Portal')[1].closest('li')).toHaveTextContent(
      /1\s*chamados/,
    );

    expect(card('Áreas Internas').getByText('Fiscal')).toBeInTheDocument();
    expect(card('Áreas Internas').getByText('Contábil')).toBeInTheDocument();

    const responsaveis = card('Responsáveis pela 1ª Resposta');
    expect(responsaveis.getByText('Alice Fiscal')).toBeInTheDocument();
    expect(responsaveis.getByText('Bruno Contábil')).toBeInTheDocument();
    expect(responsaveis.queryByText('Carla Fallback')).not.toBeInTheDocument();
  });

  it('conta cada chamado no máximo uma vez por tópico fiscal, incluindo padrões sobrepostos', () => {
    renderPage();

    expect(screen.getByTitle('ICMS — 1 chamado')).toBeInTheDocument();
    expect(screen.getByTitle('ICMS-ST — 1 chamado')).toBeInTheDocument();
    expect(screen.getByTitle('PIS — 1 chamado')).toBeInTheDocument();
    expect(screen.getByText(/6 tópicos/)).toBeInTheDocument();
  });

  it('distingue estados vazio, sem termos fiscais e loading', () => {
    mocks.tickets.mockReturnValue({ data: [], isLoading: false });
    mocks.firstResponses.mockReturnValue({ data: new Map() });
    const view = renderPage();

    expect(screen.getAllByText('Sem chamados no recorte atual.')).toHaveLength(3);
    expect(
      card('Responsáveis pela 1ª Resposta').getByText('Nenhum chamado respondido ainda.'),
    ).toBeInTheDocument();
    expect(
      card('Clientes com Mais Chamados').getByText('Nenhum cliente identificado.'),
    ).toBeInTheDocument();

    view.unmount();
    mocks.tickets.mockReturnValue({ data: [ticket({ id: 'sem-termo' })], isLoading: false });
    const noTermsView = renderPage();
    expect(
      screen.getByText('Nenhum termo fiscal identificado nos chamados deste recorte.'),
    ).toBeInTheDocument();

    noTermsView.unmount();
    mocks.tickets.mockReturnValue({ data: baseTickets, isLoading: true });
    mocks.firstResponses.mockReturnValue({ data: undefined });
    renderPage();
    for (const label of [
      'Total',
      'Respondidos',
      'Sem Resposta',
      'Resolvidos',
      'Tempo Médio Resposta',
      'Tempo Médio Resolução',
    ]) {
      expect(within(kpi(label)).getByText('—')).toBeInTheDocument();
    }
  });

  it.each(['Lista de chamados', 'Abrir lista completa'])(
    'navega para a lista pelo controle "%s"',
    async (control) => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: control }));
      expect(screen.getByRole('heading', { name: 'Destino lista' })).toBeInTheDocument();
    },
  );
});
