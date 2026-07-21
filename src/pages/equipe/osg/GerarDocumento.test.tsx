import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import GerarDocumento from './GerarDocumento';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  invalidateQueries: vi.fn(),
  mutateAsync: vi.fn(),
  marcarVistas: vi.fn(),
  baixarDocx: vi.fn(),
  toast: vi.fn(),
  vazia: [] as unknown[],
  empresa: {
    id: 'empresa-1', denominacao: 'Acme Participações Ltda.', tipo_pessoa: 'PJ',
    tipo_empresa: 'CN', cpf_cnpj: '12.345.678/0001-90', objeto_social: 'Participações',
    nire: null, junta_comercial_uf: null, data_constituicao: null, endereco_logradouro: null,
    endereco_numero: null, endereco_complemento: null, endereco_bairro: null,
    endereco_municipio: null, endereco_uf: null, endereco_cep: null,
  },
  modelos: [
    { id: 'modelo-1', nome: 'Contrato Social', descricao: 'Modelo principal', ativo: true, num_blocos: 2 },
    { id: 'modelo-2', nome: 'Modelo alternativo', descricao: null, ativo: true, num_blocos: 1 },
  ],
  docBlocos: [
    {
      id: 'posicao-1', obrigatorio: true,
      bloco: { id: 'biblioteca-1', nome: 'Qualificação', tipo: 'clausula', conteudo: 'Empresa {{ sociedade.razaoSocial }}. {{ observacao }}', flags: [], repete_colecao: null, ancora: null },
    },
    {
      id: 'posicao-2', obrigatorio: true,
      bloco: { id: 'biblioteca-2', nome: 'Qualificação repetida', tipo: 'paragrafo', conteudo: 'CNPJ {{ sociedade.cnpj }}.', flags: [], repete_colecao: null, ancora: null },
    },
  ],
  rascunho: null as Record<string, unknown> | null,
  overrides: new Map<string, { conteudoSubstituto: string }>(),
  versoes: [] as Array<{ row: Record<string, unknown>; numero: number; ehHead: boolean }>,
  notificacoes: [] as Array<Record<string, unknown>>,
  autores: {} as Record<string, string>,
  hookCalls: {
    rascunho: [] as Array<Record<string, unknown>>,
    overrides: [] as Array<string | null>,
    versoes: [] as Array<string | null>,
    notificacoes: [] as Array<Record<string, unknown>>,
  },
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock('@/components/equipe/osg/OsgLayout', () => ({
  OsgLayout: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <TooltipProvider><main><h1>{title}</h1>{children}</main></TooltipProvider>
  ),
}));

vi.mock('@/contexts/OsgWorkContext', () => ({ useOsgWork: () => ({ clienteId: 'cliente-1' }) }));

vi.mock('@/hooks/useModelosDocumento', () => ({
  useModelos: () => ({
    data: mocks.modelos,
    isLoading: false,
  }),
  useModeloBlocos: (modeloId: string | null) => ({
    data: modeloId ? mocks.docBlocos : [],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useBibliotecaModelos', () => ({
  useBlocos: () => ({ data: [
    { id: 'biblioteca-1', nome: 'Qualificação', conteudo: 'original' },
    { id: 'biblioteca-2', nome: 'Qualificação repetida', conteudo: 'original 2' },
  ] }),
  useFlags: () => ({ data: mocks.vazia }),
}));

vi.mock('@/hooks/useDocumentoGerado', () => ({
  useDocumentoGeradoRascunho: (args: Record<string, unknown>) => {
    mocks.hookCalls.rascunho.push(args);
    return { data: mocks.rascunho };
  },
  useDocumentoOverrides: (id: string | null) => {
    mocks.hookCalls.overrides.push(id);
    return { data: { porBlocoAlvo: mocks.overrides } };
  },
  useDocumentoVersoes: (id: string | null) => {
    mocks.hookCalls.versoes.push(id);
    return { data: mocks.versoes };
  },
  useSalvarDocumentoGerado: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }),
}));

const empresa = mocks.empresa;

const registrosVazios = { pessoa: [], bem: [], matricula: [], cartorio: [], sociedade: [], vertice: [] };

