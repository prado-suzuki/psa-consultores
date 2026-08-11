import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

Object.defineProperties(Element.prototype, {
  hasPointerCapture: { configurable: true, value: () => false },
  setPointerCapture: { configurable: true, value: () => undefined },
  releasePointerCapture: { configurable: true, value: () => undefined },
});

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(), upsertImpedimento: vi.fn(), deleteImpedimento: vi.fn(),
  impedimentos: [] as Record<string, unknown>[],
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
  titularPanelProps: undefined as Record<string, unknown> | undefined,
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));
vi.mock('@/contexts/OsgWorkContext', () => ({ useOsgWork: () => ({ clienteId: 'C1' }) }));
vi.mock('@/hooks/useDocumentoGerado', () => ({
  useClienteTemDocumentoGerado: () => ({ data: false }),
}));
vi.mock('@/hooks/useDiagnosticoPatrimonial', () => ({
  useUpsertMatricula: () => ({ mutate: mocks.upsert, isPending: false }),
  useImpedimentosByMatricula: () => ({ data: mocks.impedimentos, isLoading: false }),
  useUpsertImpedimento: () => ({ mutate: mocks.upsertImpedimento, isPending: false }),
  useDeleteImpedimento: () => ({ mutate: mocks.deleteImpedimento }),
  useTitularidadesByMatricula: () => ({ data: [] }),
}));
vi.mock('./CartorioSelect', () => ({
  CartorioSelect: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <select aria-label="Cartório" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Selecione</option><option value="CART1">Cartório Central</option>
    </select>
  ),
}));
vi.mock('./TitularidadesPanel', () => ({
  TitularidadesPanel: (props: Record<string, unknown>) => {
    mocks.titularPanelProps = props;
    return <div>painel-titularidades-imediato</div>;
  },
}));
vi.mock('@/components/equipe/osg/documentos/DocumentosTab', () => ({ DocumentosTab: () => null }));
vi.mock('@/components/equipe/osg/HistoricoFlutuante', () => ({ HistoricoFlutuante: () => null }));

import { MatriculaModal } from './MatriculaModal';

const pessoa = { id: 'P1', denominacao: 'Titular Um', tipo_pessoa: 'PF' };
const matriculaEdit = {
  id: 'M1', bem_id: 'B1', numero: '100', tipo_bem: 'IR', matricula_anterior_id: null,
  matricula_anterior_texto: null, livro: '2', folha: '3', data_matricula: null,
  cartorio_id: 'CART1', municipio_imovel: 'Goiânia', uf_imovel: 'GO', area_documento: 123,
  area_real: 120, area_explorada: 80, area_unidade: 'ha', georreferenciado: 'Sim',
  georref_prejudica_transferencia: true, tipo_exploracao_posse: null,
  descricao_psa_completa: null, confrontacoes_texto: null, origem_descricao: null,
  vlr_contabil: 1000, vlr_contabil_ajustado: null, vlr_benfeitorias: null,
  vlr_mercado: null, vlr_imposto_anual: null, imposto_anual_exercicio: null,
} as React.ComponentProps<typeof MatriculaModal>['matricula'];

function renderModal(overrides: Partial<React.ComponentProps<typeof MatriculaModal>> = {}) {
  const props = {
    open: true, bemId: 'B1', bemTipo: 'IR', matricula: null, pessoasCliente: [pessoa],
    matriculasDoBem: [], onClose: vi.fn(), ...overrides,
  } as React.ComponentProps<typeof MatriculaModal>;
  return { ...render(<MatriculaModal {...props} />), props };
}

function inputAfter(label: string) {
  return screen.getByText(label, { exact: true }).parentElement!.querySelector('input') as HTMLInputElement;
}

