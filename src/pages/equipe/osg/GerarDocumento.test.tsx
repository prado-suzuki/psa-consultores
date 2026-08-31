import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { SnapshotDados } from '@/hooks/useDocumentoGerado';
import GerarDocumento from './GerarDocumento';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  invalidateQueries: vi.fn(),
  mutateAsync: vi.fn(),
  marcarVistas: vi.fn(),
  baixarDocx: vi.fn(),
  toast: vi.fn(),
  definirFlagManual: vi.fn(),
  responderEventos: vi.fn(async () => []),
  registrarDocumento: vi.fn(async () => ({
    id: 'doc-head', documento_raiz_id: 'doc-raiz', status: 'registrado',
    snapshot_dados: null, snapshot_flags: [], substitui_documento_id: null,
  })),
  vazia: [] as unknown[],
  /** Catálogo de tmpl_flag (useFlags): derivadas declarativas e manuais. */
  flags: [] as unknown[],
  /** Linhas de projeto_flag_valor do par cliente+empresa. */
  valoresFlagsManuais: [] as unknown[],
  empresa: {
    id: 'empresa-1', denominacao: 'Acme Participações Ltda.', tipo_pessoa: 'PJ',
    tipo_empresa: 'CN', cpf_cnpj: '12.345.678/0001-90', objeto_social: 'Participações',
    nire: null, junta_comercial_uf: null, data_constituicao: null, endereco_logradouro: null,
    endereco_numero: null, endereco_complemento: null, endereco_bairro: null,
    endereco_municipio: null, endereco_uf: null, endereco_cep: null,
  },
  modelos: [
    // `escopo` é o que a tela lê para decidir junta, alteração contratual e
    // carimbo no ledger; `tipo` ficou como rótulo livre e não decide nada.
    { id: 'modelo-1', nome: 'Contrato Social', tipo: 'societario', escopo: 'sociedade', descricao: 'Modelo principal', ativo: true, num_blocos: 2 },
    { id: 'modelo-2', nome: 'Modelo alternativo', tipo: 'agrario', escopo: 'avulso', descricao: null, ativo: true, num_blocos: 1 },
  ],
  docBlocos: [
    {
      id: 'posicao-1', obrigatorio: true,
      bloco: { id: 'biblioteca-1', nome: 'Qualificação', tipo: 'clausula', conteudo: 'Empresa {{ sociedade.razaoSocial }}. {{ observacao }}', flags: [], repete_colecao: null, ancora: null },
    },
    {
      id: 'posicao-2', obrigatorio: true,
      bloco: { id: 'biblioteca-2', nome: 'Qualificação repetida', tipo: 'paragrafo', conteudo: 'CNPJ {{ sociedade.cnpj }}.', flags: [] as string[], repete_colecao: null, ancora: null },
    },
  ],
  // Catálogo da Biblioteca (useBlocos): cabeças com as variantes aninhadas, que é
  // de onde o controller monta o registro de famílias do render.
  catalogoBlocos: [] as unknown[],
  matriculas: [] as unknown[],
  socios: [] as unknown[],
  integralizacoes: [] as unknown[],
  // Aportes e cessões do livro de movimentos: as alíneas mistas de
  // integralização e a cláusula que nomeia as duas pontas da cessão.
  aportes: [] as unknown[],
  cessoes: [] as unknown[],
  /** O livro de movimentos da empresa (useMovimentosDaEmpresa). */
  movimentos: [] as unknown[],
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
  // Todo hook de dados desta tela é mockado por módulo; o único que continua
  // real é o das flags manuais (useDomainFlagsManuais), de propósito, para que o
  // wiring "valor gravado → flag ativa → bloco entra" seja exercitado de verdade.
  useQuery: () => ({ data: mocks.valoresFlagsManuais }),
  useMutation: () => ({
    mutate: mocks.definirFlagManual,
    mutateAsync: mocks.responderEventos,
    isPending: false,
  }),
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

// Só as queries são mockadas: montarRegistroFamilias é função pura da Biblioteca
// e entra de verdade, para o controller montar o registro como em produção.
vi.mock('@/hooks/useBibliotecaModelos', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/useBibliotecaModelos')>()),
  useBlocos: () => ({ data: mocks.catalogoBlocos }),
  useFlags: () => ({ data: mocks.flags }),
}));

vi.mock('@/hooks/useDocumentoGerado', () => ({
  useDocumentoGeradoHead: (args: Record<string, unknown>) => {
    mocks.hookCalls.rascunho.push(args);
    return { data: mocks.rascunho };
  },
  useDocumentoGeradoPorId: () => ({ data: null }),
  useRegistrarDocumento: () => ({ mutateAsync: mocks.registrarDocumento, isPending: false }),
  useDocumentoSucessor: () => ({ data: null }),
  // Elos até a base da sucessão: com o registrado servindo de base, a peça em
  // composição é a primeira alteração (0 + 1).
  useOrdemNaSucessao: () => ({ data: 0 }),
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
    registros: {
      ...registrosVazios,
      pessoa: [{ id: 'empresa-1', label: empresa.denominacao, row: empresa }],
      matricula: mocks.matriculas,
    },
    isFetching: false,
  }),
  useListasDaEmpresa: () => ({
    socios: mocks.socios,
    administradores: mocks.vazia,
    integralizacoes: mocks.integralizacoes,
    aportes: mocks.aportes,
    cessoes: mocks.cessoes,
    quadroGravado: mocks.socios.length > 0,
    isFetching: false,
  }),
}));

