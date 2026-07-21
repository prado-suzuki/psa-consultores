import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  queryClient: {
    invalidateQueries: vi.fn(),
    refetchQueries: vi.fn().mockResolvedValue(undefined),
  },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  sync: vi.fn(),
  insertMutate: vi.fn(),
  registerMutate: vi.fn(),
  clearMutate: vi.fn(),
  insertOptions: undefined as Record<string, unknown> | undefined,
  registerOptions: undefined as Record<string, unknown> | undefined,
  clearOptions: undefined as Record<string, unknown> | undefined,
  registerPending: false,
  clearPending: false,
  detail: undefined as Record<string, unknown> | undefined,
  dcomps: [] as Record<string, unknown>[],
  situations: [] as Record<string, unknown>[],
  dcompsLoading: false,
  situationsLoading: false,
}));

vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => mocks.queryClient }));
vi.mock('sonner', () => ({ toast: mocks.toast }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'USER-1' } }) }));
vi.mock('@/hooks/useSelicTaxaAt', () => ({
  useSelicTaxaAt: () => ({ data: undefined, error: null, isLoading: false }),
}));
vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect }: { onSelect: (date: Date) => void }) => (
    <button onClick={() => onSelect(new Date(2026, 6, 1))}>choose-payment-date</button>
  ),
}));
vi.mock('@/hooks/useDomainPerdcompDetail', () => ({
  usePerDetail: () => ({ data: mocks.detail }),
  usePerDcompsDetail: () => ({ data: mocks.dcomps, isLoading: mocks.dcompsLoading }),
  usePerSituacoesDetail: () => ({ data: mocks.situations, isLoading: mocks.situationsLoading }),
  usePerDistribuicoesDetail: () => ({ data: [] }),
  useInsertPerSituationDetail: (options: Record<string, unknown>) => {
    mocks.insertOptions = options;
    return { mutate: mocks.insertMutate, isPending: false };
  },
  useSyncPerdcompDetail: () => mocks.sync,
  useRegisterPerReimbursement: (options: Record<string, unknown>) => {
    mocks.registerOptions = options;
    return { mutate: mocks.registerMutate, isPending: mocks.registerPending };
  },
  useClearPerReimbursement: (options: Record<string, unknown>) => {
    mocks.clearOptions = options;
    return { mutate: mocks.clearMutate, isPending: mocks.clearPending };
  },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <>{children}</> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));
vi.mock('@/components/equipe/dev/perdcomp/per-detail/PerDetailHeader', () => ({
  PerDetailHeader: ({ onClose, onDelete }: { onClose: () => void; onDelete: () => void }) => (
    <header>
      <button onClick={onClose}>close-main</button>
      <button onClick={onDelete}>delete-per</button>
    </header>
  ),
}));
vi.mock('@/components/equipe/dev/perdcomp/per-detail/PerDetailSituationSidebar', () => ({
  PerDetailSituationSidebar: ({
    novaSituacao,
    onNovaSituacaoChange,
    onUpdateSituacao,
    onDeleteRessarcimento,
  }: {
    novaSituacao: string;
    onNovaSituacaoChange: (value: string) => void;
    onUpdateSituacao: () => void;
    onDeleteRessarcimento: () => void;
  }) => (
    <aside>
      <output data-testid="situation-state">{novaSituacao}</output>
      <button onClick={() => onNovaSituacaoChange('Homologado')}>choose-situation</button>
      <button onClick={onUpdateSituacao}>save-situation</button>
      <button onClick={onDeleteRessarcimento}>open-clear</button>
    </aside>
  ),
}));
vi.mock('@/components/equipe/dev/perdcomp/per-detail/PerDetailDcompPanel', () => ({
  PerDetailDcompPanel: ({
    loading,
    onNewRessarcimento,
    onNewDcomp,
    onEditDcomp,
    onDeleteDcomp,
  }: {
    loading: boolean;
    onNewRessarcimento: () => void;
    onNewDcomp: () => void;
    onEditDcomp: (value: Record<string, unknown>) => void;
    onDeleteDcomp: (value: Record<string, unknown>) => void;
  }) => (
    <section>
      <output data-testid="dcomp-loading">{String(loading)}</output>
      <button onClick={onNewRessarcimento}>new-reimbursement</button>
      <button onClick={onNewDcomp}>new-dcomp</button>
      <button onClick={() => onEditDcomp({ nr_documento: 'D1' })}>edit-dcomp</button>
      <button onClick={() => onDeleteDcomp({ nr_documento: 'D1' })}>delete-dcomp</button>
    </section>
  ),
}));
vi.mock('./DcompFormModal', () => ({
  DcompFormModal: ({
    open,
    editData,
    onOpenChange,
  }: {
    open: boolean;
    editData: { nr_documento?: string } | null;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="dcomp-modal">
        {editData?.nr_documento ?? 'new'}
        <button onClick={() => onOpenChange(false)}>close-dcomp</button>
      </div>
    ) : null,
}));
vi.mock('./SoftDeleteModal', () => ({
  SoftDeleteModal: ({
    open,
    type,
    identifier,
    onOpenChange,
  }: {
    open: boolean;
    type: string;
    identifier: string;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="soft-delete">
        {type}:{identifier}
        <button onClick={() => onOpenChange(false)}>close-delete</button>
      </div>
    ) : null,
}));

import { PerDetailModal } from './PerDetailModal';

const per = {
  nr_per: 'P1',
  id_contribuinte: 'C1',
  exercicio: 2025,
  tri_exercicio: 1,
  dt_solicitada: '2026-01-01',
  tp_credito: 'Crédito',
  vlr_credito: 100,
  vlr_ressarcido: 0,
  vlr_ressarcido_original: null,
  nr_proc_ret: null,
  contribuinte: { nome_razao_social: 'Empresa' },
};

function renderModal(overrides: Partial<React.ComponentProps<typeof PerDetailModal>> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    per,
    contribuinteId: 'C1',
    ...overrides,
  };
  return { ...render(<PerDetailModal {...props} />), props };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.queryClient.refetchQueries.mockResolvedValue(undefined);
  mocks.detail = undefined;
  mocks.dcomps = [];
  mocks.situations = [];
  mocks.dcompsLoading = false;
  mocks.situationsLoading = false;
  mocks.registerPending = false;
  mocks.clearPending = false;
  mocks.insertOptions = undefined;
  mocks.registerOptions = undefined;
  mocks.clearOptions = undefined;
});

describe('PerDetailModal', () => {
  it('não renderiza conteúdo quando PER é nulo', () => {
    const { container } = renderModal({ per: null });
    expect(container).toBeEmptyDOMElement();
  });

  it('mantém estado local ao fechar e reabrir enquanto permanece montado', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const view = renderModal({ onOpenChange });
    await user.click(screen.getByText('choose-situation'));
    expect(screen.getByTestId('situation-state')).toHaveTextContent('Homologado');

    view.rerender(
      <PerDetailModal open={false} onOpenChange={onOpenChange} per={per} contribuinteId="C1" />,
    );
    expect(screen.queryByTestId('situation-state')).not.toBeInTheDocument();
    view.rerender(
      <PerDetailModal open onOpenChange={onOpenChange} per={per} contribuinteId="C1" />,
    );
    expect(screen.getByTestId('situation-state')).toHaveTextContent('Homologado');
  });

  it('abre os modais filhos com contexto e refaz queries ao fechar DCOMP', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByText('new-dcomp'));
    expect(screen.getByTestId('dcomp-modal')).toHaveTextContent('new');
    await user.click(screen.getByText('close-dcomp'));
    expect(mocks.queryClient.refetchQueries).toHaveBeenNthCalledWith(1, {
      queryKey: ['per-dcomps', 'P1'],
    });
    expect(mocks.queryClient.refetchQueries).toHaveBeenNthCalledWith(2, {
      queryKey: ['per-detail', 'P1'],
    });

    await user.click(screen.getByText('edit-dcomp'));
    expect(screen.getByTestId('dcomp-modal')).toHaveTextContent('D1');
    await user.click(screen.getByText('delete-dcomp'));
    expect(screen.getByTestId('soft-delete')).toHaveTextContent('dcomp:D1');
    await user.click(screen.getByText('close-delete'));
    await user.click(screen.getByText('delete-per'));
    expect(screen.getByTestId('soft-delete')).toHaveTextContent('per:P1');
  });

  it('salvar ressarcimento inválido mostra erro e a action fecha o diálogo automaticamente', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByText('new-reimbursement'));
    expect(screen.getByRole('heading', { name: 'Novo Ressarcimento' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(mocks.toast.error).toHaveBeenCalledWith('Informe um valor válido');
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Novo Ressarcimento' })).not.toBeInTheDocument(),
    );
    expect(mocks.registerMutate).not.toHaveBeenCalled();
  });

  it('no sucesso do ressarcimento aguarda refetches em ordem, invalida amplamente, reseta e sincroniza o payload stale sem aguardar DW', async () => {
    const user = userEvent.setup();
    const refetchResolvers: Array<() => void> = [];
    mocks.queryClient.refetchQueries.mockImplementation(
      () => new Promise<void>((resolve) => refetchResolvers.push(resolve)),
    );
    mocks.sync.mockReturnValueOnce(new Promise(() => undefined));
    mocks.detail = {
      ...per,
      exercicio: 2099,
      tp_credito: 'valor atualizado da query',
      vlr_credito: 999,
    };
    renderModal();
    await user.click(screen.getByText('new-reimbursement'));
    await user.type(screen.getByPlaceholderText('R$ 0,00'), '12345');
    await user.click(screen.getByRole('button', { name: /Selecione/ }));
    await user.click(screen.getByText('choose-payment-date'));
    expect(screen.getByPlaceholderText('R$ 0,00')).toHaveValue('R$ 123,45');
    expect(screen.getByRole('button', { name: /01\/07\/2026/ })).toBeInTheDocument();

    const sitData = { id: 'S-PAGO' };
    const successPromise = (mocks.registerOptions?.onSuccess as (data: unknown) => Promise<void>)({
      valor: 123.45,
      sitData,
    });
    expect(mocks.queryClient.refetchQueries).toHaveBeenCalledTimes(1);
    expect(mocks.queryClient.refetchQueries).toHaveBeenNthCalledWith(1, {
      queryKey: ['per-detail', 'P1'],
    });
    expect(mocks.toast.success).not.toHaveBeenCalled();

    refetchResolvers.shift()?.();
    await waitFor(() => expect(mocks.queryClient.refetchQueries).toHaveBeenCalledTimes(2));
    expect(mocks.queryClient.refetchQueries).toHaveBeenNthCalledWith(2, {
      queryKey: ['per-situacoes', 'P1'],
    });
    refetchResolvers.shift()?.();
    await waitFor(() => expect(mocks.queryClient.refetchQueries).toHaveBeenCalledTimes(3));
    expect(mocks.queryClient.invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: ['per-situacoes'],
    });
    expect(mocks.queryClient.refetchQueries).toHaveBeenNthCalledWith(3, {
      queryKey: ['per-dcomps', 'P1'],
    });
    expect(mocks.sync).not.toHaveBeenCalled();

    refetchResolvers.shift()?.();
    await act(async () => successPromise);
    expect(mocks.queryClient.invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: ['perdcomp-per'],
    });
    expect(mocks.toast.success).toHaveBeenCalledWith('Ressarcimento registrado com sucesso!');
    expect(mocks.sync).toHaveBeenCalledWith({
      per: [
        {
          nr_per: 'P1',
          id_contribuinte: 'C1',
          exercicio: 2025,
          tri_exercicio: 1,
          dt_solicitada: '2026-01-01',
          tp_credito: 'Crédito',
          vlr_credito: 100,
          vlr_ressarcido: 123.45,
          nr_proc_ret: null,
        },
      ],
      per_situacao: [sitData],
    });
    expect(mocks.toast.success.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.sync.mock.invocationCallOrder[0],
    );
    expect(screen.queryByRole('heading', { name: 'Novo Ressarcimento' })).not.toBeInTheDocument();

    await user.click(screen.getByText('new-reimbursement'));
    expect(screen.getByPlaceholderText('R$ 0,00')).toHaveValue('');
    expect(screen.getByRole('button', { name: /Selecione/ })).toBeInTheDocument();
  });

  it('no erro do ressarcimento preserva diálogo e rascunho e mostra erro destrutivo', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByText('new-reimbursement'));
    await user.type(screen.getByPlaceholderText('R$ 0,00'), '9876');
    await user.click(screen.getByRole('button', { name: /Selecione/ }));
    await user.click(screen.getByText('choose-payment-date'));

    act(() => {
      (mocks.registerOptions?.onError as (error: Error) => void)(new Error('DW indisponível'));
    });
    expect(mocks.toast.error).toHaveBeenCalledWith(
      'Erro ao registrar ressarcimento: DW indisponível',
    );
    expect(screen.getByRole('heading', { name: 'Novo Ressarcimento' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('R$ 0,00')).toHaveValue('R$ 98,76');
    expect(screen.getByRole('button', { name: /01\/07\/2026/ })).toBeInTheDocument();
    expect(mocks.sync).not.toHaveBeenCalled();
  });

  it('a exclusão usa preventDefault, envia usuário e permanece aberta até callback de sucesso', async () => {
    const user = userEvent.setup();
    mocks.detail = { ...per, vlr_ressarcido: 50 };
    renderModal();
    await user.click(screen.getByText('open-clear'));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(mocks.clearMutate).toHaveBeenCalledWith({ nrPer: 'P1', userId: 'USER-1' });
    expect(screen.getByRole('heading', { name: 'Excluir ressarcimento' })).toBeInTheDocument();

    await (mocks.clearOptions?.onSuccess as () => Promise<void>)();
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: 'Excluir ressarcimento' }),
      ).not.toBeInTheDocument(),
    );
    expect(mocks.queryClient.refetchQueries).toHaveBeenCalledWith({
      queryKey: ['per-detail', 'P1'],
    });
  });

  it('reflete loading e desabilita ações dos diálogos durante pending', async () => {
    mocks.dcompsLoading = true;
    mocks.registerPending = true;
    mocks.clearPending = true;
    const user = userEvent.setup();
    renderModal();
    expect(screen.getByTestId('dcomp-loading')).toHaveTextContent('true');

    await user.click(screen.getByText('new-reimbursement'));
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    fireEvent.click(screen.getByText('open-clear'));
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Excluindo...' })).toBeDisabled();
  });

  it('encaminha situação escolhida e callbacks de sucesso/erro atualizam feedback', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByText('choose-situation'));
    await user.click(screen.getByText('save-situation'));
    expect(mocks.insertMutate).toHaveBeenCalledWith({ nr_proc_per: 'P1', situacao: 'Homologado' });

    act(() => {
      (mocks.insertOptions?.onSuccess as (data: unknown) => void)({ id: 'S1' });
    });
    expect(mocks.queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['per-situacoes', 'P1'],
    });
    expect(mocks.queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['per-situacoes'],
    });
    expect(mocks.toast.success).toHaveBeenCalledWith('Situação atualizada com sucesso!');
    expect(mocks.sync).toHaveBeenCalledWith({ per_situacao: [{ id: 'S1' }] });
    expect(mocks.queryClient.invalidateQueries.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.queryClient.invalidateQueries.mock.invocationCallOrder[1],
    );
    expect(mocks.queryClient.invalidateQueries.mock.invocationCallOrder[1]).toBeLessThan(
      mocks.toast.success.mock.invocationCallOrder[0],
    );
    expect(mocks.toast.success.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.sync.mock.invocationCallOrder[0],
    );
    expect(screen.getByTestId('situation-state')).toBeEmptyDOMElement();

    (mocks.insertOptions?.onError as (error: Error) => void)(new Error('indisponível'));
    expect(mocks.toast.error).toHaveBeenCalledWith('Erro ao atualizar situação: indisponível');
  });
});
