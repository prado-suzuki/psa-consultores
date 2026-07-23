import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';
import { DocumentosClienteChecklist } from './DocumentosClienteChecklist';

const mocks = vi.hoisted(() => ({
  baixar: vi.fn(),
  upload: vi.fn(),
  navigate: vi.fn(),
  isAdmin: false,
  docs: [] as DocumentoArquivoRow[],
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: mocks.isAdmin }) }));

vi.mock('@/hooks/useGestaoClientes', () => ({
  useClientesLista: () => ({ data: [{ id: 'cliente-1', nome: 'Fazenda Horizonte' }] }),
}));

vi.mock('@/hooks/useDocumentoArquivo', () => ({
  useDocumentosByCliente: () => ({ data: mocks.docs, isLoading: false }),
  useBaixarDocumento: () => ({ mutate: mocks.baixar, isPending: false }),
  useUploadDocumento: () => ({ mutate: mocks.upload, isPending: false }),
}));

const documento = (id: string, nome: string, categoria: string): DocumentoArquivoRow => ({
  id,
  nome_original: nome,
  categoria,
  gcs_uri: `gs://documentos/${nome}`,
} as DocumentoArquivoRow);

describe('DocumentosClienteChecklist', () => {
  beforeEach(() => {
    mocks.baixar.mockReset();
    mocks.upload.mockReset();
    mocks.navigate.mockReset();
    mocks.isAdmin = false;
    mocks.docs = [
      documento('doc-ir', 'DIRPF_2025.pdf', 'declaracao_ir'),
      documento('doc-contrato', 'estatuto_empresa.pdf', 'societarios'),
      documento('doc-outro', 'comprovante_avulso.pdf', 'outros'),
    ];
  });

  it('resume o progresso sem contar o modelo como pendência', () => {
    render(<DocumentosClienteChecklist clienteId="cliente-1" />);

    expect(screen.getByText('Planejamento tributário de Fazenda Horizonte')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('2 de 8 requisitos com documentos encontrados')).toBeInTheDocument();
    expect(screen.getByText('Resultado projetado')).toBeInTheDocument();
    expect(screen.getByText('Modelo de referência')).toBeInTheDocument();
  });

  it('filtra a fila por estado e por texto', async () => {
    const user = userEvent.setup();
    render(<DocumentosClienteChecklist clienteId="cliente-1" />);

    await user.click(screen.getByRole('button', { name: /Encontrados.*2/ }));
    expect(screen.getByText('DIRPF')).toBeInTheDocument();
    expect(screen.getByText('Contrato social')).toBeInTheDocument();
    expect(screen.queryByText('Livro Caixa (LCDPR)')).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Buscar documento ou arquivo...'), 'DIRPF');
    expect(screen.getByText('DIRPF')).toBeInTheDocument();
    expect(screen.queryByText('Contrato social')).not.toBeInTheDocument();
  });

  it('baixa um arquivo encontrado pela própria linha', async () => {
    const user = userEvent.setup();
    render(<DocumentosClienteChecklist clienteId="cliente-1" />);

    await user.click(screen.getByRole('button', { name: 'Baixar DIRPF_2025.pdf' }));
    expect(mocks.baixar).toHaveBeenCalledWith(mocks.docs[0]);
  });

  it('mantém múltiplos arquivos colapsados até a linha ser expandida', async () => {
    const user = userEvent.setup();
    mocks.docs = [
      ...mocks.docs,
      documento('doc-ir-2', 'DIRPF_retificadora_2025.pdf', 'declaracao_ir'),
    ];
    render(<DocumentosClienteChecklist clienteId="cliente-1" />);

    expect(screen.queryByRole('button', { name: 'Baixar DIRPF_2025.pdf' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver 2 documentos encontrados' }));
    expect(screen.getByRole('button', { name: 'Baixar DIRPF_2025.pdf' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Baixar DIRPF_retificadora_2025.pdf' })).toBeInTheDocument();
  });

  it('habilita a criação de projeto em 100% e envia o cadastro preenchido', async () => {
    const user = userEvent.setup();
    mocks.docs = [
      documento('doc-ir', 'DIRPF_2025.pdf', 'declaracao_ir'),
      documento('doc-lcdpr', 'LCDPR_2025.pdf', 'cadastros_fiscais'),
      documento('doc-exploracao', 'arrendamento_rural.pdf', 'agrarios'),
      documento('doc-bens', 'relatorio_bens.pdf', 'bens_direitos'),
      documento('doc-dividas', 'dividas_atividade_rural.pdf', 'outros'),
      documento('doc-investimentos', 'investimentos_projetados.pdf', 'outros'),
      documento('doc-social', 'estatuto_empresa.pdf', 'societarios'),
      documento('doc-dre', 'balancete_2025.pdf', 'outros'),
    ];
    render(<DocumentosClienteChecklist clienteId="cliente-1" />);

    const criarProjeto = screen.getByRole('button', { name: 'Criar projeto' });
    expect(criarProjeto).toBeEnabled();
    await user.click(criarProjeto);

    expect(mocks.navigate).toHaveBeenCalledWith('/equipe/osg/projetos/cadastro', {
      state: {
        projectPrefill: expect.objectContaining({
          clientId: 'cliente-1',
          name: 'Fazenda Horizonte - Planejamento Tributário',
          isMultidisciplinar: true,
        }),
      },
    });
    expect(mocks.navigate.mock.calls[0][1].state.projectPrefill.description)
      .toContain('planejamento tributário de Fazenda Horizonte');
  });

  it('permite que administradores criem o projeto antes de 100%', async () => {
    const user = userEvent.setup();
    mocks.isAdmin = true;
    render(<DocumentosClienteChecklist clienteId="cliente-1" />);

    const criarProjeto = screen.getByRole('button', { name: 'Criar projeto' });
    expect(criarProjeto).toBeEnabled();
    await user.click(criarProjeto);
    expect(mocks.navigate).toHaveBeenCalledWith('/equipe/osg/projetos/cadastro', expect.any(Object));
  });

  it('anexa um arquivo pendente com a categoria correspondente e sem vínculo de entidade', async () => {
    const user = userEvent.setup();
    render(<DocumentosClienteChecklist clienteId="cliente-1" />);
    const file = new File(['conteúdo'], 'LCDPR_2025.pdf', { type: 'application/pdf' });

    await user.upload(screen.getByLabelText('Selecionar arquivo para Livro Caixa (LCDPR)'), file);

    expect(mocks.upload).toHaveBeenCalledWith({
      clienteId: 'cliente-1',
      vinculo: {},
      categoria: 'cadastros_fiscais',
      file: expect.objectContaining({ name: 'Livro Caixa (LCDPR) - LCDPR_2025.pdf' }),
    }, expect.objectContaining({ onSettled: expect.any(Function) }));
  });

  it('identifica uploads sem categoria própria pelo requisito da linha', async () => {
    const user = userEvent.setup();
    render(<DocumentosClienteChecklist clienteId="cliente-1" />);
    const file = new File(['conteúdo'], 'relatorio.pdf', { type: 'application/pdf' });

    await user.upload(screen.getByLabelText('Selecionar arquivo para Dívidas da atividade rural'), file);

    const uploadArgs = mocks.upload.mock.calls[0][0];
    expect(uploadArgs.categoria).toBe('outros');
    expect(uploadArgs.file.name).toBe('Dívidas da atividade rural - relatorio.pdf');
  });
});
