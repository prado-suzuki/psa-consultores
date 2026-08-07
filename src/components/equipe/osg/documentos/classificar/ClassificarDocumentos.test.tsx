import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pessoaMutate: vi.fn(),
  parentescoUpsert: vi.fn(),
  bemMutate: vi.fn(),
  matriculaMutate: vi.fn(),
  atualizarMutate: vi.fn(),
  baixarMutate: vi.fn(),
  pedirUrl: vi.fn(),
  pessoas: [] as Record<string, unknown>[],
  catalogo: [] as Record<string, unknown>[],
  itensPedidos: [] as Record<string, unknown>[],
  avulsoPorItem: {} as Record<string, string>,
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));
// Os hooks de parentesco/documento gerado entram por causa do popout: a ficha
// expandida É o PessoaModal de verdade, montado (fechado) ao lado da coluna.
vi.mock('@/hooks/useQualificacaoDasPartes', () => ({
  usePessoasByCliente: () => ({ data: mocks.pessoas }),
  useUpsertPessoa: () => ({ mutate: mocks.pessoaMutate, isPending: false }),
  useUpsertParentesco: () => ({ mutateAsync: mocks.parentescoUpsert, isPending: false }),
  useDeleteParentesco: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useParentescosByCliente: () => ({ data: [] }),
}));
vi.mock('@/hooks/useDocumentoGerado', () => ({
  useClienteTemDocumentoGerado: () => ({ data: false }),
}));
vi.mock('@/hooks/useDiagnosticoPatrimonial', () => ({
  useBensByCliente: () => ({ data: [] }),
  useAllMatriculas: () => ({ data: [] }),
  useUpsertBem: () => ({ mutate: mocks.bemMutate, isPending: false }),
  useUpsertMatricula: () => ({ mutate: mocks.matriculaMutate, isPending: false }),
}));
vi.mock('@/hooks/useDocumentoArquivo', () => ({
  useAtualizarDocumento: () => ({ mutate: mocks.atualizarMutate, isPending: false }),
  useBaixarDocumento: () => ({ mutate: mocks.baixarMutate }),
  usePreviewUrl: () => ({ mutate: mocks.pedirUrl, isPending: false }),
}));
// O catálogo de tipos alimenta o modal de classificação que abre antes de gravar.
vi.mock('@/hooks/useOsgChecklist', () => ({
  useChecklistPadrao: () => ({ data: mocks.catalogo, isLoading: false }),
  useTiposAvulsosDoCliente: () => ({ data: mocks.avulsoPorItem }),
}));
// O recorte de tipos vem da SOLICITAÇÃO, não do catálogo: é o que foi pedido a
// este cliente, e é o único caminho por onde um documento avulso aparece.
vi.mock('@/hooks/useDomainSolicitacao', () => ({
  useDomainSolicitacao: () => ({ solicitacao: { itens: mocks.itensPedidos } }),
}));
// Formulários de bem/matrícula: pesados (cartório, titularidades) e cobertos pelos
// testes dos próprios modais. Aqui interessa o fluxo balde → cadastro → vínculo.
vi.mock('@/components/equipe/osg/documentos/classificar/FichaFormularios', () => ({
  FormBem: () => <div>Formulário de bem</div>,
  FormMatricula: () => <div>Formulário de matrícula</div>,
}));

