import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

Object.defineProperties(Element.prototype, {
  hasPointerCapture: { configurable: true, value: () => false },
  setPointerCapture: { configurable: true, value: () => undefined },
  releasePointerCapture: { configurable: true, value: () => undefined },
});

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  deleteMatricula: vi.fn(),
  setMatriculaBem: vi.fn(),
  matriculas: [] as Record<string, unknown>[],
  toast: { error: vi.fn(), success: vi.fn() },
  matriculaModalProps: undefined as Record<string, unknown> | undefined,
  titularPanelProps: undefined as Record<string, unknown> | undefined,
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));
vi.mock('@/hooks/useDocumentoGerado', () => ({
  useClienteTemDocumentoGerado: () => ({ data: false }),
}));
vi.mock('@/hooks/useDiagnosticoPatrimonial', () => ({
  TIPO_BEM_OPTIONS: [
    { value: 'IR', label: 'Imóvel Rural' },
    { value: 'IB', label: 'Imóvel Urbano' },
    { value: 'PS', label: 'Participação Societária' },
    { value: 'OU', label: 'Outros' },
  ],
  useUpsertBem: () => ({ mutate: mocks.upsert, isPending: false }),
  useMatriculasByBem: () => ({ data: mocks.matriculas, isLoading: false }),
  useDeleteMatricula: () => ({ mutate: mocks.deleteMatricula }),
  useSetMatriculaBem: () => ({ mutate: mocks.setMatriculaBem }),
}));
vi.mock('./MatriculaModal', () => ({
  MatriculaModal: (props: Record<string, unknown>) => {
    mocks.matriculaModalProps = props;
    return props.open ? <div>modal-filho-matricula</div> : null;
  },
}));
vi.mock('./TitularidadesPanel', () => ({
  TitularidadesPanel: (props: Record<string, unknown>) => {
    mocks.titularPanelProps = props;
    return <div>painel-titularidades-imediato</div>;
  },
}));
vi.mock('./VincularMatriculaDialog', () => ({ VincularMatriculaDialog: () => null }));
vi.mock('@/components/equipe/osg/documentos/DocumentosTab', () => ({
  DocumentosTab: () => <div>documentos</div>,
}));
vi.mock('@/components/equipe/osg/HistoricoFlutuante', () => ({ HistoricoFlutuante: () => null }));

import { BemModal } from './BemModal';

const pessoa = { id: 'P1', denominacao: 'Titular Um', tipo_pessoa: 'PF' };
const matricula = {
  id: 'M1', numero: '123', municipio_imovel: 'Goiânia', uf_imovel: 'GO', area_documento: 10,
  area_real: null, area_unidade: 'ha', georreferenciado: null, bem_id: 'B1',
};
const bemEdit = {
  id: 'B1', cliente_id: 'C1', referencia_dp: 'IR-01', tipo_bem: 'IR', denominacao: 'Fazenda',
  descricao_outros: null, vlr_contabil: 90, vlr_contabil_ajustado: 20, vlr_benfeitorias: 30,
  vlr_mercado: 40, vlr_imposto_anual: 50, imposto_anual_exercicio: 2025,
  ccir_codigo: 'CCIR', inscricao_municipal: null, status_integralizacao: null,
  empresa_destino_pessoa_id: null, participa_estruturacao: true,
  motivo_nao_integralizacao: null, observacao: null,
} as React.ComponentProps<typeof BemModal>['bem'];

function renderModal(overrides: Partial<React.ComponentProps<typeof BemModal>> = {}) {
  const props = {
    open: true, clienteId: 'C1', bem: null, pessoasCliente: [pessoa], onClose: vi.fn(), ...overrides,
  } as React.ComponentProps<typeof BemModal>;
  return { ...render(<BemModal {...props} />), props };
}

function inputAfter(label: string) {
  return screen.getByText(label, { exact: true }).parentElement!.querySelector('input') as HTMLInputElement;
}

