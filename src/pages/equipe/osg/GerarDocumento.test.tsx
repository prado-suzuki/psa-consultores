import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { SnapshotDados } from '@/hooks/useDocumentoGerado';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { mapearSociedade } from '@/lib/templates/mapeadores';
import { confirmarPropostaAC } from '@/lib/osg/alteracaoPorEventos';
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
  /** A proposta confirmada vira a head da alteração, em rascunho e por validar. */
  confirmarProposta: vi.fn(async (input: Record<string, unknown>) => ({
    id: 'doc-proposta', documento_raiz_id: 'doc-proposta', status: 'rascunho', papel: 'alterador',
    substitui_documento_id: input.documentoBaseId, snapshot_dados: input.snapshotDados,
    snapshot_flags: input.snapshotFlags, snapshot_versoes_blocos: null, snapshot_validado_em: null,
  })),
  enviarArquivoRegistrado: vi.fn(async () => 'arquivo-registrado-1'),
  registrarDocumento: vi.fn(async () => ({
    id: 'doc-head', documento_raiz_id: 'doc-raiz', status: 'registrado',
    snapshot_dados: null, snapshot_flags: [], substitui_documento_id: null,
  })),
  completarRegistro: vi.fn(async (input: Record<string, unknown>) => ({
    id: input.documentoGeradoId, documento_raiz_id: 'doc-raiz', status: 'registrado',
    snapshot_dados: null, snapshot_flags: [], substitui_documento_id: null,
  })),
  /** As peças desta sociedade que já foram à junta (useRegistradosDaSociedade). */
  pecasRegistradas: [] as unknown[],
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
  /** O documento REGISTRADO que uma alteração validada declara substituir (useDocumentoGeradoPorId). */
  base: null as Record<string, unknown> | null,
  /** pj_pessoa_id com constitutivo REGISTRADO (useConstitutivosRegistrados). */
  constitutivosRegistrados: new Set<string>(),
  /** documento_gerado que substitui a peça base (useDocumentoSucessor). */
  sucessor: null as Record<string, unknown> | null,
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
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
// O upload do PDF registrado passa pelo broker autenticado; aqui só a assinatura.
vi.mock('@/hooks/useApiAuth', () => ({ useApiAuth: () => ({ fetchWithAuth: vi.fn() }) }));

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
  // As sociedades que já existem na junta: é o fato que a trava do constitutivo
  // lê para saber se validar criaria um SEGUNDO contrato social da mesma PJ.
  useConstitutivosRegistrados: () => ({ data: mocks.constitutivosRegistrados }),
  useDocumentoGeradoPorId: (id: string | null) => ({ data: id && mocks.base?.id === id ? mocks.base : null }),
  useRegistrarDocumento: () => ({ mutateAsync: mocks.registrarDocumento, isPending: false }),
  // O marco da junta pode chegar depois do registro: esta é a única escrita que
  // a peça registrada aceita, e vale para qualquer peça registrada da sociedade.
  useCompletarRegistroContratual: () => ({ mutateAsync: mocks.completarRegistro, isPending: false }),
  useRegistradosDaSociedade: () => ({ data: mocks.pecasRegistradas }),
  useConfirmarPropostaAC: () => ({ mutateAsync: mocks.confirmarProposta, isPending: false }),
  useEnviarArquivoRegistrado: () => ({ mutateAsync: mocks.enviarArquivoRegistrado, isPending: false }),
  // A peça que já sucede a base, se existir: é ela que impede "Gerar alteração
  // contratual" de abrir uma SEGUNDA alteração sobre o mesmo antecessor.
  useDocumentoSucessor: () => ({ data: mocks.sucessor }),
  // Elos até a base da sucessão: com o registrado servindo de base, a peça em
  // composição é a primeira alteração (0 + 1). A proposta confirmada já sucede a
  // registrada no banco, e a conta dela dá 1.
  useOrdemNaSucessao: (_clienteId: string | null, id: string | null) => ({ data: id === 'doc-proposta' ? 1 : 0 }),
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

