import { fireEvent, render, screen } from '@testing-library/react';
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
  mocks.parentescoUpsert.mockResolvedValue(undefined);
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
    renderClassificar();
    preencher(/Nome completo/, 'Maria Aparecida Ferreira Lima');
    fireEvent.click(screen.getByRole('button', { name: /Cadastrar e vincular/ }));

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
      { id: 'cpf-maria', patch: { pessoa_id: 'P-NOVA', bem_id: null, matricula_id: null, triado_em: null } },
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
    await concluirCadastro(mocks.pessoaMutate, { id: 'P-NOVA', tipo_pessoa: 'PF', denominacao: 'Maria' });

    // Um cadastro só, dois vínculos.
    expect(mocks.pessoaMutate).toHaveBeenCalledTimes(1);
    const patch = { pessoa_id: 'P-NOVA', bem_id: null, matricula_id: null, triado_em: null };
    expect(mocks.atualizarMutate).toHaveBeenCalledWith({ id: 'cpf-maria', patch }, expect.any(Object));
    expect(mocks.atualizarMutate).toHaveBeenCalledWith({ id: 'rg-maria', patch }, expect.any(Object));
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

    expect(mocks.pessoaMutate).not.toHaveBeenCalled();
    expect(mocks.atualizarMutate).toHaveBeenCalledWith(
      { id: 'cpf-maria', patch: { pessoa_id: 'P9', bem_id: null, matricula_id: null, triado_em: null } },
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

    // e vincular o novo arquivo é um clique só, sem reescolher a pessoa
    await user.click(screen.getByRole('button', { name: /Vincular \d+ arquivo/ }));
    expect(mocks.atualizarMutate).toHaveBeenCalledWith(
      { id: 'rg-maria', patch: { pessoa_id: 'P9', bem_id: null, matricula_id: null, triado_em: null } },
      expect.any(Object),
    );
  });

  it('cobra a escolha antes de vincular', async () => {
    const user = userEvent.setup();
    renderClassificar();
    await user.click(screen.getByRole('button', { name: 'Vincular' }));
    await user.click(screen.getByRole('button', { name: /Vincular \d+ arquivo/ }));
    expect(mocks.toast.error).toHaveBeenLastCalledWith('Escolha a quem este arquivo pertence');
    expect(mocks.atualizarMutate).not.toHaveBeenCalled();
  });
});
