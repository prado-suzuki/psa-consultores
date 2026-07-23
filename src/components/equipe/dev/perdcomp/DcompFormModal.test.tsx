import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { user: { id: 'U1' }, isAdmin: false, isLider: false, isSublider: false },
  restore: vi.fn(),
  clear: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
  sync: vi.fn(),
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  createOptions: undefined as Record<string, unknown> | undefined,
  updateOptions: undefined as Record<string, unknown> | undefined,
  createPending: false,
  updatePending: false,
  distribuicoes: [] as Record<string, unknown>[],
  dcomps: [] as Record<string, unknown>[],
  pers: [] as Record<string, unknown>[],
  grupos: [{ id: 'G1', sigla: 'IRPJ', denominacao: 'IRPJ' }] as Record<string, unknown>[],
  codigos: [] as Record<string, unknown>[],
  selic: { data: { fator: 0 }, error: null as Error | null, isLoading: false },
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/hooks/useDraftPersistence', () => ({
  useDraftPersistence: () => ({ restore: mocks.restore, clear: mocks.clear }),
}));
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return { ...actual, useQueryClient: () => mocks.queryClient };
});
vi.mock('sonner', () => ({ toast: mocks.toast }));
vi.mock('@/lib/selicCalculator', () => ({ isWithinGracePeriodAt: () => false }));
vi.mock('@/hooks/useSelicTaxaAt', () => ({ useSelicTaxaAt: () => mocks.selic }));
vi.mock('@/hooks/useCatalogoTributos', () => ({
  useGruposTributo: () => ({ data: mocks.grupos }),
  useCodigosReceita: () => ({ data: mocks.codigos }),
  findGrupoIdPorSiglaLegado: (sigla: string | null, grupos: Array<{ id: string; sigla: string }>) =>
    grupos.find((grupo) => grupo.sigla === sigla)?.id ?? null,
}));
vi.mock('@/hooks/useDcompFormPersistence', () => ({
  useDistribuicoesDcompForm: () => ({ data: mocks.distribuicoes }),
  useDcompsExistentesForm: () => ({ data: mocks.dcomps }),
  usePersDcompForm: () => ({ data: mocks.pers }),
  useCreateDcompForm: (options: Record<string, unknown>) => {
    mocks.createOptions = options;
    return { mutate: mocks.createMutate, isPending: mocks.createPending };
  },
  useUpdateDcompForm: (options: Record<string, unknown>) => {
    mocks.updateOptions = options;
    return { mutate: mocks.updateMutate, isPending: mocks.updatePending };
  },
  useSyncDcompForm: () => mocks.sync,
}));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
  }) =>
    open ? (
      <div>
        <button onClick={() => onOpenChange(false)}>dismiss-dialog</button>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
}));

import { DcompFormModal } from './DcompFormModal';

const validDraft = {
  nr_documento: '12345',
  nr_per_orig: 'P-DRAFT',
  mes_ano_exercicio: '2025-01',
  dt_envio: '2026-07-17',
  vlr_compensado: 10,
  nr_dcomp_ret: null,
  distribuicoes: [
    { grupo_tributo_id: 'G1', codigo_receita_id: null, valor_tributo: 10, competencia: '2026-07' },
  ],
};

const editData = {
  nr_documento: 'D-EDIT',
  nr_per_orig: 'P1',
  mes_ano_exercicio: '2026-06-01',
  dt_envio: '2026-06-20',
  vlr_compensado: 10,
  nr_dcomp_ret: null,
  imposto: null,
} as React.ComponentProps<typeof DcompFormModal>['editData'];

function renderModal(overrides: Partial<React.ComponentProps<typeof DcompFormModal>> = {}) {
  const props = { open: true, onOpenChange: vi.fn(), preSelectedPer: 'P1', ...overrides };
  return { ...render(<DcompFormModal {...props} />), props };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.restore.mockReturnValue(null);
  mocks.auth.user = { id: 'U1' };
  mocks.auth.isAdmin = false;
  mocks.auth.isLider = false;
  mocks.auth.isSublider = false;
  mocks.createPending = false;
  mocks.updatePending = false;
  mocks.distribuicoes = [];
  mocks.dcomps = [];
  mocks.pers = [];
  mocks.grupos = [{ id: 'G1', sigla: 'IRPJ', denominacao: 'IRPJ' }];
  mocks.codigos = [];
  mocks.selic = { data: { fator: 0 }, error: null, isLoading: false };
  mocks.createOptions = undefined;
  mocks.updateOptions = undefined;
});