vi.mock('@/hooks/useGeracaoDocumento', () => ({
  PESSOA_LEGADA_PREFIX: 'legado:',
  useRegistrosPorTipo: () => ({
    registros: { ...registrosVazios, pessoa: [{ id: 'empresa-1', label: empresa.denominacao, row: empresa }] },
    isFetching: false,
  }),
  useListasDaEmpresa: () => ({ socios: mocks.vazia, administradores: mocks.vazia, integralizacoes: mocks.vazia, isFetching: false }),
}));

vi.mock('@/hooks/useGeorefByMatricula', () => ({ useGeorefByMatricula: () => ({ data: undefined }) }));
vi.mock('@/hooks/useDiagnosticoPatrimonial', () => ({ useAllMatriculas: () => ({ data: [] }) }));

vi.mock('@/hooks/useNotificacoesDocumento', () => ({
  useNotificacaoVisto: () => ({ data: null }),
  useNotificacoesDocumento: (args: Record<string, unknown>) => {
    mocks.hookCalls.notificacoes.push(args);
    return { data: mocks.notificacoes };
  },
  useMarcarNotificacoesVistas: () => ({ mutate: mocks.marcarVistas, isPending: false }),
  useAuditAutores: () => ({ data: mocks.autores }),
}));

vi.mock('@/lib/templates/docx', () => ({ baixarDocx: mocks.baixarDocx }));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));

vi.mock('@/components/equipe/osg/OverrideBlocoDialog', () => ({
  OverrideBlocoDialog: (props: {
    open: boolean; documentoGeradoId: string; documentoRaizId: string;
    blocoAlvo: { id: string } | null; override: { conteudoSubstituto: string } | null;
  }) => props.open ? (
    <div role="dialog" aria-label="override" data-documento={props.documentoGeradoId}
      data-raiz={props.documentoRaizId} data-bloco={props.blocoAlvo?.id}
      data-override={props.override?.conteudoSubstituto ?? ''}>Editor de override</div>
  ) : null,
}));

vi.mock('@/components/equipe/osg/qualificacao-das-partes/PessoaModal', () => ({
  PessoaModal: ({ open, pessoa }: { open: boolean; pessoa: { id: string } | null }) =>
    open ? <div role="dialog" aria-label="pessoa-origem" data-pessoa={pessoa?.id}>Pessoa origem</div> : null,
}));
vi.mock('@/components/equipe/osg/diagnostico-patrimonial/BemModal', () => ({ BemModal: () => null }));
vi.mock('@/components/equipe/osg/diagnostico-patrimonial/MatriculaModal', () => ({ MatriculaModal: () => null }));

const snapshot = (razao = 'Acme congelada') => ({
  selecao: { sociedade: { razaoSocial: razao, cnpj: '00.000.000/0000-00' } },
  registroPorBinding: {}, valoresLivres: { observacao: 'Texto selado' }, empresaId: 'empresa-1',
  itensPorLista: {}, total: null,
});

const documento = (dados = snapshot()) => ({
  id: 'doc-head', documento_raiz_id: 'doc-raiz', snapshot_dados: dados, snapshot_flags: [],
  snapshot_validado_em: '2026-06-16T14:30:00.000Z', created_at: '2026-06-16T14:30:00.000Z',
  gerado_por_id: 'autor-1', status: 'rascunho',
});

async function escolherModelo() {
  await userEvent.click(screen.getByRole('button', { name: /Contrato Social/i }));
  await screen.findByText('Escolha a empresa do contrato');
}

async function abrirDocumentoVivo() {
  render(<GerarDocumento />);
  await escolherModelo();
  await userEvent.click(screen.getByRole('button', { name: /Acme Participações Ltda/i }));
  await screen.findByText('Conferência dos dados');
}

async function abrirDocumentoCongelado() {
  const view = render(<GerarDocumento />);
  await escolherModelo();
  mocks.rascunho = documento();
  view.rerender(<GerarDocumento />);
  await screen.findByText('Versão validada · rascunho');
  return view;
}

