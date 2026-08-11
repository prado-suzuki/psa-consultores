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
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
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

// Imóvel urbano com endereço e área construída preenchidos (migration 20260806120500).
const bemUrbanoEdit = {
  id: 'B2', cliente_id: 'C1', referencia_dp: 'IB-01', tipo_bem: 'IB', denominacao: 'Apartamento',
  descricao_outros: null, vlr_contabil: 90, vlr_contabil_ajustado: null, vlr_benfeitorias: null,
  vlr_mercado: null, vlr_imposto_anual: null, imposto_anual_exercicio: null,
  ccir_codigo: null, inscricao_municipal: '12345', status_integralizacao: null,
  empresa_destino_pessoa_id: null, participa_estruturacao: true,
  motivo_nao_integralizacao: null, observacao: null,
  endereco_logradouro: 'Avenida Central', endereco_numero: '119-A',
  endereco_complemento: 'Apartamento 302', endereco_bairro: 'Setor Oeste',
  endereco_cep: '74000-123', area_construida_m2: 87.5,
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

// Número + título de cada seção do formulário, na ordem em que estão no DOM.
// O número vem do contador da aba "Dados": uma seção escondida por tipo de bem
// não pode deixar buraco nem repetir número na sequência.
function sectionSequence() {
  return Array.from(document.querySelectorAll('section')).map((section) => {
    const numero = section.querySelector('span.tabular-nums')?.textContent ?? '';
    const titulo = section.querySelector('h4')?.textContent ?? '';
    return `${numero} ${titulo}`;
  });
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

    // B16: o aviso diz o que falta E onde, a aba abre e o foco para no campo.
    expect(mocks.toast.error).toHaveBeenCalledWith(
      'Selecione o titular inicial do bem, na aba Titularidade.',
    );
    expect(screen.getByRole('tab', { name: /Titularidade/ })).toHaveAttribute('data-state', 'active');
    await waitFor(() =>
      expect(
        screen.getByText('Titular').closest('[data-campo="titular_pessoa_id"]'),
      ).toContainElement(document.activeElement as HTMLElement),
    );
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

  it('grava endereço e área construída apenas quando o bem é imóvel urbano', async () => {
    const user = userEvent.setup();
    renderModal();
    // O tipo inicial é imóvel rural: o endereço urbano não aparece.
    expect(screen.queryByText('Logradouro')).not.toBeInTheDocument();
    await chooseCombobox(0, 'Imóvel Urbano');
    await user.type(inputAfter('Referência DP'), 'IB-01');
    await user.type(inputAfter('Denominação'), 'Apartamento');
    await user.type(inputAfter('CEP'), '74000123');
    await user.type(inputAfter('Logradouro'), 'Avenida Central');
    await user.type(inputAfter('Número'), '119-A');
    await user.type(inputAfter('Complemento'), 'Apartamento 302');
    await user.type(inputAfter('Bairro'), 'Setor Oeste');
    fireEvent.change(inputAfter('Área construída (m²)'), { target: { value: '87.5' } });
    await user.click(screen.getByRole('button', { name: 'Cadastrar bem' }));

    expect(mocks.upsert).toHaveBeenCalledOnce();
    expect(mocks.upsert.mock.calls[0][0].values).toMatchObject({
      tipo_bem: 'IB', endereco_cep: '74000-123', endereco_logradouro: 'Avenida Central',
      endereco_numero: '119-A', endereco_complemento: 'Apartamento 302',
      endereco_bairro: 'Setor Oeste', area_construida_m2: 87.5,
    });
  });

  it('numera as seções em sequência contínua para cada tipo de bem', async () => {
    renderModal();
    // Imóvel rural: sem a seção de endereço, que é só do urbano.
    expect(sectionSequence()).toEqual([
      '01 Identificação', '02 Cadastros oficiais', '03 Integralização',
      '04 Observação', '05 Matrículas',
    ]);

    await chooseCombobox(0, 'Imóvel Urbano');
    expect(sectionSequence()).toEqual([
      '01 Identificação', '02 Endereço e área construída', '03 Cadastros oficiais',
      '04 Integralização', '05 Observação', '06 Matrículas',
    ]);

    await chooseCombobox(0, 'Participação Societária');
    expect(sectionSequence()).toEqual([
      '01 Identificação', '02 Valores', '03 Integralização', '04 Observação',
    ]);
  });

  it('carrega o endereço urbano na edição e o limpa ao salvar como outro tipo', async () => {
    const user = userEvent.setup();
    renderModal({ bem: bemUrbanoEdit });
    expect(inputAfter('CEP')).toHaveValue('74000-123');
    expect(inputAfter('Logradouro')).toHaveValue('Avenida Central');
    expect(inputAfter('Número')).toHaveValue('119-A');
    expect(inputAfter('Complemento')).toHaveValue('Apartamento 302');
    expect(inputAfter('Bairro')).toHaveValue('Setor Oeste');
    expect(inputAfter('Área construída (m²)')).toHaveValue(87.5);

    await chooseCombobox(0, 'Participação Societária');
    expect(screen.queryByText('Logradouro')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(mocks.upsert.mock.calls[0][0].values).toMatchObject({
      tipo_bem: 'PS', endereco_cep: null, endereco_logradouro: null, endereco_numero: null,
      endereco_complemento: null, endereco_bairro: null, area_construida_m2: null,
    });
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