// O livro de movimentos entra por módulo porque o useQuery global desta suíte
// devolve sempre as flags manuais: sem isto a derivação de eventos nunca veria
// lançamento nenhum.
vi.mock('@/hooks/useMovimentacaoQuotas', () => ({
  useMovimentosDaEmpresa: () => ({
    data: { movimentos: mocks.movimentos, atos: [] },
    isFetching: false,
  }),
}));

vi.mock('@/hooks/useGeorefByMatricula', () => ({
  useGeorefByMatricula: () => ({ data: undefined }),
  useGeorefsByMatriculas: () => ({ porMatricula: {}, isFetching: false }),
}));
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
// A trilha de auditoria da flag manual pende do AuthContext, que esta tela não
// monta; o conteúdo do log é assertado no teste do hook.
vi.mock('@/hooks/useAuditLog', () => ({ useAuditLog: () => ({ logAction: vi.fn() }) }));

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

const snapshot = (razao = 'Acme congelada'): SnapshotDados => ({
  selecao: { sociedade: { razaoSocial: razao, cnpj: '00.000.000/0000-00' } },
  registroPorBinding: {}, valoresLivres: { observacao: 'Texto selado' }, empresaId: 'empresa-1',
  itensPorLista: {}, total: null,
});

const documento = (dados: SnapshotDados = snapshot()) => ({
  id: 'doc-head', documento_raiz_id: 'doc-raiz', snapshot_dados: dados, snapshot_flags: [],
  snapshot_validado_em: '2026-06-16T14:30:00.000Z', created_at: '2026-06-16T14:30:00.000Z',
  gerado_por_id: 'autor-1', status: 'rascunho', papel: 'constitutivo',
});

/**
 * A head de uma alteração contratual JÁ VALIDADA: ela substitui a peça
 * registrada e carrega o papel `alterador`, como o banco a grava (o papel é
 * carimbado no nascimento da linhagem, ver papelDaRaiz).
 */
const alteracaoValidada = (dados: SnapshotDados = snapshot()) => ({
  ...documento(dados),
  substitui_documento_id: 'doc-base',
  papel: 'alterador',
});

const CATALOGO_SEM_FAMILIA = [
  { id: 'biblioteca-1', nome: 'Qualificação', ativo: true, versao_atual: { conteudo: 'original' }, variantes: [] },
  { id: 'biblioteca-2', nome: 'Qualificação repetida', ativo: true, versao_atual: { conteudo: 'original 2' }, variantes: [] },
];

/** Cabeça de família com duas redações, como a Biblioteca a devolve (variantes aninhadas). */
const CABECA_DESCRICAO_IMOVEL = {
  id: 'familia-imovel',
  nome: 'Descrição de imóvel',
  ativo: true,
  versao_atual: null,
  variantes: [
    {
      id: 'variante-rural',
      nome: 'Descrição de imóvel: Rural',
      ativo: true,
      variante_rotulo: 'Rural, propriedade exclusiva',
      variante_ordem: 1,
      variante_seletor: { 'imovel.rural': 'sim', 'imovel.inteiro': 'sim' },
      versao_atual: { conteudo: 'Um imóvel rural denominado {{ imovel.denominacao }}' },
    },
    {
      id: 'variante-urbana',
      nome: 'Descrição de imóvel: Urbano',
      ativo: true,
      variante_rotulo: 'Urbano, propriedade exclusiva',
      variante_ordem: 2,
      variante_seletor: { 'imovel.urbano': 'sim', 'imovel.inteiro': 'sim' },
      versao_atual: { conteudo: 'Um imóvel urbano na {{ imovel.enderecoLogradouro }}, {{ imovel.enderecoNumeroProsa }}' },
    },
  ],
};

/** Matrícula urbana no formato que useIntegralizacoesAprovadas entrega. */
const MATRICULA_URBANA = {
  id: 'matricula-urbana', numero: '24.318-DEV', livro: '02', folha: '01',
  municipio_imovel: 'Sinop', uf_imovel: 'MT', area_documento: 120.75, area_unidade: 'm2',
  vlr_contabil: 420000, confrontacoes_texto: 'Norte: com a Sala 1205.', descricao_psa_completa: null,
  tipo_bem: 'IB', tipo_exploracao_posse: null,
  bem: {
    denominacao: 'Sala Comercial 1204', vlr_contabil: null, ccir_codigo: null, tipo_bem: 'IB',
    inscricao_municipal: '01.4.0235.0412.001', endereco_logradouro: 'Avenida das Itaúbas',
    endereco_numero: '3255', endereco_complemento: null, endereco_bairro: 'Setor Comercial',
    endereco_cep: '78550-218', area_construida_m2: null,
  },
  cartorio: { nome_completo: 'Registro de Imóveis de Sinop', comarca: 'Sinop', uf: 'MT' },
  titulares: [{ denominacao: 'Avelino Neri Bocolli', pessoaId: 'socio-1', fracao: 100, integralizador: true }],
};

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