async function choose(index: number, option: string) {
  const user = userEvent.setup();
  await user.click(screen.getAllByRole('combobox')[index]);
  await user.click(await screen.findByRole('option', { name: new RegExp(option) }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.impedimentos = [];
  mocks.titularPanelProps = undefined;
});

describe('MatriculaModal', () => {
  it('cria matrícula e titular pela fronteira atômica, convertendo a área ao trocar a unidade', async () => {
    const user = userEvent.setup();
    const { props } = renderModal();
    await user.type(inputAfter('Nº da matrícula'), '  456  ');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Cartório' }), 'CART1');
    await user.type(inputAfter('Município'), '  Anápolis  ');
    await choose(2, 'GO');
    await user.type(inputAfter('Área documento'), '123');
    await choose(3, '^m²$');
    // Trocar de ha para m² converte de fato (1 ha = 10.000 m²) e avisa: a
    // quantidade representada não muda, o número muda porque a unidade mudou.
    expect(inputAfter('Área documento')).toHaveValue(1_230_000);
    expect(mocks.toast.info).toHaveBeenCalledWith(
      'Áreas convertidas de ha para m² — a quantidade não mudou.',
    );

    await user.click(screen.getByRole('tab', { name: /Titularidade/ }));
    expect(
      screen.getByText(
        /Toda matrícula precisa de ao menos um titular — é ele que define o cliente\./,
      ),
    ).toBeInTheDocument();
    await choose(0, 'Titular Um');
    await user.type(inputAfter('Fração (%) — opcional'), '40');
    await user.click(screen.getByRole('button', { name: 'Cadastrar matrícula' }));

    expect(mocks.upsert).toHaveBeenCalledOnce();
    const [payload, options] = mocks.upsert.mock.calls[0];
    expect(payload).toMatchObject({
      original: null,
      titular: { titular_pessoa_id: 'P1', tipo: 'DIREITO', fracao: 40 },
      values: {
        bem_id: 'B1', numero: '456', tipo_bem: 'IR', cartorio_id: 'CART1',
        municipio_imovel: 'Anápolis', uf_imovel: 'GO', area_documento: 1_230_000,
        area_unidade: 'm2',
      },
    });
    options.onSuccess();
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('valida titular e fração antes de chamar a RPC atômica', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.type(inputAfter('Nº da matrícula'), '456');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Cartório' }), 'CART1');
    await user.type(inputAfter('Município'), 'Anápolis');
    await choose(2, 'GO');
    await user.type(inputAfter('Área documento'), '10');
    await user.click(screen.getByRole('button', { name: 'Cadastrar matrícula' }));
    // B16: o aviso diz o que falta E onde, a aba abre e o foco para no campo.
    expect(mocks.toast.error).toHaveBeenCalledWith(
      'Selecione o titular inicial da matrícula, na aba Titularidade.',
    );
    expect(screen.getByRole('tab', { name: /Titularidade/ })).toHaveAttribute('data-state', 'active');
    await waitFor(() =>
      expect(
        screen.getByText('Titular').closest('[data-campo="titular_pessoa_id"]'),
      ).toContainElement(document.activeElement as HTMLElement),
    );
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('ao trocar matrícula rural para urbana limpa incompatibilidades no payload', async () => {
    const user = userEvent.setup();
    renderModal({ matricula: matriculaEdit });
    await choose(0, 'Imóvel Urbano');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        original: matriculaEdit,
        titular: undefined,
        values: expect.objectContaining({
          tipo_bem: 'IB', area_documento: 123, area_real: 120, area_explorada: null,
          georreferenciado: null, georref_prejudica_transferencia: null,
        }),
      }),
      expect.any(Object),
    );
  });

  it('usa o tipo do bem somente para limpar matrícula legada sem tipo, preservando tipo_bem nulo', async () => {
    const user = userEvent.setup();
    const matriculaLegada = { ...matriculaEdit, tipo_bem: null } as React.ComponentProps<
      typeof MatriculaModal
    >['matricula'];
    renderModal({ matricula: matriculaLegada, bemTipo: 'IB' });

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        original: matriculaLegada,
        values: expect.objectContaining({
          tipo_bem: null,
          area_explorada: null,
          georreferenciado: null,
          georref_prejudica_transferencia: null,
        }),
      }),
      expect.any(Object),
    );
  });

  it('expõe titularidades e cria/edita/remove impedimentos imediatamente', async () => {
    const user = userEvent.setup();
    const impedimento = {
      id: 'I1', matricula_id: 'M1', tipo: 'Penhora', referencia: 'R-1', descricao: 'Antiga',
      credor_pessoa_id: null, credor_nome: null, credor_denominacao: null,
      data_constituicao: null, data_validade: null, vlr: null, area_afetada: null,
      impede_transferencia: false, cancelado: false,
    };
    mocks.impedimentos = [impedimento];
    renderModal({ matricula: matriculaEdit });

    await user.click(screen.getByRole('tab', { name: 'Titularidade' }));
    expect(screen.getByText('painel-titularidades-imediato')).toBeInTheDocument();
    expect(mocks.titularPanelProps).toMatchObject({
      anchor: { kind: 'matricula', id: 'M1' }, requireAtLeastOne: true,
    });

    await user.click(screen.getByRole('tab', { name: 'Impedimentos' }));
    const row = screen.getByText('Penhora').closest('div.rounded-md') as HTMLElement;
    await user.click(within(row).getAllByRole('button')[0]);
    fireEvent.change(screen.getByDisplayValue('R-1'), { target: { value: ' R-2 ' } });
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(mocks.upsertImpedimento).toHaveBeenCalledWith(
      {
        // Caracterização: nullify só testa trim, mas preserva espaços no valor enviado.
        values: expect.objectContaining({ matricula_id: 'M1', tipo: 'Penhora', referencia: ' R-2 ' }),
        original: impedimento,
      },
      expect.any(Object),
    );
    mocks.upsertImpedimento.mock.calls[0][1].onSuccess();

    await user.click(await screen.findByRole('button', { name: /Adicionar impedimento/ }));
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(mocks.upsertImpedimento).toHaveBeenNthCalledWith(
      2,
      {
        values: expect.objectContaining({ matricula_id: 'M1', tipo: 'Hipoteca' }),
        original: null,
      },
      expect.any(Object),
    );

    await user.click(within(row).getAllByRole('button')[1]);
    await user.click(await screen.findByRole('button', { name: 'Remover' }));
    expect(mocks.deleteImpedimento).toHaveBeenCalledWith(impedimento);
  });

  it('mantém tabs de CRUD bloqueadas na criação e protege dirty close', async () => {
    const user = userEvent.setup();
    const { props } = renderModal();
    expect(screen.getByRole('tab', { name: 'Impedimentos' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Documentos' })).toBeDisabled();
    fireEvent.change(inputAfter('Nº da matrícula'), { target: { value: 'alterado' } });
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(props.onClose).not.toHaveBeenCalled();
    expect(await screen.findByText('Descartar alterações?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Descartar e fechar' }));
    await waitFor(() => expect(props.onClose).toHaveBeenCalledOnce());
  });
});
