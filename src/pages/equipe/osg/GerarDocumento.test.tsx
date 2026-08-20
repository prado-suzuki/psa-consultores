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
  vazia: [] as unknown[],
  empresa: {
    id: 'empresa-1', denominacao: 'Acme Participações Ltda.', tipo_pessoa: 'PJ',
    tipo_empresa: 'CN', cpf_cnpj: '12.345.678/0001-90', objeto_social: 'Participações',
    nire: null, junta_comercial_uf: null, data_constituicao: null, endereco_logradouro: null,
    endereco_numero: null, endereco_complemento: null, endereco_bairro: null,
    endereco_municipio: null, endereco_uf: null, endereco_cep: null,
  },
  modelos: [
    { id: 'modelo-1', nome: 'Contrato Social', tipo: 'societario', descricao: 'Modelo principal', ativo: true, num_blocos: 2 },
    { id: 'modelo-2', nome: 'Modelo alternativo', tipo: 'agrario', descricao: null, ativo: true, num_blocos: 1 },
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
  // Catálogo da Biblioteca (useBlocos): cabeças com as variantes aninhadas, que é
  // de onde o controller monta o registro de famílias do render.
  catalogoBlocos: [] as unknown[],
  matriculas: [] as unknown[],
  socios: [] as unknown[],
  integralizacoes: [] as unknown[],
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

// Só as queries são mockadas: montarRegistroFamilias é função pura da Biblioteca
// e entra de verdade, para o controller montar o registro como em produção.
vi.mock('@/hooks/useBibliotecaModelos', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/useBibliotecaModelos')>()),
  useBlocos: () => ({ data: mocks.catalogoBlocos }),
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
    quadroGravado: mocks.socios.length > 0,
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
  gerado_por_id: 'autor-1', status: 'rascunho',
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
  mocks.matriculas = [];
  mocks.socios = [];
  mocks.integralizacoes = [];
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
        socios: [], administradores: [], integralizacoes: [], imoveis: [], signatarios: [], vertices: [],
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
