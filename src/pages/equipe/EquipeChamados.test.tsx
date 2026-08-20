import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TicketListItem } from '@/hooks/useTickets';

if (!HTMLElement.prototype.hasPointerCapture) {
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
}

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  location: { state: null as { from?: string } | null },
  useAuth: vi.fn(),
  useUserEstrutura: vi.fn(),
  useCanAssignTickets: vi.fn(),
  useTicketsList: vi.fn(),
  useAllActiveAreas: vi.fn(),
  useAllActiveClusters: vi.fn(),
  mutateAsync: vi.fn(),
  toast: vi.fn(),
  // Espelhamento: `?area=` na URL e o cluster que a chave resolve.
  searchParams: new URLSearchParams(),
  useDomainClusterPorCategoria: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useLocation: () => mocks.location,
  useSearchParams: () => [mocks.searchParams, vi.fn()] as const,
}));
vi.mock('@/hooks/useDomainClusterPorCategoria', () => ({
  useDomainClusterPorCategoria: mocks.useDomainClusterPorCategoria,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mocks.useAuth }));
vi.mock('@/hooks/useUserEstrutura', () => ({ useUserEstrutura: mocks.useUserEstrutura }));
vi.mock('@/hooks/useCanAssignTickets', () => ({
  useCanAssignTickets: mocks.useCanAssignTickets,
}));
vi.mock('@/hooks/useTickets', () => ({ useTicketsList: mocks.useTicketsList }));
vi.mock('@/hooks/useEstruturaAreas', () => ({
  useAllActiveAreas: mocks.useAllActiveAreas,
  useAllActiveClusters: mocks.useAllActiveClusters,
}));
vi.mock('@/hooks/useTicketMutations', () => ({
  useAssignTicket: () => ({ mutateAsync: mocks.mutateAsync }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/components/chamados/AssignAgentCell', () => ({
  AssignAgentCell: ({
    ticketId,
    clusterId,
    onAssign,
  }: {
    ticketId: string;
    clusterId: string | null;
    onAssign: (ticketId: string, agentId: string | null, agentName: string | null) => void;
  }) => (
    <button type="button" onClick={() => onAssign(ticketId, 'agent-2', 'Ana Agente')}>
      Atribuir {ticketId} em {clusterId ?? 'sem cluster'}
    </button>
  ),
}));
vi.mock('@/components/ui/floating-scrollbar', () => ({
  FloatingScrollbar: () => null,
}));

import EquipeChamados from '@/pages/equipe/EquipeChamados';

const NOW = new Date('2026-07-21T12:00:00');

function ticket(overrides: Partial<TicketListItem> = {}): TicketListItem {
  return {
    id: 'ticket-00000001',
    title: 'Apuração mensal',
    description: 'Descrição',
    status: 'aberto',
    priority: 'normal',
    department: 'contabilidade',
    created_at: '2026-07-21T09:00:00',
    updated_at: '2026-07-21T10:00:00',
    user_id: 'client-1',
    assigned_to: 'user-1',
    activity_status: 'em_analise',
    deadline: '2026-07-26',
    estrutura_area_id: 'area-1',
    cluster_id: 'cluster-1',
    profiles: { id: 'client-1', first_name: 'Maria', last_name: 'Silva' },
    cliente_nome: 'Cliente Alfa',
    ...overrides,
  };
}

function setTickets(data: TicketListItem[], isLoading = false) {
  mocks.useTicketsList.mockReturnValue({ data, isLoading });
}

async function selectOption(user: ReturnType<typeof userEvent.setup>, index: number, name: string) {
  await user.click(screen.getAllByRole('combobox')[index]);
  await user.click(await screen.findByRole('option', { name }));
}

function tableTitles() {
  const table = screen.getByRole('table');
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[1].textContent?.trim());
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
  mocks.location.state = null;
  // Sem espelho por padrão: `/equipe/chamados` aberta direto mostra tudo.
  mocks.searchParams = new URLSearchParams();
  mocks.useDomainClusterPorCategoria.mockReturnValue({ clusterId: null, isLoading: false });
  mocks.useAuth.mockReturnValue({ user: { id: 'user-1' } });
  mocks.useCanAssignTickets.mockReturnValue(false);
  mocks.useUserEstrutura.mockReturnValue({
    clusters: [{ id: 'cluster-1', name: 'Cluster Norte' }],
  });
  mocks.useAllActiveAreas.mockReturnValue({
    data: [
      { id: 'area-1', name: 'Área Fiscal' },
      { id: 'area-2', name: 'Área Contábil' },
    ],
  });
  mocks.useAllActiveClusters.mockReturnValue({
    data: [
      { id: 'cluster-1', name: 'Cluster Norte' },
      { id: 'cluster-2', name: 'Cluster Sul' },
    ],
  });
  mocks.mutateAsync.mockResolvedValue(undefined);
  setTickets([ticket()]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('EquipeChamados', () => {
  it('delega o recorte de RLS ao hook conforme a permissão e limita a UI do atendente', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<EquipeChamados />);

    expect(mocks.useTicketsList).toHaveBeenCalledWith({
      assignedTo: 'user-1',
      filterAssigned: true,
    });
    expect(screen.getByRole('heading', { name: 'Chamados da Equipe' })).toBeInTheDocument();
    expect(screen.getByText('Visualize e responda os chamados atribuídos a você')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Responsável' })).not.toBeInTheDocument();
    await user.click(screen.getAllByRole('combobox')[5]);
    expect(screen.getByRole('option', { name: 'Cluster Norte' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Cluster Sul' })).not.toBeInTheDocument();
  });

  it('solicita todos os tickets para quem pode atribuir e mantém a atribuição na fronteira', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mocks.useCanAssignTickets.mockReturnValue(true);
    render(<EquipeChamados />);

    expect(mocks.useTicketsList).toHaveBeenCalledWith({
      assignedTo: 'user-1',
      filterAssigned: false,
    });
    expect(screen.getByRole('heading', { name: 'Chamados da Equipe' })).toBeInTheDocument();
    expect(screen.getByText('Visualize todos os chamados e atribua responsáveis')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Responsável' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Atribuir ticket-00000001/ }));
    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      ticketId: 'ticket-00000001',
      agentId: 'agent-2',
      agentName: 'Ana Agente',
    });
    expect(mocks.toast).toHaveBeenCalledWith({
      title: 'Agente atribuído',
      description: 'Chamado atribuído a Ana Agente',
    });
  });

  it('inicia e restaura o único cluster do usuário, sem apagar o recorte ao limpar', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setTickets([
      ticket(),
      ticket({ id: 'ticket-00000002', title: 'Ticket Sul', cluster_id: 'cluster-2' }),
    ]);
    render(<EquipeChamados />);

    expect(screen.getByText('1 de 2 chamados')).toBeInTheDocument();
    expect(screen.getAllByRole('combobox')[5]).toHaveTextContent('Cluster Norte');
    await user.type(screen.getByPlaceholderText('Buscar por ID'), 'inexistente');
    expect(screen.getByText('Nenhum chamado encontrado com os filtros selecionados.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpar Filtros' }));
    expect(screen.getByText('1 de 2 chamados')).toBeInTheDocument();
    expect(screen.getAllByRole('combobox')[5]).toHaveTextContent('Cluster Norte');
    expect(screen.getByText('Apuração mensal')).toBeInTheDocument();
    expect(screen.queryByText('Ticket Sul')).not.toBeInTheDocument();
  });

  it('mantém stats sobre todos os tickets carregados enquanto combina os filtros da tabela', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mocks.useCanAssignTickets.mockReturnValue(true);
    mocks.useUserEstrutura.mockReturnValue({ clusters: [] });
    setTickets([
      ticket({
        id: 'match-urgente-001',
        title: 'Resultado filtrado',
        priority: 'urgente',
        department: 'icms_ipi',
        deadline: '2026-07-21',
      }),
      ticket({
        id: 'other-progress-2',
        title: 'Outro chamado',
        status: 'em_andamento',
        estrutura_area_id: 'area-2',
        cluster_id: 'cluster-2',
        created_at: '2026-06-01T09:00:00',
      }),
      ticket({ id: 'closed-ticket-3', title: 'Encerrado', status: 'fechado' }),
    ]);
    render(<EquipeChamados />);

    await selectOption(user, 0, 'Hoje');
    await selectOption(user, 1, 'Aberto');
    await selectOption(user, 2, 'Urgente');
    await selectOption(user, 3, 'ICMS/IPI');
    await selectOption(user, 4, 'Área Fiscal');
    await selectOption(user, 5, 'Cluster Norte');
    await user.type(screen.getByPlaceholderText('Buscar por ID'), 'MATCH-URGENTE');

    expect(screen.getByText('Resultado filtrado')).toBeInTheDocument();
    expect(screen.queryByText('Outro chamado')).not.toBeInTheDocument();
    expect(screen.getByText('1 de 3 chamados')).toBeInTheDocument();
    expect(screen.getByText('3', { selector: '.text-3xl' })).toBeInTheDocument();
    expect(screen.getAllByText('1', { selector: '.text-3xl' })).toHaveLength(3);
  });

  it('preserva a semântica de urgentes e não inclui concluídos nem quem aguarda o cliente', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mocks.useCanAssignTickets.mockReturnValue(true);
    mocks.useUserEstrutura.mockReturnValue({ clusters: [] });
    setTickets([
      ticket({ id: 'expired-0000001', title: 'Atrasado', deadline: '2026-07-19' }),
      ticket({ id: 'today-000000002', title: 'Prazo hoje', deadline: '2026-07-21' }),
      ticket({ id: 'two-days-000003', title: 'Em dois dias', deadline: '2026-07-22' }),
      ticket({ id: 'normal-00000004', title: 'Prazo normal', deadline: '2026-07-26' }),
      ticket({ id: 'answered-000005', title: 'Cliente deve responder', activity_status: 'respondido' }),
      ticket({ id: 'resolved-000006', title: 'Já resolvido', status: 'resolvido' }),
    ]);
    render(<EquipeChamados />);

    await user.click(screen.getByRole('checkbox', { name: 'Apenas urgentes (< 2 dias)' }));

    expect(tableTitles()).toEqual(['Atrasado', 'Prazo hoje', 'Em dois dias']);
    expect(screen.getByText('3 de 6 chamados')).toBeInTheDocument();
  });

  it('exibe os estados atuais de prazo, inclusive deadline de hoje como Amanhã', () => {
    mocks.useCanAssignTickets.mockReturnValue(true);
    mocks.useUserEstrutura.mockReturnValue({ clusters: [] });
    setTickets([
      ticket({ id: 'late-0000000001', title: 'Atrasado', deadline: '2026-07-19' }),
      ticket({ id: 'today-000000001', title: 'Hoje', deadline: '2026-07-21' }),
      ticket({ id: 'attention-000001', title: 'Atenção', deadline: '2026-07-22' }),
      ticket({ id: 'normal-00000001', title: 'Normal', deadline: '2026-07-26' }),
      ticket({ id: 'waiting-0000001', title: 'Aguardando', activity_status: 'respondido' }),
      ticket({ id: 'done-00000000001', title: 'Concluído', status: 'fechado' }),
    ]);
    render(<EquipeChamados />);

    expect(screen.getByText(/ATRASADO/)).toBeInTheDocument();
    expect(screen.getByText(/Amanhã \(/)).toBeInTheDocument();
    expect(screen.getByText('2 dias')).toBeInTheDocument();
    expect(screen.getByText('6 dias')).toBeInTheDocument();
    expect(screen.getByText('Aguardando Cliente')).toBeInTheDocument();
    expect(screen.getAllByText('Concluído')).toHaveLength(2);
  });

  it('cicla a ordenação ascendente, descendente e sem ordenação', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mocks.useCanAssignTickets.mockReturnValue(true);
    mocks.useUserEstrutura.mockReturnValue({ clusters: [] });
    setTickets([
      ticket({ id: 'z-0000000000001', title: 'Zulu' }),
      ticket({ id: 'a-0000000000002', title: 'Alfa' }),
      ticket({ id: 'm-0000000000003', title: 'Mike' }),
    ]);
    render(<EquipeChamados />);

    const titleHeader = screen.getByRole('columnheader', { name: 'Título' });
    expect(tableTitles()).toEqual(['Zulu', 'Alfa', 'Mike']);
    await user.click(titleHeader);
    expect(tableTitles()).toEqual(['Alfa', 'Mike', 'Zulu']);
    await user.click(titleHeader);
    expect(tableTitles()).toEqual(['Zulu', 'Mike', 'Alfa']);
    await user.click(titleHeader);
    expect(tableTitles()).toEqual(['Zulu', 'Alfa', 'Mike']);
  });

  it('renderiza dados da tabela e navega pelo título e pela origem recebida', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mocks.location.state = { from: '/equipe/tax' };
    setTickets([ticket({ attachment_count: 2 })]);
    render(<EquipeChamados />);

    expect(screen.getByText('Contabilidade/Societário')).toBeInTheDocument();
    expect(screen.getByText('Área Fiscal')).toBeInTheDocument();
    expect(screen.getAllByText('Cluster Norte')).toHaveLength(2);
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('Cliente Alfa')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Apuração mensal' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/equipe/chamados/ticket-00000001');
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/equipe/tax');
  });

  it('distingue carregamento e os vazios conforme a permissão', () => {
    setTickets([], true);
    const { container, rerender } = render(<EquipeChamados />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();

    setTickets([]);
    rerender(<EquipeChamados />);
    expect(screen.getByText('Você não possui chamados atribuídos no momento.')).toBeInTheDocument();

    mocks.useCanAssignTickets.mockReturnValue(true);
    rerender(<EquipeChamados />);
    expect(screen.getByText('Nenhum chamado encontrado.')).toBeInTheDocument();
  });
});