describe('DcompFormModal', () => {
  it('restaura o rascunho e dá precedência ao PER pré-selecionado no payload', async () => {
    mocks.restore.mockReturnValue(validDraft);
    const user = userEvent.setup();
    renderModal({ preSelectedPer: 'P-PRE' });

    expect(await screen.findByDisplayValue('12345')).toBeInTheDocument();
    expect(screen.getByLabelText(/Valor Compensado/)).toHaveValue('R$ 10,00');
    expect(screen.getByDisplayValue('07/2026')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(mocks.createMutate).toHaveBeenCalledOnce());
    expect(mocks.createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nr_documento: '12345',
          nr_per_orig: 'P-PRE',
          mes_ano_exercicio: '2026-07',
        }),
        distribuicoes: validDraft.distribuicoes,
        isEditing: false,
      }),
    );
  });

  it('usa os filhos extraídos reais para adicionar/remover rateio e refletir validação', async () => {
    const user = userEvent.setup();
    renderModal();
    expect(screen.getByText('Adicione ao menos um tributo rateado.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Adicionar Tributo/ }));
    expect(screen.getByText('Há linhas sem Grupo de Tributo selecionado')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('MM/AAAA')).toBeInTheDocument();
    const rateioPanel = screen
      .getByText('Grupo de Tributo')
      .closest('div[class*="space-y-2"]') as HTMLElement;
    const iconButtons = within(rateioPanel).getAllByRole('button');
    await user.click(iconButtons.at(-1)!);
    expect(screen.getByText('Nenhum tributo adicionado.')).toBeInTheDocument();
  });

  it('limpa rascunho em cancelar e dismiss, mas apenas comunica o fechamento solicitado', async () => {
    const user = userEvent.setup();
    const first = renderModal();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(mocks.clear).toHaveBeenCalledOnce();
    expect(first.props.onOpenChange).toHaveBeenCalledWith(false);

    first.unmount();
    vi.clearAllMocks();
    const second = renderModal();
    await user.click(screen.getByRole('button', { name: 'dismiss-dialog' }));
    expect(mocks.clear).toHaveBeenCalledOnce();
    expect(second.props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('em edição sem papel mostra modo somente leitura e impede submit pelos controles reais', async () => {
    mocks.distribuicoes = [
      {
        id: 'L1',
        _legacyTributo: 'IRPJ',
        grupo_tributo_id: 'G1',
        codigo_receita_id: null,
        valor_tributo: 10,
        competencia: '2026-06',
        valor_original: 10,
      },
    ];
    renderModal({ editData });

    expect(
      await screen.findByText('Você não tem permissão para editar este DCOMP'),
    ).toBeInTheDocument();
    expect(screen.getByRole('group')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    expect(screen.getByDisplayValue('D-EDIT')).toBeDisabled();
    fireEvent.submit(screen.getByRole('button', { name: 'Salvar' }).closest('form')!);
    expect(mocks.updateMutate).not.toHaveBeenCalled();
  });

  it('desabilita por pending e por SELIC indisponível, mas não apenas durante loading SELIC', async () => {
    mocks.restore.mockReturnValue(validDraft);
    mocks.createPending = true;
    const pending = renderModal();
    expect(await screen.findByRole('button', { name: 'Criar' })).toBeDisabled();
    pending.unmount();

    mocks.createPending = false;
    mocks.pers = [
      {
        nr_per: 'P1',
        dt_solicitada: '2025-01-01',
        tp_credito: '',
        tri_exercicio: null,
        exercicio: 2025,
        porcentagem_psa: 0,
      },
    ];
    mocks.selic = { data: undefined as never, error: new Error('API'), isLoading: false };
    const unavailable = renderModal();
    const disabled = await screen.findByRole('button', { name: 'Criar' });
    expect(disabled).toBeDisabled();
    expect(disabled).toHaveAttribute('title', expect.stringContaining('Fator SELIC indisponível'));
    unavailable.unmount();

    mocks.selic = { data: undefined as never, error: null, isLoading: true };
    renderModal();
    expect(await screen.findByRole('button', { name: 'Criar' })).toBeEnabled();
  });

  it('no sucesso invalida seis famílias, mostra toast, limpa e fecha antes de sincronizar', async () => {
    const onOpenChange = vi.fn();
    renderModal({ onOpenChange });
    const record = { nr_documento: 'D1', nr_per_orig: 'P1' };
    act(() => {
      (mocks.createOptions?.onSuccess as (record: unknown) => void)(record);
    });

    expect(mocks.queryClient.invalidateQueries.mock.calls).toEqual([
      [{ queryKey: ['perdcomp-dcomp'] }],
      [{ queryKey: ['per-dcomps'] }],
      [{ queryKey: ['dcomps-existentes'] }],
      [{ queryKey: ['dcomp-distribuicoes'] }],
      [{ queryKey: ['per-detail'] }],
      [{ queryKey: ['per-situacoes'] }],
    ]);
    expect(mocks.toast.success).toHaveBeenCalledWith('DCOMP criado com sucesso!');
    expect(mocks.clear).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mocks.sync).toHaveBeenCalledWith(record);
    expect(onOpenChange.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.sync.mock.invocationCallOrder[0],
    );
  });

  it('aplica callbacks de update e mensagens de erro específicas sem fechar ou sincronizar', () => {
    mocks.auth.isLider = true;
    renderModal({ editData });
    const updated = { nr_documento: 'D-EDIT' };
    act(() => (mocks.updateOptions?.onSuccess as (record: unknown) => void)(updated));
    expect(mocks.toast.success).toHaveBeenCalledWith('DCOMP atualizado com sucesso!');
    expect(mocks.sync).toHaveBeenCalledWith(updated);

    vi.clearAllMocks();
    const duplicate = Object.assign(new Error('backend'), { code: '23505' });
    (mocks.createOptions?.onError as (error: Error) => void)(duplicate);
    expect(mocks.toast.error).toHaveBeenCalledWith(
      'Erro ao criar DCOMP: Já existe um DCOMP com este número. Verifique e tente novamente.',
    );
    (mocks.updateOptions?.onError as (error: Error) => void)(new Error('falhou'));
    expect(mocks.toast.error).toHaveBeenCalledWith('Erro ao atualizar DCOMP: falhou');
    expect(mocks.clear).not.toHaveBeenCalled();
    expect(mocks.sync).not.toHaveBeenCalled();
  });
});