/** O marco do registro, preenchido como o consultor faria; devolve o diálogo. */
async function preencherRegistro(opcoes: { arquivo?: boolean } = {}) {
  const dialogo = await screen.findByRole('dialog', { name: /Registrar na junta/ });
  await userEvent.type(within(dialogo).getByLabelText(/Protocolo na junta/), 'MTP2600012345');
  fireEvent.change(within(dialogo).getByLabelText(/Data do registro/), { target: { value: '2026-08-10' } });
  await userEvent.type(within(dialogo).getByLabelText(/Número do arquivamento/), '51200123456');
  const uf = within(dialogo).getByLabelText(/^UF/);
  await userEvent.clear(uf);
  await userEvent.type(uf, 'MT');
  if (opcoes.arquivo !== false) {
    const arquivo = new File(['%PDF-1.4'], 'registrado.pdf', { type: 'application/pdf' });
    await userEvent.upload(within(dialogo).getByLabelText(/PDF registrado/), arquivo);
  }
  return dialogo;
}

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
  mocks.base = null;
  mocks.constitutivosRegistrados = new Set();
  mocks.pecasRegistradas = [];
  mocks.sucessor = null;
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
      // O contrato social formaliza todos os pendentes; aqui não há nenhum, e o
      // vazio é declarado (é o que o registro lê, não a lista viva).
      movimentosFormalizados: [],
      valoresLivres: { observacao: 'Observação viva' }, empresaId: 'empresa-1',
      itensPorLista: {
        socios: [], administradores: [], integralizacoes: [], cessoes: [],
        // Coleções da doação são congeladas mesmo vazias: assim uma versão não
        // passa a narrar ônus criado depois de sua validação.
        doacoes: [], usufrutos: [], gravamesQuotas: [], quadroUsufruto: [],
        // `retirantes` entrou com a cláusula de retirada da AC de concentração:
        // lista nova é lista congelada no snapshot, como as demais.
        retirantes: [],
        // `requalificados` entrou com a resolução de endereço de sócio. Vazia
        // fora de uma alteração: quem a compõe é o estado proposto, dos
        // candidatos confirmados no assistente.
        requalificados: [],
        imoveis: [], signatarios: [], vertices: [], memoriais: [],
      },
      total: null,
    });
    // Snapshot da versão = blocos resolvidos + famílias citadas (nenhuma aqui).
    expect(payload.snapshotVersoesBlocos.blocos.map((bloco: { id: string }) => bloco.id)).toEqual(['posicao-1', 'posicao-2']);
    expect(payload.snapshotVersoesBlocos.familias).toEqual({});
  });

  it('hidrata SnapshotDados antigo, mantém o documento congelado e religa a proveniência do acervo', async () => {
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
      'Contrato Social (versão 1)', expect.arrayContaining([expect.objectContaining({ id: 'posicao-1' })]), true,
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
      // "n.º", com ponto: é a abreviação da casa, contada no corpus dos
      // assinados em 02/09/2026 — 68 contra 8 nos instrumentos agrários e 71
      // contra 2 nos Contratos Sociais. Ver `numeroProsa` em vocabulario.ts.
      await screen.findByText(/Um imóvel urbano na Avenida das Itaúbas, n\.º 3255/),
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
      'Contrato Social', expect.arrayContaining([expect.objectContaining({ id: 'posicao-1' })]), true,
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
      'Modelo alternativo', expect.arrayContaining([expect.objectContaining({ id: 'posicao-1' })]), true,
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

  it('com erro de composição, "Atualizar do cadastro" também fica fechado', async () => {
    // Era o único dos três gestos de selagem sem o porteiro: recongelava o
    // snapshot por cima da folha em erro, com o mesmo estrago permanente.
    mocks.docBlocos[0].bloco.conteudo = CITA_ANCORA_ORFA;
    await abrirDocumentoCongelado();

    const atualizar = screen.getByRole('button', { name: /Atualizar do cadastro/i });
    expect(atualizar).toBeDisabled();
    await userEvent.click(atualizar);
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
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
    // Contrato social registrado nesta empresa é, no banco, exatamente isto: a
    // sociedade passa a constar como já constituída. É o fato que a trava lê.
    mocks.constitutivosRegistrados = new Set(['empresa-1']);
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

  it('a peça registrada declara que já produziu efeito, e não fala em formalizar', async () => {
    await abrirRegistrado();
    expect(screen.getByText('Contrato social · registrada na junta')).toBeInTheDocument();
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
    const confirmacao = await screen.findByRole('dialog', { name: /Registrar na junta/ });
    expect(within(confirmacao).getByText(/deixa de aceitar edição de bloco/i)).toBeInTheDocument();
    // O mínimo que identifica o ato na junta: sem protocolo e data do registro o
    // gesto não sai, e o diálogo diz por quê.
    expect(within(confirmacao).getByRole('button', { name: 'Registrar na junta' })).toBeDisabled();
    expect(within(confirmacao).getByText(/protocolo e a data do registro identificam o ato/)).toBeInTheDocument();

    await preencherRegistro();
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Registrar na junta' }));
    // O PDF sobe ANTES (não cabe na transação), vinculado à peça e à PJ…
    await waitFor(() => expect(mocks.enviarArquivoRegistrado).toHaveBeenCalledTimes(1));
    expect((mocks.enviarArquivoRegistrado.mock.calls as unknown as Array<[Record<string, unknown>]>)[0][0]).toMatchObject({
      clienteId: 'cliente-1', pjPessoaId: 'empresa-1', documentoGeradoId: 'doc-head',
    });
    // …e o registro leva o marco inteiro, com o arquivo e uma confirmação estável.
    await waitFor(() => expect(mocks.registrarDocumento).toHaveBeenCalledTimes(1));
    expect((mocks.registrarDocumento.mock.calls as unknown as Array<[Record<string, unknown>]>)[0][0]).toMatchObject({
      documentoGeradoId: 'doc-head',
      registro: {
        versao: 1, arquivoId: 'arquivo-registrado-1', protocolo: 'MTP2600012345',
        numeroArquivamento: '51200123456', dataRegistro: '2026-08-10',
        juntaUf: 'MT', junta: 'JUCEMT', confirmacaoId: expect.any(String),
      },
    });
  });

  it('registrar com o mínimo leva só o mínimo, e nem cobra o PDF', async () => {
    // O calendário da junta: o registro sai hoje, o número do arquivamento e o
    // PDF chancelado saem em outro dia. Exigi-los aqui obrigava a inventar valor
    // ou a atrasar o marco do ato.
    const view = render(<GerarDocumento />);
    await escolherModelo();
    mocks.rascunho = documento();
    view.rerender(<GerarDocumento />);
    await screen.findByText('Versão validada · rascunho');

    await userEvent.click(screen.getByRole('button', { name: 'Registrar na junta' }));
    const confirmacao = await screen.findByRole('dialog', { name: /Registrar na junta/ });
    await userEvent.type(within(confirmacao).getByLabelText(/Protocolo na junta/), 'MTP2600012345');
    fireEvent.change(within(confirmacao).getByLabelText(/Data do registro/), { target: { value: '2026-08-10' } });
    expect(within(confirmacao).getByText(/Fica sem número do arquivamento, UF, junta comercial, PDF/)).toBeInTheDocument();
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Registrar na junta' }));

    await waitFor(() => expect(mocks.registrarDocumento).toHaveBeenCalledTimes(1));
    expect(mocks.enviarArquivoRegistrado).not.toHaveBeenCalled();
    // Campo em branco é chave AUSENTE, e não string vazia: o banco recusa a
    // segunda, e ausente é o que diz "a junta ainda não devolveu".
    expect((mocks.registrarDocumento.mock.calls as unknown as Array<[Record<string, unknown>]>)[0][0].registro)
      .toEqual({ versao: 1, confirmacaoId: expect.any(String), protocolo: 'MTP2600012345', dataRegistro: '2026-08-10' });
  });

  it('o marco que faltou é completado depois, em qualquer peça já registrada', async () => {
    // A tela mostra UMA peça (a head); a constituição de dois atos atrás só é
    // alcançável por esta lista, e é nela que o dado costuma faltar.
    mocks.pecasRegistradas = [
      {
        id: 'doc-constituicao', papel: 'constitutivo', createdAt: '2026-08-10T12:00:00Z',
        substituiDocumentoId: null,
        registro: { versao: 1, confirmacaoId: 'conf-1', protocolo: 'MTP2600012345', dataRegistro: '2026-08-10' },
      },
      {
        // Registrada antes de o marco existir: aparece na cadeia, mas não há
        // gesto que a complete (inventar a confirmação de um ato que não teve
        // nenhuma é o que o banco recusa).
        id: 'doc-legado', papel: 'alterador', createdAt: '2026-08-15T12:00:00Z',
        substituiDocumentoId: 'doc-constituicao', registro: null,
      },
      {
        id: 'doc-head', papel: 'alterador', createdAt: '2026-09-01T12:00:00Z',
        substituiDocumentoId: 'doc-legado',
        registro: {
          versao: 1, confirmacaoId: 'conf-2', arquivoId: 'arquivo-1', protocolo: 'MTP2600099999',
          numeroArquivamento: '51200199999', dataRegistro: '2026-08-25', juntaUf: 'MT', junta: 'JUCEMT',
        },
      },
    ];
    const view = render(<GerarDocumento />);
    await escolherModelo();
    mocks.rascunho = documento();
    view.rerender(<GerarDocumento />);
    await screen.findByText('Versão validada · rascunho');

    // O rail diz quantas peças estão com o marco incompleto, sem abrir nada.
    await userEvent.click(await screen.findByRole('button', { name: /Registros na junta/ }));
    expect(screen.getByText(/1 de 3 sem dados completos/)).toBeInTheDocument();
    expect(screen.getByText(/Falta: Número do arquivamento/)).toBeInTheDocument();
    expect(screen.getByText('Marco do registro completo')).toBeInTheDocument();
    expect(screen.getByText(/Registrada antes do marco do registro/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /1ª alteração/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Constituição/ }));
    const dialogo = await screen.findByRole('dialog', { name: /Dados do registro na junta/ });
    // Abre com o que já está gravado, e diz que o resto do documento segue travado.
    expect(within(dialogo).getByLabelText(/Protocolo na junta/)).toHaveValue('MTP2600012345');
    expect(within(dialogo).getByText(/único dado que a peça registrada ainda aceita/)).toBeInTheDocument();
    await userEvent.type(within(dialogo).getByLabelText(/Número do arquivamento/), '51200123456');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar dados do registro' }));

    await waitFor(() => expect(mocks.completarRegistro).toHaveBeenCalledTimes(1));
    // Vai o marco, e só ele: a confirmação do ato e o arquivo eleito são da
    // peça, e quem os preserva é o banco (a trigger recusa trocar os dois).
    expect((mocks.completarRegistro.mock.calls as unknown as Array<[Record<string, unknown>]>)[0][0]).toEqual({
      documentoGeradoId: 'doc-constituicao',
      registro: { protocolo: 'MTP2600012345', dataRegistro: '2026-08-10', numeroArquivamento: '51200123456' },
    });
    // Completar uma peça anterior não registra nada de novo nem toca na head.
    expect(mocks.registrarDocumento).not.toHaveBeenCalled();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it('o registro recusa data no futuro e UF inexistente antes de ir ao banco', async () => {
    const view = render(<GerarDocumento />);
    await escolherModelo();
    mocks.rascunho = documento();
    view.rerender(<GerarDocumento />);
    await screen.findByText('Versão validada · rascunho');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar na junta' }));
    const confirmacao = await preencherRegistro();

    fireEvent.change(within(confirmacao).getByLabelText(/Data do registro/), { target: { value: '2999-01-01' } });
    expect(within(confirmacao).getByText(/não pode estar no futuro/)).toBeInTheDocument();
    expect(within(confirmacao).getByRole('button', { name: 'Registrar na junta' })).toBeDisabled();

    fireEvent.change(within(confirmacao).getByLabelText(/Data do registro/), { target: { value: '2026-08-10' } });
    const uf = within(confirmacao).getByLabelText(/^UF/);
    await userEvent.clear(uf);
    await userEvent.type(uf, 'XX');
    expect(within(confirmacao).getByText(/Essa UF não existe/)).toBeInTheDocument();
    expect(within(confirmacao).getByRole('button', { name: 'Registrar na junta' })).toBeDisabled();
    expect(mocks.registrarDocumento).not.toHaveBeenCalled();
  });

  it('registrado, a peça trava e o caminho adiante é gerar OUTRO documento', async () => {
    await abrirRegistrado();

    // Os gestos que reescreveriam a peça que já valeu ficam VISÍVEIS e travados,
    // com o motivo: botão sumido faz procurar um gesto que existe (foi o que
    // deixou o consultor sem saída no incidente do segundo constitutivo).
    const validar = screen.getByRole('button', { name: /Validar versão/ });
    expect(validar).toBeDisabled();
    expect(validar).toHaveAttribute('title', expect.stringContaining('já foi constituída'));
    const atualizar = screen.getByRole('button', { name: /Atualizar versão/ });
    expect(atualizar).toBeDisabled();
    expect(atualizar).toHaveAttribute('title', expect.stringContaining('alteração contratual'));
    expect(screen.queryByRole('button', { name: 'Atualizar do cadastro' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar na junta' })).not.toBeInTheDocument();
    // E o caminho de saída, este sim clicável.
    expect(screen.getByRole('button', { name: 'Gerar alteração contratual' })).toBeEnabled();
  });

  it('peça que já foi sucedida não gera uma SEGUNDA alteração', async () => {
    // A primeira alteração já nasceu desta peça (em outra aba, ou antes de esta
    // tela carregar). Gerar outra faria duas linhagens apontando para o mesmo
    // antecessor, e as duas se diriam a mesma alteração da sociedade.
    mocks.sucessor = { id: 'doc-alteracao', status: 'rascunho' };
    await abrirRegistrado();

    const gerar = screen.getByRole('button', { name: 'Gerar alteração contratual' });
    expect(gerar).toBeDisabled();
    expect(gerar).toHaveAttribute('title', expect.stringContaining('já tem uma alteração contratual'));
    // E o motivo é lido sem passar o mouse em nada.
    expect(screen.getByText(/Continue naquela/)).toBeInTheDocument();
  });

  it('o assistente grava TODAS as respostas ancoradas no documento registrado, marcadas ou não', async () => {
    await abrirRegistrado();

    await userEvent.click(screen.getByRole('button', { name: 'Gerar alteração contratual' }));
    const modal = await screen.findByRole('dialog');
    await userEvent.click(within(modal).getByRole('switch', { name: 'Houve aumento de capital' }));
    await userEvent.click(within(modal).getByRole('button', { name: 'Continuar' }));

    // O segundo passo não é decorativo: diz a regra da composição antes do gesto.
    expect(within(modal).getByText(/instrumento registrado mais os eventos marcados/i)).toBeInTheDocument();

    await userEvent.click(within(modal).getByRole('button', { name: 'Confirmar alteração contratual' }));
    await waitFor(() =>
      expect(mocks.responderEventos).toHaveBeenCalledWith({
        clienteId: 'cliente-1',
        pjPessoaId: 'empresa-1',
        documentoBaseId: 'doc-head',
        respostas: [{ flagId: 'flag-manual-1', flagNome: 'evento_aumento_capital', valor: true }],
      }),
    );
    // E a PROPOSTA nasce no banco: a head da alteração, por validar, com a base,
    // a seleção e o estado proposto dentro do snapshot.
    await waitFor(() => expect(mocks.confirmarProposta).toHaveBeenCalledTimes(1));
    const proposta = mocks.confirmarProposta.mock.calls[0][0] as Record<string, unknown>;
    expect(proposta).toMatchObject({
      clienteId: 'cliente-1', pjPessoaId: 'empresa-1', modeloId: 'modelo-1', documentoBaseId: 'doc-head',
      snapshotFlags: ['evento_aumento_capital', 'e_alteracao'],
    });
    const dados = proposta.snapshotDados as SnapshotDados;
    expect(dados.propostaAC).toMatchObject({
      versao: 1, baseDocumentoId: 'doc-head', selecionados: [], eventosConfirmados: ['evento_aumento_capital'],
    });
    // O estado proposto é a BASE registrada (o snapshot da peça travada), não o cadastro.
    expect(dados.selecao.sociedade.razaoSocial).toBe('Acme congelada');
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
    // A sociedade JÁ está constituída, e mesmo assim validar segue liberado: a
    // peça que nasce daqui substitui a registrada e nasce 'alterador'. É a
    // fronteira da trava do constitutivo, e ela não pode fechar sobre este caso.
    mocks.constitutivosRegistrados = new Set(['empresa-1']);
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
  // Antes, "Validar versão" carimbava o ledger. Hoje validar só DECIDE o conjunto
  // (`movimentosFormalizados`, congelado no snapshot) e não marca nada; quem
  // carimba e vira o status do bem é o banco, na transação de "Registrar na
  // junta" (trigger `trg_documento_registro_atomico`), que é quando o ato produz
  // efeito — as duas marcas não podem divergir, e por isso nenhuma sai do app.

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

  it('a folha DECLARA onde o consultor está: peça, situação e atos que ela formaliza', async () => {
    // A metade "avisar" do plano: dois atos na mesma peça é legítimo, e o que
    // faltava era a peça dizer o que é. Sem esta linha, uma alteração
    // formalizando mais de um ato parecia concatenação de alterações.
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

    expect(
      await screen.findByText('1ª alteração · em composição, ainda não validada · formalizando 1 ato pendente'),
    ).toBeInTheDocument();
  });

  it('validar o CONTRATO SOCIAL congela todos os pendentes em movimentosFormalizados (é ele que os conta)', async () => {
    // A extensão da D3: sem isto, os aportes de constituição seguiam sem
    // documento e a primeira alteração os recontava ("6 aporte(s)" onde a peça
    // lançou dois). O conjunto é decidido AQUI, na validação, e vai congelado no
    // snapshot: é ele que a trigger de registro carimba, na transação do banco.
    mocks.movimentos = [
      movimento('mov-1'),
      movimento('mov-2'),
      movimento('mov-ja-formalizado', { documentoGeradoId: 'doc-antigo' }),
      movimento('mov-de-outra', { empresaPessoaId: 'empresa-2' }),
    ];
    await abrirDocumentoVivo();

    const entrada = await validar();
    expect(entrada.snapshotDados.movimentosFormalizados).toEqual(['mov-1', 'mov-2']);
    expect(chamadaDoCarimbo()).toBeUndefined();
  });

  it('registrar NÃO carimba por fora: o conjunto congelado já está no snapshot, e quem carimba é o banco', async () => {
    // A trigger `trg_documento_registro_atomico` carimba os movimentos de
    // `movimentosFormalizados` e integraliza os bens deles dentro do mesmo UPDATE
    // que vira o status. Carimbar daqui, depois, é o que a constraint adiada
    // recusa — e um movimento lançado depois de validar (mov-novo) não entra,
    // porque o escopo é o congelado, não a lista viva.
    mocks.movimentos = [movimento('mov-1'), movimento('mov-novo')];
    const view = render(<GerarDocumento />);
    await escolherModelo();
    mocks.rascunho = documento({ ...snapshot(), movimentosFormalizados: ['mov-1'] });
    view.rerender(<GerarDocumento />);
    await screen.findByText('Versão validada · rascunho');

    await userEvent.click(screen.getByRole('button', { name: 'Registrar na junta' }));
    const confirmacao = await preencherRegistro();
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Registrar na junta' }));

    await waitFor(() => expect(mocks.registrarDocumento).toHaveBeenCalledTimes(1));
    expect(chamadaDoCarimbo()).toBeUndefined();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it('validar a ALTERAÇÃO congela só os movimentos dos eventos confirmados', async () => {
    // Só o aumento de capital foi confirmado: a cessão continua pendente, para a
    // peça seguinte. O que o consultor desmarcou não entra no conjunto que o
    // registro vai carimbar.
    mocks.valoresFlagsManuais = [
      {
        id: 'pfv-1', cliente_id: 'cliente-1', pj_pessoa_id: 'empresa-1',
        documento_base_id: 'doc-head', flag_id: 'flag-manual-1', valor: true,
      },
    ];
    mocks.movimentos = [movimento('mov-aporte'), movimento('mov-cessao', {
      tipo: 'cessao', origemPessoaId: 'socio-1', destinoPessoaId: 'socio-2',
    })];
    const view = render(<GerarDocumento />);
    await escolherModelo();
    mocks.rascunho = registrado();
    view.rerender(<GerarDocumento />);
    await screen.findByText('Alteração contratual');

    const entrada = await validar();
    expect(entrada.snapshotDados.movimentosFormalizados).toEqual(['mov-aporte']);
    expect(chamadaDoCarimbo()).toBeUndefined();
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
    // O sucessor da peça base é ESTA alteração (a raiz da linhagem em cena). A
    // trava da sucessão não pode fechar sobre ela: reabrir o assistente da
    // própria alteração é o caminho normal, não uma segunda alteração.
    mocks.sucessor = { id: 'doc-raiz', status: 'rascunho' };
    // A peça registrada que a alteração substitui: é a BASE da comparação e da
    // composição, e sem ela confirmar não tem o que comparar.
    mocks.base = { ...registrado(), id: 'doc-base' };
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
    await userEvent.click(within(modal).getByRole('button', { name: 'Confirmar alteração contratual' }));
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

// --- A alteração por EVENTOS: base registrada + eventos confirmados -----------
//
// O exemplo obrigatório da frente: sede e profissão mudaram no cadastro depois
// do registro; o consultor deixa só a sede marcada. A resolução e o consolidado
// adotam o endereço novo, e NÃO adotam a profissão nova. O cadastro fornece
// candidatos; ele não alimenta o consolidado irrestritamente.

const FLAG_SEDE_MANUAL = {
  id: 'flag-sede', nome: 'evento_alteracao_endereco', tipo: 'manual', escopo: 'documento',
  descricao: 'Mudança de sede', ativo: true, entidade: null, campo: null, valor: null,
};

/** A PJ como estava quando o contrato social foi registrado. */
const ENDERECO_REGISTRADO = {
  endereco_logradouro: 'Avenida Amazonas', endereco_numero: '1000', endereco_complemento: null,
  endereco_bairro: 'Centro', endereco_municipio: 'Lucas do Rio Verde', endereco_uf: 'MT', endereco_cep: '78455-000',
};
/** A PJ hoje: mudou de endereço no mesmo município e UF (o caso homologado). */
const ENDERECO_ATUAL = {
  endereco_logradouro: 'Avenida da Produção', endereco_numero: '2500', endereco_complemento: 'Conj. A',
  endereco_bairro: 'Parque das Emas', endereco_municipio: 'Lucas do Rio Verde', endereco_uf: 'MT', endereco_cep: '78455-100',
};

const socioBase = () => ({
  id: 'socio-1', tipoPessoa: 'PF', nome: 'Ana Souza', cpfCnpj: '111.111.111-11', profissao: 'Médica',
  qualificacao: 'ANA SOUZA, brasileira, médica', quotas: '100', vlrTotal: '100,00', percentual: '100,000%',
});

/** O snapshot que a peça REGISTRADA publicou: sede antiga, sócia médica. */
function baseRegistrada(): SnapshotDados {
  const sociedade = mapearSociedade({ ...empresa, ...ENDERECO_REGISTRADO } as unknown as PessoaRow);
  return {
    selecao: { sociedade: { ...sociedade } },
    registroPorBinding: {}, registrosPorLista: {}, valoresLivres: { observacao: 'Texto selado' },
    empresaId: 'empresa-1',
    itensPorLista: { socios: [{ socio: socioBase(), sePF: true, sePJ: false }], administradores: [], integralizacoes: [], cessoes: [], retirantes: [], signatarios: [] },
    total: { quotas: '100', vlrTotal: '100,00', percentual: '100,000%' },
  };
}

describe('GerarDocumento — alteração por eventos: base registrada + eventos confirmados', () => {
  const enderecoOriginal = { ...empresa };
  beforeEach(() => {
    mocks.flags = [FLAG_MANUAL, FLAG_SEDE_MANUAL];
    mocks.modelos[0].escopo = 'sociedade';
    // O modelo: consolidado com a sede e o quadro, e a resolução de sede
    // pendurada na flag de evento.
    mocks.docBlocos[0].bloco.conteudo = 'Empresa {{ sociedade.razaoSocial }}, com sede em {{ sociedade.sede }}. {{ observacao }}';
    mocks.docBlocos[1].bloco.conteudo = 'Quadro: {{#socios}}{{ socio.nome }}, {{ socio.profissao }}{{/socios}}.';
    mocks.docBlocos.push({
      id: 'posicao-sede', obrigatorio: false,
      bloco: { id: 'biblioteca-sede', nome: 'Resolução de sede', tipo: 'clausula', conteudo: 'RESOLVEM alterar a sede para {{ sociedade.sede }}.', flags: ['evento_alteracao_endereco'], repete_colecao: null, ancora: null },
    });
    // O cadastro de HOJE: endereço novo e a sócia agora engenheira.
    Object.assign(empresa, ENDERECO_ATUAL);
    mocks.socios = [{
      pessoa: { id: 'socio-1', denominacao: 'Ana Souza', tipo_pessoa: 'PF', cpf_cnpj: '111.111.111-11', profissao: 'Engenheira', nacionalidade: 'brasileira', genero: 'F' },
      quotas: 100, vlr_total: 100, representante: null,
    }];
  });
  afterEach(() => {
    mocks.docBlocos.splice(2);
    Object.assign(empresa, enderecoOriginal);
  });

  /** Abre a peça registrada (a base) e o assistente. */
  async function abrirAssistente() {
    const view = render(<GerarDocumento />);
    await escolherModelo();
    mocks.rascunho = registrado(baseRegistrada());
    mocks.base = mocks.rascunho;
    mocks.constitutivosRegistrados = new Set(['empresa-1']);
    view.rerender(<GerarDocumento />);
    await screen.findByText('Registrado na junta');
    await userEvent.click(screen.getByRole('button', { name: 'Gerar alteração contratual' }));
    const modal = await screen.findByRole('dialog');
    return { view, modal };
  }

  /** A linha que `useConfirmarPropostaAC` devolveu: a head da alteração, por validar. */
  const propostaGravada = () =>
    (mocks.confirmarProposta.mock.results as unknown as Array<{ value: Promise<Record<string, unknown>> }>)[0].value;
  /** O texto corrido da folha central (os valores vêm segmentados pela proveniência). */
  const textoDaFolha = () => document.body.textContent ?? '';

  async function confirmar(modal: HTMLElement) {
    await userEvent.click(within(modal).getByRole('button', { name: 'Continuar' }));
    await userEvent.click(within(modal).getByRole('button', { name: 'Confirmar alteração contratual' }));
    await waitFor(() => expect(mocks.confirmarProposta).toHaveBeenCalledTimes(1));
    return mocks.confirmarProposta.mock.calls[0][0] as { snapshotDados: SnapshotDados; snapshotFlags: string[] };
  }

  it('a sede detectada, homologada e com base suficiente vem PRÉ-MARCADA, com antes e depois; a profissão vira pendência', async () => {
    const { modal } = await abrirAssistente();
    const sede = within(modal).getByRole('switch', { name: 'Mudança de sede' });
    expect(sede).toBeChecked();
    // Evidência é o antes → depois, não "alguém editou o endereço".
    expect(within(modal).getByText(/Sede: Avenida Amazonas.*-> Avenida da Produção/)).toBeInTheDocument();
    // Qualificação detectada (profissão) NÃO é evento: é pendência, sem interruptor.
    expect(within(modal).getByText(/Divergências que não viram evento/)).toBeInTheDocument();
    expect(within(modal).getByText(/Qualificacao detectada, sem autorizacao juridica/)).toBeInTheDocument();
    // Detalhe recolhido: campo a campo.
    await userEvent.click(within(modal).getByRole('button', { name: /Ver antes e depois/ }));
    expect(within(modal).getByText('Avenida Amazonas')).toBeInTheDocument();
    expect(within(modal).getByText('Avenida da Produção')).toBeInTheDocument();
  });

  it('confirmar só a sede: o estado proposto adota o endereço novo e mantém a profissão registrada', async () => {
    const { modal } = await abrirAssistente();
    const { snapshotDados, snapshotFlags } = await confirmar(modal);
    expect(snapshotFlags).toEqual(['evento_alteracao_endereco', 'e_alteracao']);
    const soc = snapshotDados.selecao.sociedade;
    expect(soc.sedeLogradouro).toBe('Avenida da Produção');
    expect(soc.sedeNumero).toBe('2500');
    expect(soc.sedeComplemento).toBe('Conj. A');
    expect(soc.sede).toContain('Avenida da Produção');
    // A sócia continua médica: a profissão nova não foi aprovada.
    expect((snapshotDados.itensPorLista.socios[0].socio as Record<string, string>).profissao).toBe('Médica');
    expect(snapshotDados.propostaAC).toMatchObject({
      versao: 1, baseDocumentoId: 'doc-head', selecionados: ['sede:empresa-1'], causaSede: 'mudanca_fisica',
      eventosConfirmados: ['evento_alteracao_endereco'], movimentosConfirmados: [],
    });
    // Movimentos pendentes não entram: nenhum evento de quota foi marcado.
    expect(snapshotDados.total).toEqual(baseRegistrada().total);
    // A base segue intacta dentro da proposta.
    expect(snapshotDados.propostaAC!.base.selecao.sociedade.sedeLogradouro).toBe('Avenida Amazonas');
  });

  it('com a proposta confirmada, a folha compõe base + sede e ainda não pode ir à junta', async () => {
    const { view, modal } = await abrirAssistente();
    await confirmar(modal);
    // A proposta virou a head: rascunho alterador, por validar.
    mocks.rascunho = await propostaGravada();
    view.rerender(<GerarDocumento />);
    await screen.findByText('Alteração contratual · confirmada, por validar');
    // Resolução E consolidado com o endereço novo… (a folha marca cada valor com
    // a proveniência, então o texto se lê pelo conteúdo, não por um nó só)
    await waitFor(() => expect(textoDaFolha()).toMatch(/RESOLVEM alterar a sede para Avenida da Produção, n\.º 2500, Conj\. A/));
    expect(textoDaFolha()).toMatch(/com sede em Avenida da Produção, n\.º 2500/);
    // …e o quadro com a qualificação REGISTRADA, não a do cadastro.
    expect(textoDaFolha()).toMatch(/Ana Souza, Médica/);
    expect(textoDaFolha()).not.toMatch(/Engenheira/);
    // Registrar espera a validação; validar está aberto.
    expect(screen.queryByRole('button', { name: 'Registrar na junta' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Validar versão/ })).toBeEnabled();
    expect(screen.getByText(/1ª alteração · em composição, ainda não validada/)).toBeInTheDocument();
  });

  it('validar sela base + eventos, com a proposta e o escopo de movimentos congelados', async () => {
    const { view, modal } = await abrirAssistente();
    await confirmar(modal);
    mocks.rascunho = await propostaGravada();
    view.rerender(<GerarDocumento />);
    await screen.findByText('Alteração contratual · confirmada, por validar');
    await userEvent.click(screen.getByRole('button', { name: /Validar versão/ }));
    const confirmacao = await screen.findByRole('alertdialog');
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Validar versão' }));
    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledTimes(1));
    const entrada = mocks.mutateAsync.mock.calls[0][0];
    expect(entrada.snapshotDados.propostaAC.selecionados).toEqual(['sede:empresa-1']);
    expect(entrada.snapshotDados.movimentosFormalizados).toEqual([]);
    expect(entrada.snapshotDados.selecao.sociedade.sedeNumero).toBe('2500');
    expect(entrada.snapshotDados.itensPorLista.socios[0].socio.profissao).toBe('Médica');
    // O contexto efetivamente renderizado vai junto, para a versão reproduzir sozinha.
    expect(entrada.snapshotVersoesBlocos.contextoRender.sociedade.sede).toContain('Avenida da Produção');
    // A proposta já gravou a sucessão: validar não a regrava.
    expect(entrada.substituiDocumentoId).toBeNull();
  });

  it('desmarcar a sede significa só "não entra nesta AC": o estado fica como registrado', async () => {
    const { modal } = await abrirAssistente();
    await userEvent.click(within(modal).getByRole('switch', { name: 'Mudança de sede' }));
    const { snapshotDados, snapshotFlags } = await confirmar(modal);
    expect(snapshotFlags).toEqual(['e_alteracao']);
    expect(snapshotDados.selecao.sociedade.sedeLogradouro).toBe('Avenida Amazonas');
    expect(snapshotDados.propostaAC!.selecionados).toEqual([]);
    // A divergência continua registrada na proposta, como candidato: volta a
    // ser sugerida numa próxima conferência.
    expect(snapshotDados.propostaAC!.candidatos.find((c) => c.tipo === 'sede')).toBeDefined();
  });

  it('cancelar o modal não aplica as edições locais, e reabrir volta ao que está gravado', async () => {
    const { modal } = await abrirAssistente();
    await userEvent.click(within(modal).getByRole('switch', { name: 'Mudança de sede' }));
    expect(within(modal).getByRole('switch', { name: 'Mudança de sede' })).not.toBeChecked();
    await userEvent.click(within(modal).getByRole('button', { name: 'Cancelar' }));
    expect(mocks.confirmarProposta).not.toHaveBeenCalled();
    expect(mocks.responderEventos).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Gerar alteração contratual' }));
    const reaberto = await screen.findByRole('dialog');
    // Nada foi gravado: a semente volta a ser a derivação (sede elegível, marcada).
    expect(within(reaberto).getByRole('switch', { name: 'Mudança de sede' })).toBeChecked();
  });

  it('reabrir a proposta confirmada restaura a seleção gravada, inclusive o que foi desmarcado', async () => {
    const { view, modal } = await abrirAssistente();
    await userEvent.click(within(modal).getByRole('switch', { name: 'Mudança de sede' }));
    await confirmar(modal);
    mocks.rascunho = await propostaGravada();
    view.rerender(<GerarDocumento />);
    await screen.findByText('Alteração contratual · confirmada, por validar');
    await userEvent.click(screen.getByRole('button', { name: 'Rever os eventos' }));
    const reaberto = await screen.findByRole('dialog');
    // A proposta gravada vence a derivação: a sede continua desmarcada, mesmo elegível.
    expect(within(reaberto).getByRole('switch', { name: 'Mudança de sede' })).not.toBeChecked();
  });

  it('causa não homologada (atualização postal) bloqueia a confirmação, com o motivo', async () => {
    const { modal } = await abrirAssistente();
    await userEvent.click(within(modal).getByRole('radio', { name: /Atualização postal/ }));
    await userEvent.click(within(modal).getByRole('button', { name: 'Continuar' }));
    expect(within(modal).getByText(/caso não homologado/)).toBeInTheDocument();
    expect(within(modal).getByRole('button', { name: 'Confirmar alteração contratual' })).toBeDisabled();
  });

  it('o cadastro mudou depois da conferência: validar exige nova conferência, sem adotar o valor novo', async () => {
    const view = render(<GerarDocumento />);
    await escolherModelo();
    const base = registrado(baseRegistrada());
    mocks.base = base;
    // A proposta foi confirmada quando a sede era o n.º 2000; hoje o cadastro diz 2500.
    const conferido = mapearSociedade({ ...empresa, ...ENDERECO_ATUAL, endereco_numero: '2000' } as unknown as PessoaRow);
    const atualNaConferencia: SnapshotDados = { ...baseRegistrada(), selecao: { sociedade: { ...conferido } } };
    const propostaAC = confirmarPropostaAC({
      baseDocumentoId: 'doc-head', base: baseRegistrada(), atual: atualNaConferencia, selecionados: ['sede:empresa-1'],
      causaSede: 'mudanca_fisica', confirmadoEm: '2026-09-01T12:00:00.000Z', eventosConfirmados: ['evento_alteracao_endereco'],
    });
    mocks.rascunho = {
      ...documento({ ...propostaAC.estadoProposto, propostaAC }), id: 'doc-proposta', documento_raiz_id: 'doc-proposta',
      papel: 'alterador', substitui_documento_id: 'doc-head', snapshot_validado_em: null,
      snapshot_flags: ['evento_alteracao_endereco', 'e_alteracao'],
    };
    mocks.constitutivosRegistrados = new Set(['empresa-1']);
    view.rerender(<GerarDocumento />);
    await screen.findByText('Alteração contratual · confirmada, por validar');
    // A folha mostra o valor CONFERIDO, não o de hoje: adoção só por nova conferência.
    await waitFor(() => expect(textoDaFolha()).toMatch(/RESOLVEM alterar a sede para Avenida da Produção, n\.º 2000/));
    await userEvent.click(screen.getByRole('button', { name: /Validar versão/ }));
    const confirmacao = await screen.findByRole('alertdialog');
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Validar versão' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'A versão não pode ser validada',
      description: expect.stringContaining('Rever os eventos'),
    })));
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it('a peça registrada sem snapshot de blocos mostra o erro explicativo, não a etapa de escolhas', async () => {
    const view = render(<GerarDocumento />);
    await escolherModelo();
    mocks.rascunho = registrado(baseRegistrada());
    mocks.constitutivosRegistrados = new Set(['empresa-1']);
    view.rerender(<GerarDocumento />);
    await screen.findByText('Registrado na junta');
    expect(screen.getByText(/Não é possível reproduzir esta versão com o snapshot disponível/)).toBeInTheDocument();
    expect(screen.queryByText('Escolha a empresa do contrato')).not.toBeInTheDocument();
  });
});