describe('GerarDocumento — caracterização O1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rascunho = null;
    mocks.overrides = new Map();
    mocks.versoes = [];
    mocks.notificacoes = [];
    mocks.autores = {};
    mocks.mutateAsync.mockResolvedValue(documento());
    Object.values(mocks.hookCalls).forEach((calls) => calls.splice(0));
  });

  it('guia pelos passos e preserva as identidades de posição e Biblioteca no snapshot', async () => {
    await abrirDocumentoVivo();

    expect(screen.queryByText('Escolha o modelo')).not.toBeInTheDocument();
    expect(screen.getAllByText('Acme Participações Ltda.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Contrato Social').length).toBeGreaterThan(0);

    const observacaoLabel = screen.getByText('observacao');
    const observacaoInput = observacaoLabel.parentElement?.querySelector('input');
    expect(observacaoInput).not.toBeNull();
    fireEvent.change(observacaoInput as HTMLInputElement, { target: { value: 'Observação viva' } });
    await userEvent.click(screen.getByRole('button', { name: 'Validar versão' }));
    const confirmacao = await screen.findByRole('alertdialog');
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Validar versão' }));

    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledTimes(1));
    const payload = mocks.mutateAsync.mock.calls[0][0];
    expect(payload).toMatchObject({ clienteId: 'cliente-1', pjPessoaId: 'empresa-1', modeloId: 'modelo-1', novaVersao: false });
    expect(payload.snapshotDados).toEqual({
      selecao: expect.objectContaining({ sociedade: expect.objectContaining({ razaoSocial: empresa.denominacao }) }),
      registroPorBinding: {}, valoresLivres: { observacao: 'Observação viva' }, empresaId: 'empresa-1',
      itensPorLista: { socios: [], administradores: [], integralizacoes: [], vertices: [] }, total: null,
    });
    expect(payload.snapshotVersoesBlocos.map((bloco: { id: string }) => bloco.id)).toEqual(['posicao-1', 'posicao-2']);
  });

  it('hidrata SnapshotDados antigo, mantém o documento congelado e religa a proveniência Symbol', async () => {
    await abrirDocumentoCongelado();

    expect(screen.getByText(/Acme congelada/)).toBeInTheDocument();

    await userEvent.click(screen.getAllByTitle('Abrir o cadastro deste dado')[0]);
    expect(await screen.findByRole('dialog', { name: 'pessoa-origem' })).toHaveAttribute('data-pessoa', 'empresa-1');
  });

  it('aplica override só à posição ligada à identidade da Biblioteca e abre o dialog com ids da linhagem', async () => {
    mocks.overrides = new Map([['biblioteca-1', { conteudoSubstituto: 'Cláusula ajustada para {{ sociedade.razaoSocial }}. {{ observacao }}' }]]);
    await abrirDocumentoCongelado();

    const selo = screen.getByText('Ajustado neste documento');
    fireEvent.click(selo.parentElement as HTMLElement);
    await userEvent.click(await screen.findByRole('button', { name: /Editar bloco/ }));

    const dialog = await screen.findByRole('dialog', { name: 'override' });
    expect(dialog).toHaveAttribute('data-documento', 'doc-head');
    expect(dialog).toHaveAttribute('data-raiz', 'doc-raiz');
    expect(dialog).toHaveAttribute('data-bloco', 'biblioteca-1');
    expect(dialog).toHaveAttribute('data-override', 'Cláusula ajustada para {{ sociedade.razaoSocial }}. {{ observacao }}');
  });

  it('recongela uma edição manual na versão atual sem criar nova versão', async () => {
    await abrirDocumentoCongelado();
    await userEvent.click(screen.getByRole('button', { name: /Ajustar dados manualmente/ }));
    const label = screen.getByText('Razão social');
    const input = label.parentElement?.querySelector('input');
    expect(input).not.toBeNull();
    fireEvent.change(input as HTMLInputElement, { target: { value: 'Acme editada' } });

    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledTimes(1));
    expect(mocks.mutateAsync.mock.calls[0][0]).toMatchObject({ novaVersao: false });
    expect(mocks.mutateAsync.mock.calls[0][0].snapshotDados.selecao.sociedade.razaoSocial).toBe('Acme editada');
  });

  it('confirma nova versão, preserva a ordem persistir → fechar → notificar e envia novaVersao=true', async () => {
    await abrirDocumentoCongelado();
    const ordem: string[] = [];
    mocks.mutateAsync.mockImplementation(async () => { ordem.push('persistir'); return documento(); });
    mocks.toast.mockImplementation(() => { ordem.push('notificar'); });

    await userEvent.click(screen.getByRole('button', { name: 'Atualizar versão' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/versão atual é/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Atualizar versão' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nova versão criada' })));
    expect(mocks.mutateAsync.mock.calls[0][0].novaVersao).toBe(true);
    expect(ordem).toEqual(['persistir', 'notificar']);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('expõe contratos de hooks, autoabre notificações e marca a versão como lida', async () => {
    mocks.notificacoes = [{
      id: 'log-1', action: 'created', entity_name: 'Acme', performed_by: 'autor-1',
      performed_at: '2026-06-17T14:30:00.000Z', changed_fields: null,
    }];
    mocks.autores = { 'autor-1': 'Maria' };
    await abrirDocumentoCongelado();

    expect(await screen.findByText((_, node) => node?.tagName === 'P' && node.textContent === 'Acme adicionado ao cadastro')).toBeInTheDocument();
    expect(screen.getByText(/Maria ·/)).toBeInTheDocument();
    expect(mocks.hookCalls.rascunho).toContainEqual({ clienteId: 'cliente-1', modeloId: 'modelo-1', pjPessoaId: null });
    expect(mocks.hookCalls.overrides).toContain('doc-head');
    expect(mocks.hookCalls.versoes).toContain('doc-raiz');
    expect(mocks.hookCalls.notificacoes.at(-1)).toMatchObject({
      documentoGeradoId: 'doc-head', validadoEm: '2026-06-16T14:30:00.000Z', vistoEm: null,
      entidadeIds: ['empresa-1'],
    });

    await userEvent.click(screen.getByRole('button', { name: 'Marcar como lido' }));
    expect(mocks.marcarVistas).toHaveBeenCalledWith('doc-head');
  });

  it('visualiza e baixa snapshot antigo isolado da head, depois volta às ações vivas', async () => {
    const antiga = {
      ...documento(snapshot('Razão da versão 1')), id: 'doc-v1', status: 'revisao',
      snapshot_versoes_blocos: [
        { id: 'posicao-1', tipo: 'clausula', conteudo: 'Histórico: {{ sociedade.razaoSocial }}.', obrigatorio: true, flagsRequeridas: [] },
      ],
    };
    mocks.versoes = [
      { row: antiga, numero: 1, ehHead: false },
      { row: documento(), numero: 2, ehHead: true },
    ];
    await abrirDocumentoCongelado();

    await userEvent.click(screen.getByRole('button', { name: /Histórico de versões/i }));
    await userEvent.click(screen.getByRole('button', { name: /Versão 1/i }));
    expect(await screen.findByText(/Visualizando a versão 1/)).toBeInTheDocument();
    expect(screen.getByText(/Histórico: Razão da versão 1/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Atualizar versão' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Baixar .docx' }));
    await waitFor(() => expect(mocks.baixarDocx).toHaveBeenCalledWith(
      'Contrato Social (versão 1)', expect.arrayContaining([expect.objectContaining({ id: 'posicao-1' })]),
    ));
    await userEvent.click(screen.getByRole('button', { name: 'Voltar à versão atual' }));
    expect(screen.getByRole('button', { name: 'Atualizar versão' })).toBeInTheDocument();
  });

  it('copia sem marcas e baixa a head com o nome do modelo', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    await abrirDocumentoVivo();

    await userEvent.click(screen.getByRole('button', { name: 'Copiar texto' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(empresa.denominacao));
    await userEvent.click(screen.getByRole('button', { name: 'Baixar .docx' }));
    await waitFor(() => expect(mocks.baixarDocx).toHaveBeenCalledWith(
      'Contrato Social', expect.arrayContaining([expect.objectContaining({ id: 'posicao-1' })]),
    ));
  });
});