import { ClassificarDocumentos } from './ClassificarDocumentos';
import type { DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';

const doc = (id: string, extra: Partial<DocumentoArquivoRow> = {}): DocumentoArquivoRow =>
  ({
    id,
    cliente_id: 'C1',
    nome_original: `${id}.pdf`,
    categoria: 'pessoais',
    mime: 'application/pdf',
    tamanho: 1024,
    created_at: '2026-07-20T10:00:00Z',
    gcs_uri: 'gs://fake/x',
    pessoa_id: null,
    bem_id: null,
    matricula_id: null,
    triado_em: null,
    ...extra,
  }) as DocumentoArquivoRow;

const SEM_DONO = doc('cpf-maria');
const JA_VINCULADO = doc('contrato-social', { pessoa_id: 'P9' });

function renderClassificar(overrides: Partial<React.ComponentProps<typeof ClassificarDocumentos>> = {}) {
  const props = {
    clienteId: 'C1',
    docs: [SEM_DONO, JA_VINCULADO],
    carregando: false,
    ...overrides,
  };
  return { ...render(<ClassificarDocumentos {...props} />), props };
}

const preencher = (label: RegExp | string, valor: string) => {
  const rotulo = screen.getByText(label, { selector: 'label' });
  const campo = rotulo.parentElement?.querySelector('input');
  if (!campo) throw new Error(`Campo não encontrado: ${String(label)}`);
  fireEvent.change(campo, { target: { value: valor } });
};

const CATALOGO = [
  { id: 'T-CPF', documento: 'CPF', entidade: 'Pessoa Física', granularidade: 'pessoa_pf', ordem: 2, ativo: true },
  { id: 'T-RG', documento: 'RG / CNH', entidade: 'Pessoa Física', granularidade: 'pessoa_pf', ordem: 4, ativo: true },
  {
    id: 'T-CNPJ', documento: 'CNPJ', entidade: 'Pessoa Jurídica',
    granularidade: 'pessoa_pj', ordem: 15, ativo: true,
  },
];

/** O que a solicitação deste cliente pediu. Recorta a lista de tipos do modal. */
const PEDIDOS = [
  { id: 'i1', itemPadraoId: 'T-CPF', granularidade: 'pessoa_pf', status: 'ativo', documento: 'CPF', entidade: 'Pessoa Física', ordem: 2 },
  { id: 'i2', itemPadraoId: 'T-RG', granularidade: 'pessoa_pf', status: 'ativo', documento: 'RG / CNH', entidade: 'Pessoa Física', ordem: 4 },
  // Pedido à mão: o tipo dele está fora do catálogo (migration 20260807150000).
  { id: 'item-avulso', itemPadraoId: null, granularidade: 'pessoa_pf', status: 'ativo', documento: 'Escritura da Fazenda São João', entidade: '', ordem: 9 },
  // Dispensado pelo analista: não é mais esperado, não pode virar opção.
  { id: 'i4', itemPadraoId: 'T-DIRPF', granularidade: 'pessoa_pf', status: 'dispensado', documento: 'DIRPF', entidade: 'Pessoa Física', ordem: 3 },
  { id: 'i5', itemPadraoId: 'T-CNPJ', granularidade: 'pessoa_pj', status: 'ativo', documento: 'CNPJ', entidade: 'Pessoa Jurídica', ordem: 15 },
];

/** O modal de classificação que abre entre o botão da ficha e a gravação. */
const modal = () => screen.getByRole('dialog');

/** Escolhe o tipo de um arquivo no modal. Sem isto, ele fica sem classificação. */
const classificar = async (
  user: ReturnType<typeof userEvent.setup>,
  arquivo: string,
  tipo: string,
) => {
  await user.click(within(modal()).getByLabelText(`Tipo de ${arquivo}`));
  await user.click(await screen.findByRole('option', { name: tipo }));
};

const confirmar = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(within(modal()).getByRole('button', { name: /vincular \d+ arquivo/i }));

/** Dispara o onSuccess que o componente passou para a mutation de cadastro. */
const concluirCadastro = async (mutate: typeof mocks.pessoaMutate, row: Record<string, unknown>) => {
  const opcoes = mutate.mock.calls.at(-1)?.[1] as { onSuccess: (r: { row: unknown }) => Promise<void> | void };
  if (!opcoes) throw new Error('Callback de sucesso não capturado');
  await opcoes.onSuccess({ row });
};

beforeAll(() => {
  // APIs de ponteiro que o Radix usa e o jsdom não tem.
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pessoas = [{ id: 'P9', denominacao: 'Antônio Lima', tipo_pessoa: 'PF', is_fundador: true }] as unknown as PessoaRow[];
  mocks.catalogo = CATALOGO;
  mocks.itensPedidos = PEDIDOS;
  mocks.avulsoPorItem = { 'item-avulso': 'T-AVULSO' };
  mocks.parentescoUpsert.mockResolvedValue(undefined);
  // A assinatura da URL resolve na hora, para dar para testar o cache do preview.
  mocks.pedirUrl.mockImplementation((doc: { id: string }, opcoes?: { onSuccess?: (u: string) => void }) =>
    opcoes?.onSuccess?.(`https://assinada/${doc.id}`));
});

describe('modo Classificar — o balde', () => {
  it('só traz arquivo sem dono, e abre o primeiro deles', () => {
    renderClassificar();
    expect(screen.getByRole('button', { name: /cpf-maria\.pdf/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /contrato-social\.pdf/ })).not.toBeInTheDocument();
    // o arquivo aberto vai para o visualizador central
    expect(screen.getByRole('heading', { name: 'cpf-maria.pdf' })).toBeInTheDocument();
    expect(screen.getByText('1 arquivo sem dono')).toBeInTheDocument();
  });

  // A marca é gravada no banco (BER-39/BER-40), então o teste checa o update, e
  // não mais uma lista em memória da tela. O patch tem de zerar os três donos
  // junto com a marca: a constraint documento_arquivo_um_dono_apenas recusa a
  // marca convivendo com um dono.
  it('a válvula "não é de ninguém" grava a marca e zera os donos', async () => {
    const user = userEvent.setup();
    renderClassificar();
    await user.click(screen.getByRole('button', { name: /Não é de ninguém/ }));

    expect(mocks.atualizarMutate).toHaveBeenCalledTimes(1);
    const [args] = mocks.atualizarMutate.mock.calls[0];
    expect(args.id).toBe('cpf-maria');
    expect(args.patch.pessoa_id).toBeNull();
    expect(args.patch.bem_id).toBeNull();
    expect(args.patch.matricula_id).toBeNull();
    expect(typeof args.patch.triado_em).toBe('string');
  });

  it('arquivo já marcado como do cliente não volta a aparecer no balde', () => {
    renderClassificar({ docs: [doc('cpf-maria', { triado_em: '2026-08-05T10:00:00Z' }), JA_VINCULADO] });
    expect(screen.queryByRole('button', { name: /cpf-maria\.pdf/ })).not.toBeInTheDocument();
    expect(screen.getByText('0 arquivos sem dono')).toBeInTheDocument();
    expect(screen.getByText(/O balde está vazio/)).toBeInTheDocument();
  });
});

describe('modo Classificar — cadastrar a partir do arquivo', () => {
  it('cria a pessoa e vincula o arquivo aberto a ela (1:1)', async () => {
    const user = userEvent.setup();
    renderClassificar();
    preencher(/Nome completo/, 'Maria Aparecida Ferreira Lima');
    await user.click(screen.getByRole('button', { name: /Cadastrar e vincular/ }));

    // O botão da ficha abre o modal de classificação; nada foi criado ainda.
    expect(mocks.pessoaMutate).not.toHaveBeenCalled();
    await confirmar(user);

    expect(mocks.pessoaMutate).toHaveBeenCalledWith(
      {
        values: expect.objectContaining({
          cliente_id: 'C1',
          tipo_pessoa: 'PF',
          denominacao: 'Maria Aparecida Ferreira Lima',
        }),
      },
      expect.any(Object),
    );
    expect(mocks.atualizarMutate).not.toHaveBeenCalled();

    await concluirCadastro(mocks.pessoaMutate, { id: 'P-NOVA', tipo_pessoa: 'PF', denominacao: 'Maria' });

    expect(mocks.atualizarMutate).toHaveBeenCalledWith(
      { id: 'cpf-maria', patch: { pessoa_id: 'P-NOVA', bem_id: null, matricula_id: null, triado_em: null }, origem: 'Cadastro por Documento' },
      expect.any(Object),
    );
  });

  it('cadastra uma vez e vincula todos os arquivos marcados no balde', async () => {
    const user = userEvent.setup();
    renderClassificar({ docs: [doc('cpf-maria'), doc('rg-maria'), doc('escritura-fulano')] });

    // O arquivo aberto já conta; marcar outro no balde amplia a leva.
    await user.click(screen.getByRole('checkbox', { name: /Marcar rg-maria\.pdf/ }));
    expect(screen.getByRole('button', { name: /Cadastrar e vincular 2 arquivos/ })).toBeInTheDocument();

    preencher(/Nome completo/, 'Maria Aparecida Ferreira Lima');
    await user.click(screen.getByRole('button', { name: /Cadastrar e vincular/ }));
    await confirmar(user);
    await concluirCadastro(mocks.pessoaMutate, { id: 'P-NOVA', tipo_pessoa: 'PF', denominacao: 'Maria' });

    // Um cadastro só, dois vínculos.
    expect(mocks.pessoaMutate).toHaveBeenCalledTimes(1);
    const patch = { pessoa_id: 'P-NOVA', bem_id: null, matricula_id: null, triado_em: null };
    const origem = 'Cadastro por Documento';
    expect(mocks.atualizarMutate).toHaveBeenCalledWith({ id: 'cpf-maria', patch, origem }, expect.any(Object));
    expect(mocks.atualizarMutate).toHaveBeenCalledWith({ id: 'rg-maria', patch, origem }, expect.any(Object));
    expect(mocks.atualizarMutate).toHaveBeenCalledTimes(2);
  });

  it('marcada a leva à mão, abrir outro arquivo é só leitura', async () => {
    const user = userEvent.setup();
    renderClassificar({ docs: [doc('cpf-maria'), doc('rg-maria'), doc('escritura-fulano')] });

    await user.click(screen.getByRole('checkbox', { name: /Marcar rg-maria\.pdf/ }));
    preencher(/Nome completo/, 'Maria Aparecida Ferreira Lima');
    await user.click(screen.getByRole('button', { name: /escritura-fulano\.pdf/ }));

    // Abriu a escritura para conferir, mas ela não entrou na leva.
    expect(screen.getByRole('heading', { name: 'escritura-fulano.pdf' })).toBeInTheDocument();
    // …e o que já estava preenchido na ficha continua lá: procurar o resto dos
    // arquivos da pessoa não pode custar o formulário.
    expect(screen.getByText(/Nome completo/, { selector: 'label' }).parentElement?.querySelector('input'))
      .toHaveValue('Maria Aparecida Ferreira Lima');
    expect(screen.getByRole('button', { name: /Cadastrar e vincular 2 arquivos/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Marcar escritura-fulano\.pdf/ })).not.toBeChecked();
  });

  it('não cadastra sem o nome, e nada é gravado', () => {
    renderClassificar();
    fireEvent.click(screen.getByRole('button', { name: /Cadastrar e vincular/ }));
    expect(mocks.toast.error).toHaveBeenLastCalledWith('Nome completo é obrigatório');
    expect(mocks.pessoaMutate).not.toHaveBeenCalled();
    expect(mocks.atualizarMutate).not.toHaveBeenCalled();
  });

  it('recusa mandar georreferenciamento para pessoa (a exceção conhecida)', () => {
    renderClassificar({ docs: [doc('georref-18442', { categoria: 'georreferenciamento' })] });
    preencher(/Nome completo/, 'Maria');
    fireEvent.click(screen.getByRole('button', { name: /Cadastrar e vincular/ }));
    expect(mocks.toast.error).toHaveBeenLastCalledWith(
      'georref-18442.pdf: Documentos de georreferenciamento precisam estar vinculados a uma matrícula.',
    );
    expect(mocks.pessoaMutate).not.toHaveBeenCalled();
  });
});

describe('modo Classificar — apontar para quem já existe', () => {
  it('vincula sem criar cadastro novo', async () => {
    const user = userEvent.setup();
    renderClassificar();
    await user.click(screen.getByRole('button', { name: 'Vincular' }));
    // A categoria já abre em Pessoa Física; os cadastros dela ficam listados.
    await user.click(screen.getByRole('radio', { name: /Antônio Lima/ }));
    await user.click(screen.getByRole('button', { name: /Vincular \d+ arquivo/ }));
    await confirmar(user);

    expect(mocks.pessoaMutate).not.toHaveBeenCalled();
    expect(mocks.atualizarMutate).toHaveBeenCalledWith(
      { id: 'cpf-maria', patch: { pessoa_id: 'P9', bem_id: null, matricula_id: null, triado_em: null }, origem: 'Cadastro por Documento' },
      expect.any(Object),
    );
  });

  it('lista os cadastros da categoria aberta e larga a escolha ao trocar de categoria', async () => {
    const user = userEvent.setup();
    mocks.pessoas = [
      { id: 'P9', denominacao: 'Antônio Lima', tipo_pessoa: 'PF', is_fundador: true },
      { id: 'E1', denominacao: 'Lima Participações', tipo_pessoa: 'PJ' },
    ] as unknown as PessoaRow[];
    renderClassificar();
    await user.click(screen.getByRole('button', { name: 'Vincular' }));

    // Abre em Pessoa Física: só os PF aparecem, sem dropdown no caminho.
    expect(screen.getByRole('radio', { name: /Antônio Lima/ })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Lima Participações/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /Antônio Lima/ }));
    await user.click(screen.getByRole('button', { name: 'Pessoa Jurídica' }));
    expect(screen.getByRole('radio', { name: /Lima Participações/ })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Antônio Lima/ })).not.toBeInTheDocument();

    // A escolha da categoria anterior não pode sobreviver escondida.
    await user.click(screen.getByRole('button', { name: /Vincular \d+ arquivo/ }));
    expect(mocks.toast.error).toHaveBeenLastCalledWith('Escolha a quem este arquivo pertence');
    expect(mocks.atualizarMutate).not.toHaveBeenCalled();
  });

  it('trocar de arquivo mantém a aba Vincular e a entidade escolhida', async () => {
    const user = userEvent.setup();
    renderClassificar({ docs: [doc('cpf-maria'), doc('rg-maria')] });
    await user.click(screen.getByRole('button', { name: 'Vincular' }));
    await user.click(screen.getByRole('radio', { name: /Antônio Lima/ }));

    await user.click(screen.getByRole('button', { name: /rg-maria\.pdf/ }));

    expect(screen.getByRole('heading', { name: 'rg-maria.pdf' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vincular' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('radio', { name: /Antônio Lima/ })).toHaveAttribute('aria-checked', 'true');

    // e vincular o novo arquivo não custa reescolher a pessoa
    await user.click(screen.getByRole('button', { name: /Vincular \d+ arquivo/ }));
    await confirmar(user);
    expect(mocks.atualizarMutate).toHaveBeenCalledWith(
      { id: 'rg-maria', patch: { pessoa_id: 'P9', bem_id: null, matricula_id: null, triado_em: null }, origem: 'Cadastro por Documento' },
      expect.any(Object),
    );
  });

  it('cobra a escolha antes de vincular', async () => {
    const user = userEvent.setup();
    renderClassificar();
    await user.click(screen.getByRole('button', { name: 'Vincular' }));
    await user.click(screen.getByRole('button', { name: /Vincular \d+ arquivo/ }));
    expect(mocks.toast.error).toHaveBeenLastCalledWith('Escolha a quem este arquivo pertence');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.atualizarMutate).not.toHaveBeenCalled();
  });
});

