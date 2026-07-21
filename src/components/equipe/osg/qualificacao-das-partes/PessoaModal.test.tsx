import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pessoaMutate: vi.fn(),
  parentescoUpsert: vi.fn(),
  parentescoDelete: vi.fn(),
  adminMutate: vi.fn(),
  adminDelete: vi.fn(),
  parentescos: [] as Record<string, unknown>[],
  administradores: [] as Record<string, unknown>[],
  temDocumento: false,
  toast: { error: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));
vi.mock('@/hooks/useDocumentoGerado', () => ({
  useClienteTemDocumentoGerado: () => ({ data: mocks.temDocumento }),
}));
vi.mock('@/hooks/useQualificacaoDasPartes', () => ({
  useUpsertPessoa: () => ({ mutate: mocks.pessoaMutate, isPending: false }),
  useUpsertParentesco: () => ({ mutateAsync: mocks.parentescoUpsert, isPending: false }),
  useDeleteParentesco: () => ({ mutateAsync: mocks.parentescoDelete, isPending: false }),
  useParentescosByCliente: () => ({ data: mocks.parentescos }),
  useAdministracaoByPj: () => ({ data: mocks.administradores, isLoading: false }),
  useUpsertAdministracao: () => ({ mutate: mocks.adminMutate, isPending: false }),
  useDeleteAdministracao: () => ({ mutate: mocks.adminDelete, isPending: false }),
}));
vi.mock('@/components/equipe/osg/documentos/DocumentosTab', () => ({
  DocumentosTab: ({ clienteId }: { clienteId: string }) => <div>Documentos de {clienteId}</div>,
}));
vi.mock('@/components/equipe/osg/HistoricoFlutuante', () => ({
  HistoricoFlutuante: () => <aside>Histórico da pessoa</aside>,
}));

import { PessoaModal } from './PessoaModal';
import type { PessoaRow, TipoPessoa } from '@/hooks/useQualificacaoDasPartes';

const pfFundador = pessoa({ id: 'PF-FUNDADOR', denominacao: 'Carlos Fundador', is_fundador: true });
const pfAdmin = pessoa({ id: 'PF-ADMIN', denominacao: 'Amanda Gestora' });

function pessoa(overrides: Partial<PessoaRow> = {}): PessoaRow {
  return {
    id: 'P1',
    cliente_id: 'C1',
    tipo_pessoa: 'PF',
    denominacao: 'Pessoa Existente',
    cpf_cnpj: '123.456.789-01',
    is_fundador: false,
    ...overrides,
  } as PessoaRow;
}

function renderModal(overrides: Partial<React.ComponentProps<typeof PessoaModal>> = {}) {
  const props = {
    open: true,
    clienteId: 'C1',
    pessoa: null,
    pessoasCliente: [pfFundador, pfAdmin],
    onClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<PessoaModal {...props} />), props };
}

function controlByLabel(label: RegExp | string, selector = 'input, textarea') {
  const labelNode = screen.getByText(label, { selector: 'label' });
  const control = labelNode.parentElement?.querySelector(selector);
  if (!control) throw new Error(`Controle não encontrado para ${String(label)}`);
  return control as HTMLInputElement;
}

async function selectByLabel(label: RegExp | string, option: string) {
  const user = userEvent.setup();
  const labelNode = screen.getByText(label, { selector: 'label' });
  const trigger = labelNode.parentElement?.querySelector('button');
  if (!trigger) throw new Error(`Select não encontrado para ${String(label)}`);
  await user.click(trigger);
  await user.click(await screen.findByRole('option', { name: option }));
}