/*
 * ESPELHAMENTO — "cor e conteúdo andam juntos" do lado do conteúdo.
 *
 * O tema em si é testado em `src/lib/areaTheme.test.ts`, que garante que a chave
 * pinta. Aqui está a outra metade: que a MESMA chave filtra. Um teste sem o
 * outro deixaria passar exatamente o defeito que o espelhamento existe para não
 * ter — pintar sem filtrar.
 */
describe('EquipeChamados espelhada', () => {
  beforeEach(() => {
    mocks.useCanAssignTickets.mockReturnValue(true);
    mocks.searchParams = new URLSearchParams('area=osg');
    mocks.useDomainClusterPorCategoria.mockReturnValue({ clusterId: 'cluster-2', isLoading: false });
  });

  it('reduz a lista ao cluster do espelho', () => {
    setTickets([
      ticket({ id: 'ticket-00000001', title: 'Do cluster 1', cluster_id: 'cluster-1' }),
      ticket({ id: 'ticket-00000002', title: 'Do cluster 2', cluster_id: 'cluster-2' }),
    ]);
    render(<EquipeChamados />);
    expect(screen.getByText('Do cluster 2')).toBeInTheDocument();
    expect(screen.queryByText('Do cluster 1')).not.toBeInTheDocument();
    // E o contador confirma que houve recorte, não que só existia um.
    expect(screen.getByText('1 de 2 chamados')).toBeInTheDocument();
  });

  it('o vazio NOMEIA o escopo — é a prova visível de que o filtro agiu', () => {
    // Sem o nome, uma tela vazia parece defeito: ninguém distingue "filtrou e
    // não achou" de "quebrou". Hoje é a única confirmação visível do
    // espelhamento nos clusters sem chamado.
    setTickets([ticket({ id: 'ticket-00000001', cluster_id: 'cluster-1' })]);
    render(<EquipeChamados />);
    expect(screen.getByText('Nenhum chamado em Cluster Sul.')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum chamado encontrado.')).not.toBeInTheDocument();
  });

  it('espera o cluster resolver antes de mostrar lista sem recorte', () => {
    // Enquanto resolve, a lista ainda está sem filtro e o tema JÁ está aplicado
    // (o tema é síncrono). Mostrá-la seria a divergência.
    mocks.useDomainClusterPorCategoria.mockReturnValue({ clusterId: null, isLoading: true });
    setTickets([ticket({ id: 'ticket-00000001', title: 'Do cluster 1', cluster_id: 'cluster-1' })]);
    const { container } = render(<EquipeChamados />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByText('Do cluster 1')).not.toBeInTheDocument();
  });

  it('trava o filtro de Cluster: o escopo não é do usuário, é de onde a tela está', () => {
    setTickets([ticket({ id: 'ticket-00000001', cluster_id: 'cluster-2' })]);
    render(<EquipeChamados />);
    expect(screen.getByText('Definido pelo ambiente desta tela')).toBeInTheDocument();
  });

  it('limpar filtros mantém o escopo do espelho', () => {
    setTickets([
      ticket({ id: 'ticket-00000001', title: 'Do cluster 1', cluster_id: 'cluster-1' }),
      ticket({ id: 'ticket-00000002', title: 'Do cluster 2', cluster_id: 'cluster-2' }),
    ]);
    render(<EquipeChamados />);
    screen.getByRole('button', { name: 'Limpar Filtros' }).click();
    expect(screen.queryByText('Do cluster 1')).not.toBeInTheDocument();
  });

  it('sem espelho, nada trava e a lista não é recortada', () => {
    mocks.searchParams = new URLSearchParams();
    mocks.useDomainClusterPorCategoria.mockReturnValue({ clusterId: null, isLoading: false });
    mocks.useUserEstrutura.mockReturnValue({ clusters: [] });
    setTickets([
      ticket({ id: 'ticket-00000001', title: 'Do cluster 1', cluster_id: 'cluster-1' }),
      ticket({ id: 'ticket-00000002', title: 'Do cluster 2', cluster_id: 'cluster-2' }),
    ]);
    render(<EquipeChamados />);
    expect(screen.getByText('Do cluster 1')).toBeInTheDocument();
    expect(screen.getByText('Do cluster 2')).toBeInTheDocument();
    expect(screen.queryByText('Definido pelo ambiente desta tela')).not.toBeInTheDocument();
  });
});