async function chooseCombobox(index: number, option: string) {
  const user = userEvent.setup();
  await user.click(screen.getAllByRole('combobox')[index]);
  await user.click(await screen.findByRole('option', { name: new RegExp(option) }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.matriculas = [];
  mocks.matriculaModalProps = undefined;
  mocks.titularPanelProps = undefined;
});

describe('BemModal', () => {
  it('cria bem sem matrícula com titular inicial no mesmo payload atômico', async () => {
    const user = userEvent.setup();
    const { props } = renderModal();
    await chooseCombobox(0, 'Participação Societária');
    await user.type(inputAfter('Referência DP'), '  PS-01  ');
    await user.type(inputAfter('Denominação'), '  Quotas Alfa  ');
    await user.type(inputAfter('Vlr. contábil'), '1250');
    await user.click(screen.getByRole('tab', { name: /Titularidade/ }));
    expect(
      screen.getByText(/Todo bem sem matrícula precisa de ao menos um titular\./),
    ).toBeInTheDocument();
    await chooseCombobox(0, 'Titular Um');
    await user.type(inputAfter('Fração (%) — opcional'), '60');
    await user.click(screen.getByRole('button', { name: 'Cadastrar bem' }));

    expect(mocks.upsert).toHaveBeenCalledOnce();
    const [payload, options] = mocks.upsert.mock.calls[0];
    expect(payload).toMatchObject({
      original: null,
      titular: { titular_pessoa_id: 'P1', tipo: 'DIREITO', fracao: 60 },
      values: {
        cliente_id: 'C1', referencia_dp: 'PS-01', tipo_bem: 'PS', denominacao: 'Quotas Alfa',
        // CurrencyInput interpreta a sequência digitada como centavos (12,50).
        vlr_contabil: 12.5, descricao_outros: null, ccir_codigo: null,
        inscricao_municipal: null,
      },
    });
    expect(props.onClose).not.toHaveBeenCalled();
    options.onSuccess();
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('valida o titular inicial e leva o usuário para a aba correta antes da RPC', async () => {
    const user = userEvent.setup();
    renderModal();
    await chooseCombobox(0, 'Participação Societária');
    await user.type(inputAfter('Referência DP'), 'PS-01');
    await user.type(inputAfter('Denominação'), 'Quotas');
    await user.type(inputAfter('Vlr. contábil'), '10');
    await user.click(screen.getByRole('button', { name: 'Cadastrar bem' }));

    expect(mocks.toast.error).toHaveBeenCalledWith('Selecione o titular inicial do bem');
    expect(screen.getByRole('tab', { name: /Titularidade/ })).toHaveAttribute('data-state', 'active');
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('na edição limpa campos incompatíveis de imóvel ao salvar como outro tipo', async () => {
    const user = userEvent.setup();
    renderModal({ bem: bemEdit });
    await chooseCombobox(0, 'Participação Societária');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        original: bemEdit,
        titular: undefined,
        values: expect.objectContaining({
          tipo_bem: 'PS', vlr_contabil: 90, vlr_contabil_ajustado: 20,
          vlr_benfeitorias: 30, vlr_mercado: 40, vlr_imposto_anual: 50,
          imposto_anual_exercicio: 2025, ccir_codigo: null, inscricao_municipal: null,
        }),
      }),
      expect.any(Object),
    );
  });

  it('mantém matrícula e titularidades como CRUDs imediatos na edição', async () => {
    const user = userEvent.setup();
    mocks.matriculas = [matricula];
    renderModal({ bem: bemEdit });

    await user.click(screen.getByRole('button', { name: 'Nova matrícula' }));
    expect(screen.getByText('modal-filho-matricula')).toBeInTheDocument();
    expect(mocks.matriculaModalProps).toMatchObject({ bemId: 'B1', matricula: null });
    (mocks.matriculaModalProps!.onClose as () => void)();

    const card = screen.getByText('Mat. 123').closest('div.rounded-md') as HTMLElement;
    await user.click(within(card).getAllByRole('button')[0]);
    expect(mocks.matriculaModalProps).toMatchObject({ bemId: 'B1', matricula });
    (mocks.matriculaModalProps!.onClose as () => void)();

    await user.click(within(card).getByRole('button', { name: 'Desvincular do bem' }));
    await user.click(await screen.findByRole('button', { name: 'Desvincular' }));
    expect(mocks.setMatriculaBem).toHaveBeenCalledWith({ matricula, bemId: null });

    await user.click(within(card).getAllByRole('button')[2]);
    await user.click(await screen.findByRole('button', { name: 'Remover' }));
    expect(mocks.deleteMatricula).toHaveBeenCalledWith(matricula);

    await user.click(screen.getByRole('tab', { name: 'Dados' }));
    await chooseCombobox(0, 'Participação Societária');
    await user.click(screen.getByRole('tab', { name: /Titularidade/ }));
    expect(screen.getByText('painel-titularidades-imediato')).toBeInTheDocument();
    expect(mocks.titularPanelProps).toMatchObject({
      anchor: { kind: 'bem', id: 'B1' }, requireAtLeastOne: true,
    });
  });

  it('fecha direto quando limpo e exige confirmação quando o draft está dirty', async () => {
    const user = userEvent.setup();
    const clean = renderModal();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(clean.props.onClose).toHaveBeenCalledOnce();
    clean.unmount();

    const dirty = renderModal();
    fireEvent.change(inputAfter('Referência DP'), { target: { value: 'alterado' } });
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(dirty.props.onClose).not.toHaveBeenCalled();
    expect(await screen.findByText('Descartar alterações?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Descartar e fechar' }));
    await waitFor(() => expect(dirty.props.onClose).toHaveBeenCalledOnce());
  });
});