function submitSuccess(rowId = 'P-SAVED') {
  const options = mocks.pessoaMutate.mock.calls.at(-1)?.[1] as
    | { onSuccess: (result: { row: PessoaRow }) => Promise<void> }
    | undefined;
  if (!options) throw new Error('Callback de sucesso não capturado');
  return options.onSuccess({ row: pessoa({ id: rowId }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.parentescos = [];
  mocks.administradores = [];
  mocks.temDocumento = false;
  mocks.parentescoUpsert.mockResolvedValue(undefined);
  mocks.parentescoDelete.mockResolvedValue(undefined);
});

beforeAll(() => {
  // APIs de ponteiro usadas pelo Radix Select e ausentes no jsdom.
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe('PessoaModal - matriz, drafts e persistência', () => {
  it.each([
    ['PF create', null, 'PF', false, false, false],
    ['PF edit', pessoa(), undefined, true, false, false],
    ['PJ create', null, 'PJ', true, true, true],
    ['PJ edit', pessoa({ tipo_pessoa: 'PJ' }), undefined, true, false, false],
  ] as const)(
    'preserva a matriz de tabs em %s',
    async (_case, editing, defaultTipo, hasTabs, adminDisabled, docsDisabled) => {
      renderModal({ pessoa: editing, defaultTipo: defaultTipo as TipoPessoa | undefined });

      expect(screen.getByRole('heading', { name: editing ? /Editar pessoa/ : /Nova pessoa/ })).toBeInTheDocument();
      const dados = screen.queryByRole('tab', { name: 'Dados' });
      expect(!!dados).toBe(hasTabs);
      const admin = screen.queryByRole('tab', { name: 'Administração' });
      expect(!!admin).toBe(defaultTipo === 'PJ' || editing?.tipo_pessoa === 'PJ');
      if (admin) expect(admin).toHaveProperty('disabled', adminDisabled);
      const docs = screen.queryByRole('tab', { name: 'Documentos' });
      expect(!!docs).toBe(hasTabs);
      if (docs) expect(docs).toHaveProperty('disabled', docsDisabled);
    },
  );

  it('edita PF, mantém o original e nullifica todos os campos exclusivos de PJ', async () => {
    const original = pessoa({
      denominacao: '  Maria da Silva  ',
      nacionalidade: 'Brasileira',
      nire: 'NIRE legado',
      junta_comercial_uf: 'SP',
      data_constituicao: '2001-02-03',
      objeto_social: 'Objeto legado',
      status_constituicao: 'Ativa',
      tipo_empresa: 'PR',
    });
    renderModal({ pessoa: original });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(mocks.pessoaMutate).toHaveBeenCalledWith(
      {
        values: expect.objectContaining({
          tipo_pessoa: 'PF',
          denominacao: 'Maria da Silva',
          nacionalidade: 'Brasileira',
          nire: null,
          junta_comercial_uf: null,
          data_constituicao: null,
          objeto_social: null,
          status_constituicao: null,
          tipo_empresa: null,
        }),
        original,
      },
      expect.any(Object),
    );
  });

  it('cria PJ, converte vazios em null e nullifica os campos exclusivos de PF', () => {
    renderModal({ defaultTipo: 'PJ' });
    fireEvent.change(controlByLabel(/Razão social/), { target: { value: '  Holding PSA  ' } });
    fireEvent.change(controlByLabel('NIRE'), { target: { value: '  12345  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar pessoa' }));

    const call = mocks.pessoaMutate.mock.calls[0][0];
    expect(call.original).toBeNull();
    expect(call.values).toMatchObject({
      cliente_id: 'C1',
      tipo_pessoa: 'PJ',
      denominacao: 'Holding PSA',
      cpf_cnpj: null,
      endereco_cep: null,
      genero: null,
      nacionalidade: null,
      filiacao_pai: null,
      filiacao_pai_pessoa_id: null,
      conjuge_id: null,
      is_fundador: false,
      nire: '  12345  ',
      objeto_social: null,
      tipo_empresa: null,
    });
  });

  it('filiação aceita texto livre, vincula uma PF sugerida e volta a desvincular ao digitar', async () => {
    const user = userEvent.setup();
    renderModal();
    fireEvent.change(controlByLabel(/Nome completo/), { target: { value: 'Filha' } });
    const pai = screen.getByPlaceholderText('Nome do pai');
    await user.type(pai, 'Carlos');
    await user.click(await screen.findByRole('button', { name: 'Carlos Fundador' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar pessoa' }));
    expect(mocks.pessoaMutate.mock.calls[0][0].values).toMatchObject({
      filiacao_pai: 'Carlos Fundador',
      filiacao_pai_pessoa_id: 'PF-FUNDADOR',
    });

    await user.type(pai, ' Filho');
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar pessoa' }));
    expect(mocks.pessoaMutate.mock.calls[1][0].values).toMatchObject({
      filiacao_pai: 'Carlos Fundador Filho',
      filiacao_pai_pessoa_id: null,
    });
  });

  it('reconcilia parentesco somente após sucesso da pessoa e fecha após a mutação separada', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.change(controlByLabel(/Nome completo/), { target: { value: 'Nova PF' } });
    await selectByLabel('Parente', 'Carlos Fundador');
    await selectByLabel('Tipo', 'Filho(a)');
    await selectByLabel('Natureza', 'Consanguíneo');
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar pessoa' }));

    expect(mocks.pessoaMutate).toHaveBeenCalledOnce();
    expect(mocks.parentescoUpsert).not.toHaveBeenCalled();
    await submitSuccess('PF-NOVA');
    expect(mocks.parentescoUpsert).toHaveBeenCalledWith({
      values: {
        pessoa_id: 'PF-NOVA',
        parente_pessoa_id: 'PF-FUNDADOR',
        tipo: 'Filho(a)',
        natureza: 'Consanguíneo',
      },
      original: null,
      clienteId: 'C1',
    });
    expect(mocks.pessoaMutate.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.parentescoUpsert.mock.invocationCallOrder[0],
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('carrega parentesco existente, mas preserva a ausência atual de affordance para removê-lo', async () => {
    const original = pessoa();
    const vinculo = {
      id: 'V1', pessoa_id: original.id, parente_pessoa_id: 'PF-FUNDADOR', tipo: 'Filho(a)', natureza: 'Civil',
    };
    mocks.parentescos = [vinculo];
    renderModal({ pessoa: original });
    await waitFor(() => expect(screen.getByText('Carlos Fundador')).toBeInTheDocument());
    const parenteLabel = screen.getByText('Parente', { selector: 'label' });
    const trigger = parenteLabel.parentElement!.querySelector('button')!;
    // O Select não oferece opção vazia nem outro controle para limpar o vínculo.
    expect(trigger).toHaveTextContent('Carlos Fundador');
    expect(mocks.parentescoDelete).not.toHaveBeenCalled();
  });

  it('valida textos obrigatórios e tamanho de CPF/CNPJ sem chamar persistência', () => {
    const pf = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar pessoa' }));
    expect(mocks.toast.error).toHaveBeenLastCalledWith('Nome completo é obrigatório');
    fireEvent.change(controlByLabel(/Nome completo/), { target: { value: 'Ana' } });
    fireEvent.change(controlByLabel('CPF'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar pessoa' }));
    expect(mocks.toast.error).toHaveBeenLastCalledWith('CPF deve ter 11 dígitos');
    pf.unmount();

    renderModal({ defaultTipo: 'PJ' });
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar pessoa' }));
    expect(mocks.toast.error).toHaveBeenLastCalledWith('Razão social é obrigatória');
    fireEvent.change(controlByLabel(/Razão social/), { target: { value: 'Empresa' } });
    fireEvent.change(controlByLabel('CNPJ'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar pessoa' }));
    expect(mocks.toast.error).toHaveBeenLastCalledWith('CNPJ deve ter 14 dígitos');
    expect(mocks.pessoaMutate).not.toHaveBeenCalled();
  });
});

describe('PessoaModal - fechamento sujo e administração imediata', () => {
  it('fecha limpo, mas exige confirmação para descartar alterações do draft', async () => {
    const clean = renderModal();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(clean.props.onClose).toHaveBeenCalledOnce();
    clean.unmount();

    const dirty = renderModal();
    fireEvent.change(controlByLabel(/Nome completo/), { target: { value: 'Rascunho' } });
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(dirty.props.onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Descartar alterações?');
    await userEvent.click(screen.getByRole('button', { name: 'Continuar editando' }));
    expect(dirty.props.onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Descartar e fechar' }));
    expect(dirty.props.onClose).toHaveBeenCalledOnce();
  });

  it('cria administrador imediatamente, valida datas e não aciona o save/dirty da pessoa', async () => {
    const onClose = vi.fn();
    renderModal({ pessoa: pessoa({ id: 'PJ1', tipo_pessoa: 'PJ', denominacao: 'Empresa' }), onClose });
    await userEvent.click(screen.getByRole('tab', { name: 'Administração' }));
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar administrador' }));
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(mocks.toast.error).toHaveBeenLastCalledWith('Selecione o administrador');
    await selectByLabel(/Administrador/, 'Amanda Gestora');
    fireEvent.change(controlByLabel('Data início'), { target: { value: '2026-07-20' } });
    fireEvent.change(controlByLabel('Data fim'), { target: { value: '2026-07-19' } });
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(mocks.toast.error).toHaveBeenLastCalledWith('Data fim deve ser igual ou posterior à data início');
    fireEvent.change(controlByLabel('Data fim'), { target: { value: '2026-07-21' } });
    await selectByLabel('Cargo', 'Diretor');
    await userEvent.click(screen.getByText('Pode assinar isoladamente'));
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    expect(mocks.adminMutate).toHaveBeenCalledWith({
      values: {
        pj_pessoa_id: 'PJ1', administrador_pessoa_id: 'PF-ADMIN', cargo: 'Diretor',
        pode_isoladamente: true, data_inicio: '2026-07-20', data_fim: '2026-07-21',
      },
      original: null,
      entityName: 'Amanda Gestora',
    }, expect.any(Object));
    expect(mocks.pessoaMutate).not.toHaveBeenCalled();
    await userEvent.click(screen.getAllByRole('button', { name: 'Cancelar' }).at(-1)!);
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByText('Descartar alterações?')).not.toBeInTheDocument();
  });

  it('edita e remove vínculo administrativo imediatamente', async () => {
    const admin = {
      id: 'A1', pj_pessoa_id: 'PJ1', administrador_pessoa_id: 'PF-ADMIN',
      administrador_denominacao: 'Amanda Gestora', cargo: 'Administrador',
      pode_isoladamente: false, data_inicio: '2026-01-02', data_fim: null,
    };
    mocks.administradores = [admin];
    renderModal({ pessoa: pessoa({ id: 'PJ1', tipo_pessoa: 'PJ', denominacao: 'Empresa' }) });
    await userEvent.click(screen.getByRole('tab', { name: 'Administração' }));
    const row = screen.getByText('Amanda Gestora').closest('div.flex-1')?.parentElement;
    const buttons = within(row as HTMLElement).getAllByRole('button');
    await userEvent.click(buttons[0]);
    await selectByLabel('Cargo', 'Presidente');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(mocks.adminMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({ cargo: 'Presidente' }),
        original: admin,
        entityName: 'Amanda Gestora',
      }),
      expect.any(Object),
    );

    await userEvent.click(buttons[1]);
    expect(await screen.findByText('Remover administrador?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remover' }));
    expect(mocks.adminDelete).toHaveBeenCalledWith({ row: admin, entityName: 'Amanda Gestora' });
    expect(mocks.pessoaMutate).not.toHaveBeenCalled();
  });
});
