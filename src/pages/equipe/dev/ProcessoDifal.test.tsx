import type { PropsWithChildren } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DifalGroupedItem } from '@/types/difal';

type UnknownProps = Record<string, unknown>;

const mocks = vi.hoisted(() => ({
  groupedQuery: vi.fn(),
  classificationsQuery: vi.fn(),
  contributorsQuery: vi.fn(),
  restore: vi.fn(),
  search: vi.fn(),
  sync: vi.fn(),
  exportExcel: vi.fn(),
  invalidateQueries: vi.fn(),
  toast: vi.fn(),
  filtersProps: {} as UnknownProps,
  summaryProps: {} as UnknownProps,
  productsProps: {} as UnknownProps,
  modalProps: {} as UnknownProps,
  groupedData: {
    items: [
      {
        cProd: 'P1',
        xProd: 'Produto',
        NCM: '1000',
        CFOP: '2102',
        CST: '00',
        tot_itens: 2,
        tot_nfes: 1,
        vlr_total: 100,
        aliq_prod: 17,
        pRedBC: null,
      },
    ],
    total: 1,
    hasMore: true,
    qtdValidados: 0,
    qtdPendentes: 1,
  },
}));

const groupedItem: DifalGroupedItem = {
  groupKey: 'Produto|P1|1000',
  xProd: 'Produto',
  cod_produto: 'P1',
  cod_ncm: '1000',
  id_contribuinte: 'contrib-1',
  cfop: '2102',
  cst_icms: '00',
  aliq_icms: 17,
  pRedBC: null,
  count: 2,
  totalValue: 100,
  nfesCount: 1,
  status: 'pendente',
  classificacao: null,
};

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/hooks/useDomainProcessoDifalQueries', () => ({
  useProcessoDifalClientesQuery: () => ({
    data: [{ id: 'cliente-1', nome: 'Cliente PSA' }],
    isLoading: false,
  }),
  useProcessoDifalContribuintesQuery: (clienteId: string) => {
    mocks.contributorsQuery(clienteId);
    return { data: [], isLoading: false };
  },
  useProcessoDifalGroupedItemsQuery: (params: unknown) => {
    mocks.groupedQuery(params);
    return {
      data: mocks.groupedData,
      isLoading: false,
      error: null,
    };
  },
  useProcessoDifalClassificacoesQuery: (items: unknown) => {
    mocks.classificationsQuery(items);
    return { data: undefined, isLoading: false };
  },
}));
vi.mock('@/hooks/useDomainProcessoDifalSession', () => ({
  useDomainProcessoDifalSession: () => ({
    restoreSessionMutation: { mutateAsync: mocks.restore },
    searchSessionMutation: { mutateAsync: mocks.search },
    syncSessionMutation: { mutateAsync: mocks.sync },
  }),
}));
vi.mock('@/hooks/useProcessoDifalExport', () => ({
  useProcessoDifalExport: () => ({
    exportExcel: mocks.exportExcel,
    exportStatus: 'idle',
    isExporting: false,
  }),
}));
vi.mock('@/components/equipe/dev/DevLayout', () => ({
  DevLayout: ({ children }: PropsWithChildren) => <main>{children}</main>,
}));
vi.mock('@/components/equipe/dev/DevPageHeader', () => ({
  DevPageHeader: () => <div>cabeçalho</div>,
}));
vi.mock('@/components/equipe/dev/processo-difal/DifalFiltersCard', () => ({
  DifalFiltersCard: (props: UnknownProps) => {
    mocks.filtersProps = props;
    return (
      <div>
        <button onClick={() => (props.onClienteChange as (value: string) => void)('cliente-1')}>
          cliente
        </button>
        <button
          onClick={() => (props.onContribuinteChange as (value: string) => void)('contrib-1')}
        >
          contribuinte
        </button>
        <button onClick={() => (props.onStartDateChange as (value: string) => void)('2026-02-01')}>
          início
        </button>
        <button onClick={() => (props.onEndDateChange as (value: string) => void)('2026-02-28')}>
          fim
        </button>
        <button onClick={() => (props.onSearch as () => void)()}>buscar</button>
      </div>
    );
  },
}));
vi.mock('@/components/equipe/dev/processo-difal/DifalSummaryActions', () => ({
  DifalSummaryActions: (props: UnknownProps) => {
    mocks.summaryProps = props;
    return (
      <div>
        <output data-testid="status">{String(props.statusFilter)}</output>
        <output data-testid="pending-count">{String(props.pendingDecisionsCount)}</output>
        <button onClick={() => (props.onStatusFilterChange as (value: string) => void)('pending')}>
          pendentes
        </button>
        <button onClick={() => (props.onSaveChanges as () => void)()}>salvar</button>
        <button onClick={() => (props.onExportExcel as () => void)()}>exportar</button>
      </div>
    );
  },
}));
vi.mock('@/components/equipe/dev/processo-difal/DifalProductsCard', () => ({
  DifalProductsCard: (props: UnknownProps) => {
    mocks.productsProps = props;
    return (
      <div>
        produtos
        <button onClick={() => (props.onPageChange as (direction: string) => void)('next')}>
          próxima
        </button>
        <button
          onClick={() => (props.onGroupClick as (item: DifalGroupedItem) => void)(groupedItem)}
        >
          selecionar
        </button>
      </div>
    );
  },
}));
vi.mock('@/components/equipe/dev/DifalAuditModal', () => ({
  DifalAuditModal: (props: UnknownProps) => {
    mocks.modalProps = props;
    if (!props.open) return null;
    return (
      <button
        onClick={() =>
          (props.onDecisionSaved as (item: DifalGroupedItem) => void)(
            props.group as DifalGroupedItem,
          )
        }
      >
        decisão salva
      </button>
    );
  },
}));
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: PropsWithChildren) => children,
}));

