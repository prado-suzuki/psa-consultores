import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pessoaMutate: vi.fn(),
  parentescoUpsert: vi.fn(),
  parentescoMutate: vi.fn(),
  parentescoDelete: vi.fn(),
  adminMutate: vi.fn(),
  adminDelete: vi.fn(),
  parentescos: [] as Record<string, unknown>[],
  administradores: [] as Record<string, unknown>[],
  temDocumento: false,
  toast: { error: vi.fn(), warning: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));
vi.mock('@/hooks/useDocumentoGerado', () => ({
  useClienteTemDocumentoGerado: () => ({ data: mocks.temDocumento }),
}));
vi.mock('@/hooks/useQualificacaoDasPartes', () => ({
  useUpsertPessoa: () => ({ mutate: mocks.pessoaMutate, isPending: false }),
  // O modal grava o primeiro vínculo com `mutateAsync` (precisa esperar a pessoa
  // existir); a lista de vínculos grava com `mutate`, como Administradores.
  useUpsertParentesco: () => ({
    mutate: mocks.parentescoMutate, mutateAsync: mocks.parentescoUpsert, isPending: false,
  }),
  useDeleteParentesco: () => ({
    mutate: mocks.parentescoDelete, mutateAsync: mocks.parentescoDelete, isPending: false,
  }),
  useParentescosByCliente: () => ({ data: mocks.parentescos, isLoading: false }),
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

/**
 * Cenário próprio, diferente do caso do teste e2e (um casal só, PF-01/PF-02, com
 * no máximo um vínculo de filiação): um cliente com três casais, uma pessoa
 * solteira, e uma pessoa com pai, mãe e tio cadastrados. É esse elenco que
 * separa "funciona" de "funciona só para o caso testado".
 */
const helena = pessoa({ id: 'PF-HELENA', denominacao: 'Helena', estado_civil: 'Casado(a)' });
const ivo = pessoa({ id: 'PF-IVO', denominacao: 'Ivo', conjuge_id: 'PF-HELENA' });
const joana = pessoa({ id: 'PF-JOANA', denominacao: 'Joana', conjuge_id: 'PF-KLEBER' });
const kleber = pessoa({ id: 'PF-KLEBER', denominacao: 'Kleber', conjuge_id: 'PF-JOANA' });
const lucia = pessoa({ id: 'PF-LUCIA', denominacao: 'Lúcia' });
const pai = pessoa({ id: 'PF-PAI', denominacao: 'Joaquim Pai' });
const mae = pessoa({ id: 'PF-MAE', denominacao: 'Marta Mãe' });
const tio = pessoa({ id: 'PF-TIO', denominacao: 'Tobias Tio' });
const avo = pessoa({ id: 'PF-AVO', denominacao: 'Vera Avó' });

const vinculo = (id: string, parente: PessoaRow, tipo: string) => ({
  id,
  pessoa_id: helena.id,
  parente_pessoa_id: parente.id,
  parente_denominacao: parente.denominacao,
  pessoa_denominacao: helena.denominacao,
  tipo,
  natureza: 'Consanguíneo',
});

describe('PessoaModal - cônjuge recíproco e lista de parentesco', () => {
  it('oferece como cônjuge apenas quem está livre ou é o cônjuge da própria pessoa', async () => {
    const user = userEvent.setup();
    // Ivo já aponta Helena (vínculo gravado pela metade, o legado que o gatilho
    // do banco fecha); Joana e Kleber são um casal alheio e não podem ser opção.
    renderModal({ pessoa: helena, pessoasCliente: [helena, ivo, joana, kleber, lucia] });
    const trigger = screen.getByText('Cônjuge', { selector: 'label' }).parentElement!.querySelector('button')!;
    await user.click(trigger);
    expect((await screen.findAllByRole('option')).map((o) => o.textContent)).toEqual(['Ivo', 'Lúcia']);
    expect(screen.getByText(/2 pessoa\(s\) não aparecem/)).toBeInTheDocument();

    // Trocar o cônjuge é o caminho que libera Ivo: o espelho e a liberação do
    // vínculo anterior ficam com o gatilho `trg_pessoa_conjuge_reciproco`.
    await user.click(await screen.findByRole('option', { name: 'Lúcia' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(mocks.pessoaMutate.mock.calls[0][0].values).toMatchObject({ conjuge_id: 'PF-LUCIA' });
  });

  it('lista pai, mãe e tio da mesma pessoa e aceita mais um vínculo, sem limite de tipo', async () => {
    const user = userEvent.setup();
    mocks.parentescos = [
      vinculo('V-PAI', pai, 'Pai/Mãe'), vinculo('V-MAE', mae, 'Pai/Mãe'), vinculo('V-TIO', tio, 'Tio(a)'),
    ];
    renderModal({ pessoa: helena, pessoasCliente: [helena, pai, mae, tio, avo] });
    expect(screen.getByText('3 vínculo(s)')).toBeInTheDocument();
    for (const nome of ['Joaquim Pai', 'Marta Mãe', 'Tobias Tio']) {
      expect(screen.getByText(nome)).toBeInTheDocument();
    }

    await user.click(screen.getByRole('button', { name: 'Adicionar vínculo' }));
    await selectByLabel(/Parente/, 'Vera Avó');
    await selectByLabel('Tipo', 'Avô(ó)');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(mocks.parentescoMutate).toHaveBeenCalledWith({
      values: {
        pessoa_id: 'PF-HELENA', parente_pessoa_id: 'PF-AVO', tipo: 'Avô(ó)', natureza: null,
      },
      original: null,
      clienteId: 'C1',
    }, expect.any(Object));
    // Gravar vínculo não passa pelo "Salvar alterações" da pessoa.
    expect(mocks.pessoaMutate).not.toHaveBeenCalled();
  });

  it('sair do estado civil casado desfaz o vínculo, avisando de quem era', async () => {
    const helenaCasada = pessoa({
      id: 'PF-HELENA', denominacao: 'Helena', estado_civil: 'Casado(a)', conjuge_id: 'PF-IVO',
    });
    renderModal({ pessoa: helenaCasada, pessoasCliente: [helenaCasada, ivo, lucia] });
    expect(screen.getByText('Cônjuge', { selector: 'label' })).toBeInTheDocument();

    await selectByLabel('Estado civil', 'Viúvo(a)');
    expect(mocks.toast.warning).toHaveBeenCalledWith(expect.stringContaining('Ivo'));
    // O campo some junto, então deixar o ponteiro para trás travaria os dois
    // cadastros como casados sem nenhum caminho de tela para desfazer.
    expect(screen.queryByText('Cônjuge', { selector: 'label' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(mocks.pessoaMutate.mock.calls[0][0].values).toMatchObject({
      estado_civil: 'Viúvo(a)', conjuge_id: null,
    });
  });

  it('recusa vínculo repetido e remove um dos três sem tocar nos outros', async () => {
    const user = userEvent.setup();
    mocks.parentescos = [
      vinculo('V-PAI', pai, 'Pai/Mãe'), vinculo('V-MAE', mae, 'Pai/Mãe'), vinculo('V-TIO', tio, 'Tio(a)'),
    ];
    renderModal({ pessoa: helena, pessoasCliente: [helena, pai, mae, tio, avo] });

    await user.click(screen.getByRole('button', { name: 'Adicionar vínculo' }));
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(mocks.toast.error).toHaveBeenLastCalledWith('Selecione o parente');
    await selectByLabel(/Parente/, 'Tobias Tio');
    await selectByLabel('Tipo', 'Tio(a)');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(mocks.toast.error).toHaveBeenLastCalledWith('Este vínculo já está cadastrado para a mesma pessoa');
    expect(mocks.parentescoMutate).not.toHaveBeenCalled();

    // O mesmo parente com outro tipo continua permitido (multiparentalidade,
    // adoção, tutela: a tabela sempre admitiu, a tela é que não deixava).
    await selectByLabel('Tipo', 'Padrasto/Madrasta');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(mocks.parentescoMutate).toHaveBeenCalledOnce();

    const linhaDaMae = screen.getByText('Marta Mãe').closest('div.flex-1')!.parentElement!;
    await user.click(within(linhaDaMae).getAllByRole('button').at(-1)!);
    await user.click(await screen.findByRole('button', { name: 'Remover' }));
    expect(mocks.parentescoDelete).toHaveBeenCalledWith({
      row: expect.objectContaining({ id: 'V-MAE' }), clienteId: 'C1',
    });
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
    // Poderes: regra geral isolada, com um ato que exige as duas assinaturas e
    // outro em que ela age sozinha. O booleano antigo não descrevia nem o
    // primeiro; a observação recolhe o que a estrutura não prevê.
    await selectByLabel('Forma de assinatura', 'Isoladamente');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar exceção' }));
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar exceção' }));
    const excecoes = screen.getAllByPlaceholderText(/^Atos/);
    fireEvent.change(excecoes[0], { target: { value: '  atos da cláusula sexta  ' } });
    fireEvent.change(excecoes[1], { target: { value: 'movimentação bancária até R$ 50.000,00' } });
    await userEvent.click(screen.getByLabelText('Exigência da exceção 2'));
    await userEvent.click(await screen.findByRole('option', { name: 'Isoladamente' }));
    fireEvent.change(controlByLabel(/Observação sobre os poderes/, 'textarea'), {
      target: { value: 'Mandato por prazo indeterminado.' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    expect(mocks.adminMutate).toHaveBeenCalledWith({
      values: {
        pj_pessoa_id: 'PJ1', administrador_pessoa_id: 'PF-ADMIN', cargo: 'Diretor',
        pode_isoladamente: true,
        poderes: {
          forma: 'isolada',
          excecoes: [
            { atos: 'atos da cláusula sexta', exigencia: 'conjunta' },
            { atos: 'movimentação bancária até R$ 50.000,00', exigencia: 'isolada' },
          ],
          observacao: 'Mandato por prazo indeterminado.',
        },
        data_inicio: '2026-07-20', data_fim: '2026-07-21',
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