beforeAll(() => {
  // APIs de ponteiro que o Radix (Select) usa e o jsdom não tem.
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rascunho = null;
  mocks.overrides = new Map();
  mocks.versoes = [];
  mocks.notificacoes = [];
  mocks.autores = {};
  mocks.docBlocos[0].bloco.conteudo = 'Empresa {{ sociedade.razaoSocial }}. {{ observacao }}';
  mocks.docBlocos[0].bloco.repete_colecao = null;
  mocks.docBlocos[1].bloco.conteudo = 'CNPJ {{ sociedade.cnpj }}.';
  mocks.catalogoBlocos = [...CATALOGO_SEM_FAMILIA];
  mocks.docBlocos[1].bloco.flags = [];
  mocks.flags = [];
  mocks.valoresFlagsManuais = [];
  mocks.matriculas = [];
  mocks.socios = [];
  mocks.integralizacoes = [];
  mocks.aportes = [];
  mocks.cessoes = [];
  mocks.movimentos = [];
  mocks.mutateAsync.mockResolvedValue(documento());
  Object.values(mocks.hookCalls).forEach((calls) => calls.splice(0));
});

describe('GerarDocumento — caracterização O1', () => {
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
      registroPorBinding: {}, registrosPorLista: {},
      valoresLivres: { observacao: 'Observação viva' }, empresaId: 'empresa-1',
      itensPorLista: {
        socios: [], administradores: [], integralizacoes: [], cessoes: [],
        // `retirantes` entrou com a cláusula de retirada da AC de concentração:
        // lista nova é lista congelada no snapshot, como as demais.
        retirantes: [],
        imoveis: [], signatarios: [], vertices: [], memoriais: [],
      },
      total: null,
    });
    // Snapshot da versão = blocos resolvidos + famílias citadas (nenhuma aqui).
    expect(payload.snapshotVersoesBlocos.blocos.map((bloco: { id: string }) => bloco.id)).toEqual(['posicao-1', 'posicao-2']);
    expect(payload.snapshotVersoesBlocos.familias).toEqual({});
  });

  it('hidrata SnapshotDados antigo, mantém o documento congelado e religa a proveniência Symbol', async () => {
    await abrirDocumentoCongelado();

    expect(screen.getByText(/Acme congelada/)).toBeInTheDocument();

    await userEvent.click(screen.getAllByTitle('Abrir o cadastro deste dado')[0]);
    expect(await screen.findByRole('dialog', { name: 'pessoa-origem' })).toHaveAttribute('data-pessoa', 'empresa-1');
  });

  it('reidrata os valores livres de um rascunho com binding societário legado', async () => {
    mocks.docBlocos[0].bloco.conteudo = 'Empresa {{ razaoSocial }}. {{ observacao }}';
    const dadosLegados = {
      ...snapshot(),
      selecao: { sociedade: { razaoSocial: '', cnpj: '00.000.000/0000-00' } },
      valoresLivres: { razaoSocial: 'Razão legada preservada', observacao: 'Texto selado' },
      empresaId: null,
    };
    const view = render(<GerarDocumento />);
    await escolherModelo();
    mocks.rascunho = documento(dadosLegados);
    view.rerender(<GerarDocumento />);

    expect(await screen.findByText(/Razão legada preservada/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Baixar .docx' })).toBeEnabled();
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
    const dadosLegados: SnapshotDados = {
      ...snapshot(),
      selecao: {},
      valoresLivres: { 'controladora.nome': 'Razão da versão 1' },
      empresaId: null,
    };
    const antiga = {
      ...documento(dadosLegados), id: 'doc-v1', status: 'revisao',
      snapshot_versoes_blocos: [
        { id: 'posicao-1', tipo: 'clausula', conteudo: 'Histórico: {{ controladora.nome }}.', obrigatorio: true, flagsRequeridas: [] },
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

  it('resolve a família de variantes por imóvel e congela as variantes no snapshot', async () => {
    // O bloco do modelo só CITA a família; a redação urbana é escolhida no render
    // a partir do imóvel (tipo_bem IB), e o endereço vem das colunas de `bem`.
    mocks.catalogoBlocos = [...CATALOGO_SEM_FAMILIA, CABECA_DESCRICAO_IMOVEL];
    mocks.docBlocos[0].bloco.repete_colecao = 'integralizacoes';
    mocks.docBlocos[0].bloco.conteudo =
      'O sócio {{ socio.nome }} integraliza: {{#imoveis}}{{ imovel.alinea }}) {{familia nome="Descrição de imóvel"}}.{{/imoveis}}';
    mocks.socios = [{
      pessoa: { id: 'socio-1', denominacao: 'Avelino Neri Bocolli', tipo_pessoa: 'PF' },
      quotas: null, vlr_total: null, representante: null,
    }];
    mocks.integralizacoes = [MATRICULA_URBANA];

    await abrirDocumentoVivo();

    expect(
      await screen.findByText(/Um imóvel urbano na Avenida das Itaúbas, nº 3255/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Um imóvel rural/)).not.toBeInTheDocument();

    // Editar pela prévia mira a VARIANTE que escreveu o trecho, não o hospedeiro.
    await userEvent.click(screen.getByText(/Um imóvel urbano na Avenida das Itaúbas/));
    expect(
      await screen.findByRole('button', { name: /Editar a redação "Urbano, propriedade exclusiva"/ }),
    ).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');

    await userEvent.click(screen.getByRole('button', { name: 'Validar versão' }));
    const confirmacao = await screen.findByRole('alertdialog');
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Validar versão' }));

    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledTimes(1));
    const familias = mocks.mutateAsync.mock.calls[0][0].snapshotVersoesBlocos.familias;
    expect(Object.keys(familias)).toEqual(['Descrição de imóvel']);
    expect(familias['Descrição de imóvel'].map((v: { id: string }) => v.id)).toEqual([
      'variante-rural',
      'variante-urbana',
    ]);
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

// --- Snapshot selado antes da lista de signatários existir ---------------------

const FECHO = '{{#signatarios}}_____________\n*{{ signatario.nomeMaiusculo }}*\n{{ signatario.papel }}{{/signatarios}}';

const SOCIOS_DO_FECHO = [
  { pessoa: { id: 'p-1', denominacao: 'José Eduardo Bocolli', tipo_pessoa: 'PF', genero: 'M' }, quotas: 500, vlr_total: 500, representante: null },
  { pessoa: { id: 'p-2', denominacao: 'Camila Bocolli', tipo_pessoa: 'PF', genero: 'F' }, quotas: 500, vlr_total: 500, representante: null },
];

/** Snapshot como o banco o devolve para um documento validado, com as listas que existiam então. */
const snapshotComListas = (itensPorLista: Record<string, unknown[]>): SnapshotDados => ({
  ...snapshot(),
  itensPorLista: itensPorLista as SnapshotDados['itensPorLista'],
});

async function abrirCongeladoCom(dados: SnapshotDados) {
  const view = render(<GerarDocumento />);
  await escolherModelo();
  mocks.rascunho = documento(dados);
  view.rerender(<GerarDocumento />);
  await screen.findByText('Versão validada · rascunho');
}

describe('GerarDocumento — o fecho de assinaturas do documento já validado', () => {
  beforeEach(() => {
    // O bloco de fecho é um bloco cujo conteúdo INTEIRO é o laço: sem itens ele
    // renderiza vazio e o motor o descarta, calado. É o caso extremo da regra.
    mocks.docBlocos[1].bloco.conteudo = FECHO;
    mocks.socios = SOCIOS_DO_FECHO;
  });

  it('snapshot SEM a chave signatarios volta a assinar, em vez de perder a folha', async () => {
    // Todo documento validado antes desta lista existir tem o snapshot assim:
    // as listas de então, sem `signatarios`.
    await abrirCongeladoCom(snapshotComListas({ socios: [], administradores: [], integralizacoes: [] }));

    expect(await screen.findByText(/JOSÉ EDUARDO BOCOLLI/)).toBeInTheDocument();
    expect(screen.getByText(/CAMILA BOCOLLI/)).toBeInTheDocument();
    // E o rodapé conta o que saiu de verdade: os dois blocos, nenhum descartado.
    expect(screen.getByText('2 blocos · preenchido do cadastro')).toBeInTheDocument();
  });

  it('lista de signatários VAZIA no snapshot é decisão selada: o bloco sai e a tela avisa', async () => {
    await abrirCongeladoCom(snapshotComListas({ socios: [], signatarios: [] }));

    await screen.findByText(/Acme congelada/);
    expect(screen.queryByText(/JOSÉ EDUARDO BOCOLLI/)).not.toBeInTheDocument();
    // O descarte se anuncia: nome do bloco, motivo, e a contagem certa no rodapé.
    expect(screen.getByText(/Qualificação repetida/)).toBeInTheDocument();
    expect(screen.getByText(/a lista que ele percorre não trouxe nenhum item/)).toBeInTheDocument();
    expect(screen.getByText('1 de 2 blocos · 1 sem dado para preencher')).toBeInTheDocument();
  });
});

// --- B15 · seleção múltipla de imóveis ----------------------------------------

/** Sete matrículas, como no contrato de constituição do caso MMS. */
const SETE_MATRICULAS = ['9.617', '9.618', '9.619', '9.620', '9.621', '9.622', '9.623'].map((numero, i) => ({
  id: `mat-${i + 1}`,
  label: `${numero} — Fazenda Santa Clara ${i + 1}`,
  row: {
    ...MATRICULA_URBANA,
    id: `mat-${i + 1}`,
    numero,
    bem: { ...MATRICULA_URBANA.bem, denominacao: `Fazenda Santa Clara ${i + 1}` },
  },
}));

async function abrirSelecaoDeImoveis() {
  mocks.matriculas = SETE_MATRICULAS;
  mocks.docBlocos[0].bloco.conteudo = 'Integraliza: {{#imoveis sep="; " fim="; e "}}a matrícula {{ imovel.numero }}{{/imoveis}}.';
  mocks.docBlocos[1].bloco.conteudo = 'Instrumento particular.';
  render(<GerarDocumento />);
  await userEvent.click(screen.getByRole('button', { name: /Contrato Social/i }));
  await screen.findByText('Escolha os registros do documento');
}

describe('GerarDocumento — B15 · o documento integraliza VÁRIAS matrículas', () => {
  it('marcar a primeira não fecha o passo, e as sete entram no documento', async () => {
    await abrirSelecaoDeImoveis();

    await userEvent.click(screen.getByRole('checkbox', { name: SETE_MATRICULAS[0].label }));
    // O passo continua aberto com a lista inteira: escolher um item não é
    // concluir a escolha quando o papel é plural.
    expect(screen.getByText('Escolha os registros do documento')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(7);
    expect(screen.getByText('1 selecionado')).toBeInTheDocument();

    for (const matricula of SETE_MATRICULAS.slice(1)) {
      await userEvent.click(screen.getByRole('checkbox', { name: matricula.label }));
    }
    expect(screen.getByText('7 selecionados')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Concluir seleção' }));

    const folha = await screen.findByText(/Integraliza: a matrícula 9.617/);
    for (const numero of ['9.617', '9.620', '9.623']) {
      expect(folha.textContent).toContain(numero);
    }
    expect(folha.textContent).toContain('; e a matrícula 9.623.');
  });

  it('tem caminho de volta: o rail reabre a lista com o documento em cena', async () => {
    await abrirSelecaoDeImoveis();
    await userEvent.click(screen.getByRole('checkbox', { name: SETE_MATRICULAS[0].label }));
    await userEvent.click(screen.getByRole('button', { name: 'Concluir seleção' }));
    await screen.findByText(/Integraliza: a matrícula 9.617/);

    // Os passos saíram de cena; sem o seletor do rail não haveria como
    // acrescentar a segunda matrícula.
    await userEvent.click(screen.getByRole('button', { name: /Imóveis selecionados/ }));
    await userEvent.click(await screen.findByRole('checkbox', { name: SETE_MATRICULAS[1].label }));

    expect(await screen.findByText(/Integraliza: a matrícula 9.617; e a matrícula 9.618\./)).toBeInTheDocument();
  });
});

// --- B2 · o gate de completude, na tela --------------------------------------

describe('GerarDocumento — B2 · baixar com pendência avisa e marca o arquivo', () => {
  it('com campo obrigatório em branco, o botão continua clicável e a confirmação nomeia o que falta', async () => {
    // Sem sócios, o capital não é calculado: o campo obrigatório resolve vazio
    // enquanto a razão social preenche — o bloco fica, e a pendência aparece.
    mocks.docBlocos[0].bloco.conteudo = 'A empresa {{ sociedade.razaoSocial }} tem capital de R$ {{ sociedade.capitalValor }}.';
    await abrirDocumentoVivo();

    const baixar = screen.getByRole('button', { name: 'Baixar .docx' });
    expect(baixar).toBeEnabled();
    await userEvent.click(baixar);

    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText('Sociedade — Capital social (R$)')).toBeInTheDocument();
    expect(mocks.baixarDocx).not.toHaveBeenCalled();

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Baixar como rascunho' }));
    await waitFor(() => expect(mocks.baixarDocx).toHaveBeenCalled());
    const [nome, blocos] = mocks.baixarDocx.mock.calls[0];
    expect(nome).toBe('Contrato Social (rascunho)');
    expect(blocos[0].conteudo).toContain('RASCUNHO — DOCUMENTO INCOMPLETO');
  });

  it('modelo que por natureza não tem sócios (matrícula digitada) baixa sem alarme nenhum', async () => {
    mocks.matriculas = [SETE_MATRICULAS[0]];
    mocks.docBlocos[0].bloco.conteudo = 'Matrícula {{ imovel.numero }}, com área de {{ imovel.area }}.';
    mocks.docBlocos[1].bloco.conteudo = 'Registrada no {{ imovel.cartorio }}.';
    render(<GerarDocumento />);
    await userEvent.click(screen.getByRole('button', { name: /Modelo alternativo/i }));

    await userEvent.click(await screen.findByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: SETE_MATRICULAS[0].label }));

    await screen.findByText(/Matrícula 9.617/);
    await userEvent.click(screen.getByRole('button', { name: 'Baixar .docx' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.baixarDocx).toHaveBeenCalledWith(
      'Modelo alternativo', expect.arrayContaining([expect.objectContaining({ id: 'posicao-1' })]),
    ));
  });
});

describe('GerarDocumento — o porteiro: folha em erro não é selada nem registrada', () => {
  // A citação de âncora que ninguém publica é o erro real do ensaio de 26/08: o
  // render trata placeholder não resolvido como erro de composição, e antes disto
  // "Validar versão" gravava o documento, congelava o snapshot e carimbava o
  // ledger apontando uma peça que não existe como texto.
  const CITA_ANCORA_ORFA = 'Nos termos da {{ refs.capital_social }}, a empresa {{ sociedade.razaoSocial }}.';

  it('com erro de composição, validar fica fechado e nada é gravado', async () => {
    mocks.docBlocos[0].bloco.conteudo = CITA_ANCORA_ORFA;
    await abrirDocumentoVivo();

    // A folha está de fato em erro, e não apenas vazia.
    expect(await screen.findByText(/Placeholder não resolvido: \{\{refs.capital_social\}\}/)).toBeInTheDocument();
    const validar = screen.getByRole('button', { name: /Validar versão/i });
    expect(validar).toBeDisabled();
    await userEvent.click(validar);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it('com erro de composição, registrar na junta fica fechado', async () => {
    mocks.docBlocos[0].bloco.conteudo = CITA_ANCORA_ORFA;
    await abrirDocumentoCongelado();

    expect(screen.getByRole('button', { name: /Registrar na junta/i })).toBeDisabled();
    expect(mocks.registrarDocumento).not.toHaveBeenCalled();
  });

  it('PENDÊNCIA não é erro: campo em branco continua podendo validar', async () => {
    // O porteiro é sobre a folha que não compõe, não sobre o rascunho incompleto:
    // validar antes de preencher tudo é caminho legítimo, e o aviso dele mora no
    // download (ver B2).
    mocks.docBlocos[0].bloco.conteudo = 'A empresa {{ sociedade.razaoSocial }} tem capital de R$ {{ sociedade.capitalValor }}.';
    await abrirDocumentoVivo();

    expect(screen.getByRole('button', { name: /Validar versão/i })).toBeEnabled();
  });
});

// Flag MANUAL: o interruptor que o consultor liga na mão, para a condição que não
// se deriva do cadastro (o evento de uma alteração contratual). O valor mora em
// projeto_flag_valor e entra nas flags VIVAS ao lado das derivadas.
const FLAG_MANUAL = {
  id: 'flag-manual-1', nome: 'evento_aumento_capital', tipo: 'manual', escopo: 'documento',
  descricao: 'Houve aumento de capital', ativo: true, entidade: null, campo: null, valor: null,
};

/** Documento travado: registrado na junta, ponto de partida da alteração. */
const registrado = (dados: SnapshotDados = snapshot()) => ({
  ...documento(dados),
  status: 'registrado',
});

describe('GerarDocumento — alteração contratual a partir do documento registrado', () => {
  beforeEach(() => {
    mocks.flags = [FLAG_MANUAL];
    // A segunda cláusula do modelo é a resolução: pende da flag de evento.
    mocks.docBlocos[1].bloco.flags = ['evento_aumento_capital'];
    // `mocks.modelos` é compartilhado entre os testes: quem troca o escopo tem
    // de voltar ao padrão, senão o teste seguinte herda um modelo avulso.
    mocks.modelos[0].escopo = 'sociedade';
  });

  async function abrirRegistrado() {
    const view = render(<GerarDocumento />);
    await escolherModelo();
    mocks.rascunho = registrado();
    view.rerender(<GerarDocumento />);
    await screen.findByText('Registrado na junta');
    return view;
  }

  async function validar() {
    await userEvent.click(screen.getByRole('button', { name: 'Validar versão' }));
    const confirmacao = await screen.findByRole('alertdialog');
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Validar versão' }));
    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledTimes(1));
    return mocks.mutateAsync.mock.calls[0][0];
  }

  it('o assistente NÃO é passo do fluxo de geração: gerar um contrato não pergunta evento nenhum', async () => {
    render(<GerarDocumento />);
    await escolherModelo();
    await userEvent.click(screen.getByRole('button', { name: /Acme Participações Ltda/i }));

    // A folha entra em cena direto, sem passo intermediário de condições.
    await screen.findByText('Conferência dos dados');
    expect(screen.queryByText('Marque o que se aplica')).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Houve aumento de capital' })).not.toBeInTheDocument();
  });

  it('modelo que passa a citar campo novo não quebra documento já validado', async () => {
    // O snapshot congela os CAMPOS, mas a head renderiza os BLOCOS vivos da
    // Biblioteca. Quando o modelo evolui e passa a citar um campo que aquele
    // snapshot não conhecia, o documento antigo saía inteiro como "Placeholder
    // não resolvido". O que falta é preenchido do cadastro; o que o snapshot tem
    // continua intocado.
    mocks.docBlocos[0].bloco.conteudo = '{{ sociedade.tituloInstrumento }} — Empresa {{ sociedade.razaoSocial }}.';
    const view = render(<GerarDocumento />);
    await escolherModelo();
    mocks.rascunho = documento();
    view.rerender(<GerarDocumento />);
    await screen.findByText('Versão validada · rascunho');

    expect(await screen.findByText(/INSTRUMENTO PARTICULAR DE CONSTITUIÇÃO/)).toBeInTheDocument();
    expect(screen.queryByText(/Placeholder não resolvido/)).not.toBeInTheDocument();
    // O valor selado não se reescreve: a razão social continua a do snapshot.
    expect(screen.getByText(/Acme congelada/)).toBeInTheDocument();
  });

  it('documento validado oferece registrar na junta, e a confirmação diz o que trava', async () => {
    const view = render(<GerarDocumento />);
    await escolherModelo();
    mocks.rascunho = documento();
    view.rerender(<GerarDocumento />);
    await screen.findByText('Versão validada · rascunho');

    await userEvent.click(screen.getByRole('button', { name: 'Registrar na junta' }));
    const confirmacao = await screen.findByRole('alertdialog');
    expect(within(confirmacao).getByText(/deixa de aceitar edição de bloco/i)).toBeInTheDocument();

    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Registrar na junta' }));
    await waitFor(() =>
      expect(mocks.registrarDocumento).toHaveBeenCalledWith({
        documentoGeradoId: 'doc-head',
        nomeModelo: expect.any(String),
      }),
    );
  });

  it('registrado, a peça trava e o caminho adiante é gerar OUTRO documento', async () => {
    await abrirRegistrado();

    // Some tudo que reescreveria a peça que já valeu.
    expect(screen.queryByRole('button', { name: 'Atualizar versão' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Atualizar do cadastro' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar na junta' })).not.toBeInTheDocument();
    // E aparece o caminho de saída.
    expect(screen.getByRole('button', { name: 'Gerar alteração contratual' })).toBeInTheDocument();
  });

  it('o assistente grava TODAS as respostas ancoradas no documento registrado, marcadas ou não', async () => {
    await abrirRegistrado();

    await userEvent.click(screen.getByRole('button', { name: 'Gerar alteração contratual' }));
    const modal = await screen.findByRole('dialog');
    await userEvent.click(within(modal).getByRole('switch', { name: 'Houve aumento de capital' }));
    await userEvent.click(within(modal).getByRole('button', { name: 'Continuar' }));

    // O segundo passo não é decorativo: avisa que o consolidado sai do cadastro.
    expect(within(modal).getByText(/cadastro precisa estar atualizado/i)).toBeInTheDocument();

    await userEvent.click(within(modal).getByRole('button', { name: 'Gerar alteração contratual' }));
    await waitFor(() =>
      expect(mocks.responderEventos).toHaveBeenCalledWith({
        clienteId: 'cliente-1',
        pjPessoaId: 'empresa-1',
        documentoBaseId: 'doc-head',
        respostas: [{ flagId: 'flag-manual-1', flagNome: 'evento_aumento_capital', valor: true }],
      }),
    );
  });

  it('com a alteração em curso, a folha compõe AO VIVO e a validação registra a sucessão', async () => {
    // Respostas já gravadas contra o registrado = alteração em curso.
    mocks.valoresFlagsManuais = [
      {
        id: 'pfv-1', cliente_id: 'cliente-1', pj_pessoa_id: 'empresa-1',
        documento_base_id: 'doc-head', flag_id: 'flag-manual-1', valor: true,
      },
    ];
    const view = render(<GerarDocumento />);
    await escolherModelo();
    mocks.rascunho = registrado();
    view.rerender(<GerarDocumento />);

    // A tela deixou de ser a do registrado: é o documento novo, ainda por validar.
    await screen.findByText('Alteração contratual');
    expect(screen.queryByText('Registrado na junta')).not.toBeInTheDocument();
    expect(screen.getByText('Houve aumento de capital')).toBeInTheDocument();

    const entrada = await validar();
    // O evento entrou nas flags vivas (a resolução compõe) e a raiz do documento
    // novo aponta para a peça que ela substitui.
    expect(entrada.snapshotFlags).toEqual(['evento_aumento_capital', 'e_alteracao']);
    expect(entrada.substituiDocumentoId).toBe('doc-head');
  });

  // --- As duas marcas do registro (D4/D5/D6) -------------------------------
  //
  // Antes, "Validar versão" carimbava o ledger. Selar um rascunho passou a não
  // marcar nada: quem carimba é "Registrar na junta", que é quando o ato produz
  // efeito, e é o mesmo gesto que vira o status do bem — as duas não podem
  // divergir.

  /** Um lançamento do livro, no formato em que a projeção o consome. */
  const movimento = (id: string, extra: Record<string, unknown> = {}) => ({
    id, empresaPessoaId: 'empresa-1', tipo: 'aporte',
    origemPessoaId: null, destinoPessoaId: 'socio-1',
    quotas: 1000, valor: 1000, createdAt: '2026-08-01T00:00:00.000Z',
    dataMovimento: null, atoId: null, sequencia: null,
    documentoGeradoId: null, pagamento: { tipo: 'moeda' },
    ...extra,
  });

  /** A chamada do carimbo, entre as que passaram pelo mutateAsync compartilhado. */
  const chamadaDoCarimbo = () =>
    (mocks.responderEventos.mock.calls as unknown as Array<[Record<string, unknown>]>)
      .map(([arg]) => arg)
      .find((arg) => arg && 'movimentoIds' in arg);

  it('validar NÃO carimba: as marcas irreversíveis esperam o registro', async () => {
    mocks.valoresFlagsManuais = [
      {
        id: 'pfv-1', cliente_id: 'cliente-1', pj_pessoa_id: 'empresa-1',
        documento_base_id: 'doc-head', flag_id: 'flag-manual-1', valor: true,
      },
    ];
    mocks.movimentos = [movimento('mov-1')];
    const view = render(<GerarDocumento />);
    await escolherModelo();
    mocks.rascunho = registrado();
    view.rerender(<GerarDocumento />);
    await screen.findByText('Alteração contratual');

    await validar();
    expect(chamadaDoCarimbo()).toBeUndefined();
  });

  it('registrar o CONTRATO SOCIAL carimba todos os pendentes (é ele que os conta)', async () => {
    // A extensão da D3: sem isto, os aportes de constituição seguiam sem
    // documento e a primeira alteração os recontava ("6 aporte(s)" onde a peça
    // lançou dois).
    mocks.movimentos = [
      movimento('mov-1'),
      movimento('mov-2'),
      movimento('mov-ja-formalizado', { documentoGeradoId: 'doc-antigo' }),
      movimento('mov-de-outra', { empresaPessoaId: 'empresa-2' }),
    ];
    const view = render(<GerarDocumento />);
    await escolherModelo();
    mocks.rascunho = documento();
    view.rerender(<GerarDocumento />);
    await screen.findByText('Versão validada · rascunho');

    await userEvent.click(screen.getByRole('button', { name: 'Registrar na junta' }));
    const confirmacao = await screen.findByRole('alertdialog');
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Registrar na junta' }));

    await waitFor(() => expect(chamadaDoCarimbo()).toBeDefined());
    expect(chamadaDoCarimbo()).toEqual({
      movimentoIds: ['mov-1', 'mov-2'],
      documentoGeradoId: 'doc-head',
      empresaPessoaId: 'empresa-1',
    });
  });

  it('registrar a ALTERAÇÃO carimba só os movimentos dos eventos confirmados', async () => {
    // A alteração já validada: a head é o rascunho que declara substituir a peça
    // registrada, e as respostas do assistente seguem ancoradas nela.
    mocks.valoresFlagsManuais = [
      {
        id: 'pfv-1', cliente_id: 'cliente-1', pj_pessoa_id: 'empresa-1',
        documento_base_id: 'doc-base', flag_id: 'flag-manual-1', valor: true,
      },
    ];
    mocks.movimentos = [movimento('mov-aporte'), movimento('mov-cessao', {
      tipo: 'cessao', origemPessoaId: 'socio-1', destinoPessoaId: 'socio-2',
    })];
    const view = render(<GerarDocumento />);
    await escolherModelo();
    mocks.rascunho = alteracaoValidada();
    view.rerender(<GerarDocumento />);
    await screen.findByText('Versão validada · rascunho');

    await userEvent.click(screen.getByRole('button', { name: 'Registrar na junta' }));
    const confirmacao = await screen.findByRole('alertdialog');
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Registrar na junta' }));

    // Só o aumento de capital foi confirmado: a cessão continua pendente, para a
    // peça seguinte. O que o consultor desmarcou não entrou nesta.
    await waitFor(() => expect(chamadaDoCarimbo()).toBeDefined());
    expect(chamadaDoCarimbo()).toEqual({
      movimentoIds: ['mov-aporte'],
      documentoGeradoId: 'doc-head',
      empresaPessoaId: 'empresa-1',
    });
  });

  it('validada a alteração, "Rever os eventos" continua no rail e reabre com o gravado', async () => {
    // O botão vivia dentro do ramo da alteração em curso, e `alteracaoEmCurso`
    // exige um documento REGISTRADO em cena. Validada a peça, a head passa a ser
    // ela (rascunho) e o assistente ficava inalcançável pela tela.
    mocks.valoresFlagsManuais = [
      {
        id: 'pfv-1', cliente_id: 'cliente-1', pj_pessoa_id: 'empresa-1',
        documento_base_id: 'doc-base', flag_id: 'flag-manual-1', valor: true,
      },
    ];
    const view = render(<GerarDocumento />);
    await escolherModelo();
    mocks.rascunho = alteracaoValidada();
    view.rerender(<GerarDocumento />);
    await screen.findByText('Versão validada · rascunho');

    await userEvent.click(screen.getByRole('button', { name: 'Rever os eventos' }));
    const modal = await screen.findByRole('dialog');
    // A resposta gravada vence a derivação: reabrir é edição, não recomeço.
    expect(within(modal).getByRole('switch', { name: 'Houve aumento de capital' })).toBeChecked();

    // E gravar de novo continua ancorando na peça que a alteração substitui.
    await userEvent.click(within(modal).getByRole('switch', { name: 'Houve aumento de capital' }));
    await userEvent.click(within(modal).getByRole('button', { name: 'Continuar' }));
    await userEvent.click(within(modal).getByRole('button', { name: 'Gerar alteração contratual' }));
    await waitFor(() =>
      expect(mocks.responderEventos).toHaveBeenCalledWith({
        clienteId: 'cliente-1',
        pjPessoaId: 'empresa-1',
        documentoBaseId: 'doc-base',
        respostas: [{ flagId: 'flag-manual-1', flagNome: 'evento_aumento_capital', valor: false }],
      }),
    );
  });

  it('modelo de escopo avulso não oferece alteração contratual nem registro na junta', async () => {
    // Quem participa da vida societária é DECLARADO no modelo. Antes a condição
    // era ter bloco pendurado em evento, o que fazia configuração de redação
    // decidir regra de processo: despendurar as flags de um contrato social
    // escondia o botão sem ninguém ter pedido.
    mocks.modelos[0].escopo = 'avulso';
    await abrirRegistrado();

    expect(screen.getByText('Registrado na junta')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Gerar alteração contratual' }),
    ).not.toBeInTheDocument();
  });

  it('modelo de sociedade SEM bloco pendurado em evento continua oferecendo alteração', async () => {
    mocks.docBlocos[1].bloco.flags = [];
    await abrirRegistrado();

    expect(
      screen.getByRole('button', { name: 'Gerar alteração contratual' }),
    ).toBeInTheDocument();
  });
});