import ProcessoDifal from '@/pages/equipe/dev/ProcessoDifal';

function setFiltersAndSearch() {
  fireEvent.click(screen.getByRole('button', { name: 'cliente' }));
  fireEvent.click(screen.getByRole('button', { name: 'contribuinte' }));
  fireEvent.click(screen.getByRole('button', { name: 'início' }));
  fireEvent.click(screen.getByRole('button', { name: 'fim' }));
  fireEvent.click(screen.getByRole('button', { name: 'buscar' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.filtersProps = {};
  mocks.summaryProps = {};
  mocks.productsProps = {};
  mocks.modalProps = {};
  mocks.restore.mockResolvedValue(null);
  mocks.search.mockResolvedValue({
    sessionId: 'sessao-1',
    existingSession: false,
    decisionsCount: 0,
  });
  mocks.sync.mockResolvedValue(1);
});

describe('ProcessoDifal', () => {
  it('encaminha filtros, paginação e status exatos aos hooks de domínio', async () => {
    render(<ProcessoDifal />);

    const now = new Date();
    expect(mocks.groupedQuery).toHaveBeenLastCalledWith({
      selectedContribuinte: '',
      startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
      currentPage: 1,
      statusFilter: 'all',
      searchTriggered: false,
    });
    expect(mocks.contributorsQuery).toHaveBeenLastCalledWith('');
    expect(mocks.classificationsQuery).toHaveBeenLastCalledWith([]);

    setFiltersAndSearch();
    await waitFor(() =>
      expect(mocks.search).toHaveBeenCalledWith({
        userId: 'user-1',
        clienteId: 'cliente-1',
        clienteNome: 'Cliente PSA',
        contribuinteId: 'contrib-1',
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      }),
    );
    await waitFor(() =>
      expect(mocks.groupedQuery).toHaveBeenLastCalledWith({
        selectedContribuinte: 'contrib-1',
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        currentPage: 1,
        statusFilter: 'all',
        searchTriggered: true,
      }),
    );
    expect(mocks.classificationsQuery).toHaveBeenLastCalledWith([groupedItem]);

    fireEvent.click(screen.getByRole('button', { name: 'próxima' }));
    expect(mocks.groupedQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ currentPage: 2 }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'pendentes' }));
    expect(screen.getByTestId('status')).toHaveTextContent('pending');
    expect(mocks.groupedQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        currentPage: 1,
        statusFilter: 'pending',
        searchTriggered: true,
      }),
    );
  });

  it('encadeia decisão, sync, invalidações e export com o estado já resetado', async () => {
    render(<ProcessoDifal />);
    setFiltersAndSearch();
    await screen.findByText('produtos');

    fireEvent.click(screen.getByRole('button', { name: 'selecionar' }));
    expect(mocks.modalProps).toMatchObject({
      open: true,
      group: groupedItem,
      sessaoId: 'sessao-1',
    });
    fireEvent.click(screen.getByRole('button', { name: 'decisão salva' }));
    expect(screen.getByTestId('pending-count')).toHaveTextContent('1');

    fireEvent.click(screen.getByRole('button', { name: 'salvar' }));
    await waitFor(() =>
      expect(mocks.sync).toHaveBeenCalledWith({
        sessionId: 'sessao-1',
        groupedItems: [{ ...groupedItem, status: 'validado', classificacao: undefined }],
      }),
    );
    await waitFor(() => expect(screen.getByTestId('pending-count')).toHaveTextContent('0'));
    expect(mocks.invalidateQueries.mock.calls).toEqual([
      [{ queryKey: ['difal-classificacoes'] }],
      [{ queryKey: ['difal-grouped-items'] }],
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'exportar' }));
    expect(mocks.exportExcel).toHaveBeenCalledWith({
      contribuinteId: 'contrib-1',
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      pendingDecisionsCount: 0,
    });
  });
});