/* O tipo é de cada arquivo; o dono é um só para a leva inteira. É essa diferença
   de cardinalidade que põe a classificação num modal por linha, e não numa
   escolha única ao lado da ficha. */
describe('modo Classificar — que documento é cada arquivo', () => {
  const abrirModalDeVinculo = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: 'Vincular' }));
    await user.click(screen.getByRole('radio', { name: /Antônio Lima/ }));
    await user.click(screen.getByRole('button', { name: /Vincular \d+ arquivo/ }));
  };

  it('lista a leva inteira, um arquivo por linha', async () => {
    const user = userEvent.setup();
    renderClassificar({ docs: [doc('cpf-maria'), doc('rg-maria')] });
    await user.click(screen.getByRole('checkbox', { name: /Marcar rg-maria\.pdf/ }));
    await abrirModalDeVinculo(user);

    expect(within(modal()).getByLabelText('Tipo de cpf-maria.pdf')).toBeInTheDocument();
    expect(within(modal()).getByLabelText('Tipo de rg-maria.pdf')).toBeInTheDocument();
    expect(within(modal()).getByText('0 de 2 classificados')).toBeInTheDocument();
  });

  it('grava um tipo diferente por arquivo, com o mesmo dono', async () => {
    const user = userEvent.setup();
    renderClassificar({ docs: [doc('cpf-maria'), doc('rg-maria')] });
    await user.click(screen.getByRole('checkbox', { name: /Marcar rg-maria\.pdf/ }));
    await abrirModalDeVinculo(user);

    await classificar(user, 'cpf-maria.pdf', 'CPF');
    await classificar(user, 'rg-maria.pdf', 'RG / CNH');
    expect(within(modal()).getByText('2 de 2 classificados')).toBeInTheDocument();
    await confirmar(user);

    const origem = 'Cadastro por Documento';
    const dono = { pessoa_id: 'P9', bem_id: null, matricula_id: null, triado_em: null };
    expect(mocks.atualizarMutate).toHaveBeenCalledWith(
      { id: 'cpf-maria', patch: { ...dono, documento_tipo_id: 'T-CPF' }, origem },
      expect.any(Object),
    );
    expect(mocks.atualizarMutate).toHaveBeenCalledWith(
      { id: 'rg-maria', patch: { ...dono, documento_tipo_id: 'T-RG' }, origem },
      expect.any(Object),
    );
  });

  // Classificar é opcional (decisão de 07/08/2026): confirmar com tudo em branco
  // vincula igual, e a coluna do tipo nem entra no update.
  it('confirma sem classificar e o patch sai sem a coluna do tipo', async () => {
    const user = userEvent.setup();
    renderClassificar();
    await abrirModalDeVinculo(user);
    await confirmar(user);

    const [args] = mocks.atualizarMutate.mock.calls[0];
    expect(args.patch).toEqual({ pessoa_id: 'P9', bem_id: null, matricula_id: null, triado_em: null });
    expect(args.patch).not.toHaveProperty('documento_tipo_id');
  });

  it('só oferece os tipos do destino, e o catálogo inteiro sob demanda', async () => {
    const user = userEvent.setup();
    renderClassificar();
    await abrirModalDeVinculo(user);

    // Antônio Lima é PF: os tipos de PJ ficam fora do recorte.
    await user.click(within(modal()).getByLabelText('Tipo de cpf-maria.pdf'));
    expect(screen.getByRole('option', { name: 'CPF' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'CNPJ' })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');

    await user.click(within(modal()).getByRole('button', { name: /catálogo inteiro/ }));
    await user.click(within(modal()).getByLabelText('Tipo de cpf-maria.pdf'));
    expect(screen.getByRole('option', { name: 'CNPJ' })).toBeInTheDocument();
  });

  // O recorte é o que foi PEDIDO a este cliente, não os 67 do catálogo. Lista
  // menor, e o que aparece tem significado.
  it('a lista vem da solicitação, e o item dispensado fica fora', async () => {
    const user = userEvent.setup();
    renderClassificar();
    await abrirModalDeVinculo(user);
    await user.click(within(modal()).getByLabelText('Tipo de cpf-maria.pdf'));

    expect(screen.getByRole('option', { name: 'CPF' })).toBeInTheDocument();
    // Pedido, mas dispensado pelo analista: deixou de ser esperado.
    expect(screen.queryByRole('option', { name: /DIRPF/ })).not.toBeInTheDocument();
  });

  // Documento avulso está FORA do catálogo por construção (migration
  // 20260807150000). A solicitação é o único caminho que o alcança.
  it('oferece o documento pedido à mão, e grava o tipo avulso dele', async () => {
    const user = userEvent.setup();
    renderClassificar();
    await abrirModalDeVinculo(user);

    await classificar(user, 'cpf-maria.pdf', 'Escritura da Fazenda São João');
    await confirmar(user);

    const [args] = mocks.atualizarMutate.mock.calls[0];
    expect(args.patch.documento_tipo_id).toBe('T-AVULSO');
  });

  // Item manual cujo tipo avulso ainda não existe não pode virar opção quebrada:
  // sem id não há o que gravar.
  it('pula o item manual que ainda não tem tipo', async () => {
    const user = userEvent.setup();
    mocks.avulsoPorItem = {};
    renderClassificar();
    await abrirModalDeVinculo(user);
    await user.click(within(modal()).getByLabelText('Tipo de cpf-maria.pdf'));

    expect(screen.queryByRole('option', { name: /Escritura/ })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'CPF' })).toBeInTheDocument();
  });

  // Cliente sem solicitação (ou sem item daquele grão) não pode virar lista vazia.
  it('sem nada pedido para o grão, cai no catálogo e avisa', async () => {
    const user = userEvent.setup();
    mocks.itensPedidos = [];
    renderClassificar();
    await abrirModalDeVinculo(user);

    expect(within(modal()).getByText(/lista abaixo vem do catálogo/)).toBeInTheDocument();
    await user.click(within(modal()).getByLabelText('Tipo de cpf-maria.pdf'));
    expect(screen.getByRole('option', { name: 'CPF' })).toBeInTheDocument();
  });

  // O nome do arquivo nem sempre diz que documento é aquele ("scan_0042.pdf").
  // A olhada é sob demanda: assinar a URL de todos na abertura do modal seria N
  // chamadas ao broker para nada.
  it('abre o preview de um arquivo sob demanda, e não assina o que ninguém olhou', async () => {
    const user = userEvent.setup();
    renderClassificar({ docs: [doc('cpf-maria'), doc('rg-maria')] });
    await user.click(screen.getByRole('checkbox', { name: /Marcar rg-maria\.pdf/ }));
    await abrirModalDeVinculo(user);
    mocks.pedirUrl.mockClear();

    expect(within(modal()).queryByTitle('cpf-maria.pdf')).not.toBeInTheDocument();
    await user.click(within(modal()).getByRole('button', { name: 'Olhar cpf-maria.pdf' }));

    expect(within(modal()).getByTitle('cpf-maria.pdf')).toHaveAttribute('src', 'https://assinada/cpf-maria');
    // o outro arquivo da leva não foi assinado
    expect(mocks.pedirUrl).toHaveBeenCalledTimes(1);
    expect(within(modal()).queryByTitle('rg-maria.pdf')).not.toBeInTheDocument();
  });

  it('um preview de cada vez, e reabrir não pede assinatura nova', async () => {
    const user = userEvent.setup();
    renderClassificar({ docs: [doc('cpf-maria'), doc('rg-maria')] });
    await user.click(screen.getByRole('checkbox', { name: /Marcar rg-maria\.pdf/ }));
    await abrirModalDeVinculo(user);
    mocks.pedirUrl.mockClear();

    await user.click(within(modal()).getByRole('button', { name: 'Olhar cpf-maria.pdf' }));
    await user.click(within(modal()).getByRole('button', { name: 'Olhar rg-maria.pdf' }));

    // Abrir o segundo fecha o primeiro: nunca dois iframes puxando arquivo.
    expect(within(modal()).queryByTitle('cpf-maria.pdf')).not.toBeInTheDocument();
    expect(within(modal()).getByTitle('rg-maria.pdf')).toBeInTheDocument();

    await user.click(within(modal()).getByRole('button', { name: 'Olhar cpf-maria.pdf' }));
    expect(within(modal()).getByTitle('cpf-maria.pdf')).toBeInTheDocument();
    // duas assinaturas no total, não três: a do cpf ficou em cache
    expect(mocks.pedirUrl).toHaveBeenCalledTimes(2);
  });

  it('formato que não abre no navegador não oferece a olhada', async () => {
    const user = userEvent.setup();
    renderClassificar({ docs: [doc('planilha', { nome_original: 'planilha.xlsx', mime: null })] });
    await abrirModalDeVinculo(user);

    expect(within(modal()).getByRole('button', { name: 'Olhar planilha.xlsx' })).toBeDisabled();
  });

  it('cancelar não grava nada e devolve o consultor ao balde', async () => {
    const user = userEvent.setup();
    renderClassificar();
    await abrirModalDeVinculo(user);
    await user.click(within(modal()).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.atualizarMutate).not.toHaveBeenCalled();
    expect(mocks.pessoaMutate).not.toHaveBeenCalled();
  });

  // A válvula fica de fora de propósito: é a saída rápida para o arquivo que não
  // interessa a ninguém, e um modal nela encareceria exatamente isso.
  it('"não é de ninguém" continua sendo um clique só, sem modal', async () => {
    const user = userEvent.setup();
    renderClassificar();
    await user.click(screen.getByRole('button', { name: /Não é de ninguém/ }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.atualizarMutate).toHaveBeenCalledTimes(1);
  });
});
