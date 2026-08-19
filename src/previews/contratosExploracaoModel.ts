import type { MatriculaRow } from '@/hooks/useDiagnosticoPatrimonial';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';

// Modelo e fixtures do preview isolado da ALE-3 (docs/osg/levantamento-contratos-rurais.md).
// Nenhum destes tipos/valores é lido do banco — são dados fixos, só para o
// componente renderizar de forma realista sem consulta nenhuma. Se a ALE-3 for
// aprovada, o rascunho abaixo é o ponto de partida do hook real da próxima sprint.

export type TipoExploracao = 'parceria' | 'composse';

export interface CompossuidorDraft {
  id: string;
  pessoaId: string | null;
  fracao: string;
}

export interface ParteExtraDraft {
  id: string;
  papel: string;
  pessoaId: string | null;
}

/** Pessoa sem fração própria — usado pelos exploradores da Parceria, ver `ExploracaoRuralDraft.exploradores`. */
export interface ParteSimplesDraft {
  id: string;
  pessoaId: string | null;
}

// CONFIRMADO em reunião de validação com a OSG (Luana, 19/08/2026): este campo
// só existe na Composse — numa Parceria a origem sempre é a própria matrícula
// (a parceria não pode vir de outra parceria nem de uma composse; "trava na
// composse"). "Composse" não é um valor válido aqui: se um terceiro quer
// participar dos frutos, ele entra na composse existente, não cria uma
// parceria nova sobre ela. "Exploração própria" substitui o "Outro" genérico
// que cobria esse caso — é o nome que a própria OSG usa.
export const TIPOS_INSTRUMENTO_ORIGEM = ['Parceria', 'Arrendamento', 'Exploração própria', 'Herança', 'Outro'];

export interface ExploracaoImovelDraft {
  id: string;
  ref: string;
  matriculaId: string | null;
  areaExplorada: string;
  /**
   * Por imóvel, não pelo instrumento inteiro — [BV-COM] tem 6 origens distintas numa só
   * composse. CONFIRMADO em reunião de validação (Luana, 19/08/2026): só faz sentido na
   * Composse — numa Parceria a origem é sempre a própria matrícula, nunca outro instrumento.
   */
  tipoInstrumentoOrigem: string;
  instrumentoOrigemRef: string | null;
  /** Estado computado (não digitado): se a Parceria de origem deste imóvel ainda vigora. */
  situacaoOrigem: 'vigente' | 'encerrada';
}

export interface ExploracaoRuralDraft {
  // Instrumento — existe
  referencia: string;
  tipo: TipoExploracao;
  dataAssinatura: string;
  dataEncerramento: string;
  vigencia: string;
  declaradoIrpf: boolean;
  // Instrumento — novo
  vigenciaProrrogavel: boolean;
  /** Por quanto tempo renova quando prorrogável — sem contrato real com essa cláusula ainda, ver pendência na seção 2. */
  prazoRenovacaoVigencia: string;

  // Imóvel e áreas: não é campo do cabeçalho — mora inteiro na lista `imoveis`
  // (aba "Imóveis e origens"), porque um instrumento pode cobrir mais de uma
  // matrícula (`[BV-COM]`: 15 imóveis numa só composse). Consolidado em
  // 14/08/2026: havia um campo de matrícula única aqui, desconectado da lista,
  // que duplicava a mesma informação sem sincronia.

  // Partes — existe. CONFIRMADO em reunião de validação com a OSG (Luana,
  // 19/08/2026): outorgante é sempre único — se duas empresas diferentes
  // cedem, são duas parcerias separadas, nunca uma com dois outorgantes.
  // (Tentativa anterior, de 19/08 mais cedo, tinha isso como lista por
  // analogia com `[BV-PAR]`; a reunião corrigiu.)
  outorganteId: string | null;
  // Explorador pode ser vários (`[BV-PAR]` tem 3 outorgados numa parceria
  // só, confirmado), mas SEM fração própria aqui — o percentual individual de
  // cada um só existe na composse (ver `compossuidores` abaixo); na parceria
  // só o agregado `percentualOutorgante`/`percentualExplorador`.
  exploradores: ParteSimplesDraft[];
  // Partes — novo
  compossuidores: CompossuidorDraft[];
  partesExtras: ParteExtraDraft[];

  // Percentual e produção — novo
  percentualOutorgante: string;
  percentualExplorador: string;
  percentualVigenteDesde: string;
  termoAditivoReferencia: string;
  culturas: string;
  benfeitoriasIndenizaveis: boolean;
  permitePenhor: boolean;
  prazoIndivisao: string;
  indivisaoProrrogavel: boolean;
  /** CONFIRMADO em [BV-COM], Cláusula Quarta: renova por período igual a `prazoIndivisao`, salvo aviso até este prazo antes do vencimento. */
  indivisaoAvisoPrazo: string;
  // Percentual e produção — existe, mas em lugar errado (`exploracao_rural.sacas_por_hectare`)
  sacasPorHectare: string;

  // Documento de origem — existe
  estudoFiscalDocumentoId: string | null;
  documentoComprobatorioId: string | null;

  // Imóveis e origens — aba própria (existe + novo, ver ExploracaoImovelDraft). Tipo e
  // referência do instrumento de origem moram por imóvel, não aqui — [BV-COM] mostra até
  // 6 origens diferentes numa única composse.
  imoveis: ExploracaoImovelDraft[];

  // Assinatura — novo. Achados ao escrever `docs/osg/contratos_exploracao/05-` e
  // `06-modelo-*-rural.md`: campos que TODO contrato real tem, sem coluna em
  // lugar nenhum do banco (confirmado por consulta ao schema, 19/08/2026) — se
  // não entrarem aqui, ficam de fora mesmo que a tela vire produção.
  foroComarca: string;
  foroUf: string;
  testemunha1Nome: string;
  testemunha2Nome: string;
  /** Só relevante quando o outorgante é PJ. Sem coluna em `pessoa` nem em `quadro_societario` hoje. */
  capitalSocialOutorgante: string;

  // Administração (Composse) — novo. Achado #9: `[BV-COM]` autoriza atos por
  // "maioria dos percentuais"; `[ROS-COM]` nomeia 2 compossuidores fixos. Sem
  // regra padrão única, sem coluna em lugar nenhum.
  regraAdministracao: 'maioria' | 'nomeados';
  administradoresNomeados: ParteSimplesDraft[];

  // Liquidação de haveres (Composse) — novo. Achado #9: `[BV-COM]` usa 60
  // parcelas mensais; `[ROS-COM]` usa 10 parcelas anuais. Sem coluna em lugar
  // nenhum.
  liquidacaoPeriodicidade: 'mensal' | 'anual';
  liquidacaoNumeroParcelas: string;
}

/** Nome que a composse "gira" — 1º compossuidor listado + "E OUTROS". Confirmado em `[BV-COM]` e `[ROS-COM]`; sempre derivado, nunca digitado. */
export function nomeComposseDe(compossuidores: CompossuidorDraft[], pessoas: PessoaRow[]): string {
  const primeiro = compossuidores[0];
  if (!primeiro?.pessoaId) return '';
  const pessoa = pessoas.find((p) => p.id === primeiro.pessoaId);
  return pessoa ? `${pessoa.denominacao.toUpperCase()} E OUTROS` : '';
}

let seq = 0;
const nextId = (prefixo: string) => `${prefixo}-${(seq += 1)}`;

export function emptyExploracaoDraft(tipo: TipoExploracao = 'parceria'): ExploracaoRuralDraft {
  return {
    referencia: '',
    tipo,
    dataAssinatura: '',
    dataEncerramento: '',
    vigencia: '',
    declaradoIrpf: false,
    vigenciaProrrogavel: true,
    prazoRenovacaoVigencia: '',
    outorganteId: null,
    exploradores: [],
    compossuidores: [],
    partesExtras: [],
    percentualOutorgante: '',
    percentualExplorador: '',
    percentualVigenteDesde: '',
    termoAditivoReferencia: '',
    culturas: '',
    benfeitoriasIndenizaveis: false,
    permitePenhor: false,
    prazoIndivisao: '3 anos',
    indivisaoProrrogavel: true,
    indivisaoAvisoPrazo: '3 meses antes do vencimento',
    sacasPorHectare: '',
    estudoFiscalDocumentoId: null,
    documentoComprobatorioId: null,
    imoveis: [],
    foroComarca: '',
    foroUf: '',
    testemunha1Nome: '',
    testemunha2Nome: '',
    capitalSocialOutorgante: '',
    regraAdministracao: 'maioria',
    administradoresNomeados: [],
    liquidacaoPeriodicidade: 'mensal',
    liquidacaoNumeroParcelas: '',
  };
}

/** Molde com todas as colunas de `matricula`, pra fixture não precisar repetir os ~30 campos. */
function matriculaFixtureBase(overrides: Partial<MatriculaRow>): MatriculaRow {
  return {
    id: nextId('matricula'),
    cliente_id: 'cliente-fixture',
    numero: '0',
    cartorio_id: 'cartorio-fixture',
    livro: null,
    folha: null,
    data_matricula: null,
    tipo_bem: 'IR',
    municipio_imovel: '',
    uf_imovel: 'MT',
    area_documento: 0,
    area_real: null,
    area_explorada: null,
    area_unidade: 'ha',
    georreferenciado: null,
    georref_prejudica_transferencia: null,
    vlr_contabil: null,
    vlr_contabil_ajustado: null,
    vlr_benfeitorias: null,
    vlr_mercado: null,
    vlr_imposto_anual: null,
    imposto_anual_exercicio: null,
    tipo_exploracao_posse: null,
    matricula_anterior_id: null,
    matricula_anterior_texto: null,
    origem_descricao: null,
    confrontacoes_texto: null,
    descricao_psa_completa: null,
    bem_id: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

function pessoaFixtureBase(overrides: Partial<PessoaRow>): PessoaRow {
  return {
    id: nextId('pessoa'),
    cliente_id: 'cliente-fixture',
    tipo_pessoa: 'PF',
    denominacao: '',
    cpf_cnpj: null,
    conjuge_id: null,
    contribuinte_id: null,
    data_constituicao: null,
    data_nascimento: null,
    documento_identidade_numero: null,
    documento_identidade_orgao: null,
    documento_identidade_tipo: null,
    documento_identidade_uf: null,
    endereco_bairro: null,
    endereco_cep: null,
    endereco_complemento: null,
    endereco_logradouro: null,
    endereco_municipio: null,
    endereco_numero: null,
    endereco_uf: null,
    estado_civil: null,
    filiacao_mae: null,
    filiacao_mae_pessoa_id: null,
    filiacao_pai: null,
    filiacao_pai_pessoa_id: null,
    genero: null,
    is_fundador: false,
    junta_comercial_uf: null,
    nacionalidade: null,
    naturalidade_municipio: null,
    naturalidade_uf: null,
    nire: null,
    objeto_social: null,
    profissao: null,
    regime_bens: null,
    status_constituicao: null,
    tipo_empresa: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

/** Espelha `cartorio` (nome_completo/comarca/uf) — confirmado via Supabase MCP em 19/08/2026. */
export interface CartorioFixture {
  id: string;
  nome_completo: string;
  comarca: string;
  uf: string;
}

export const cartoriosFixture: CartorioFixture[] = [
  { id: 'cartorio-sorriso', nome_completo: 'Cartório do Registro de Imóveis de Sorriso', comarca: 'Sorriso', uf: 'MT' },
  { id: 'cartorio-lucas', nome_completo: 'Cartório do Registro de Imóveis de Lucas do Rio Verde', comarca: 'Lucas do Rio Verde', uf: 'MT' },
  { id: 'cartorio-nova-mutum', nome_completo: 'Cartório do Registro de Imóveis de Nova Mutum', comarca: 'Nova Mutum', uf: 'MT' },
];

export const matriculasFixture: MatriculaRow[] = [
  matriculaFixtureBase({
    numero: '2.424',
    municipio_imovel: 'Sorriso',
    uf_imovel: 'MT',
    cartorio_id: 'cartorio-sorriso',
    area_documento: 284.961,
    area_real: 284.961,
    area_explorada: 234,
    georreferenciado: 'Sim',
    georref_prejudica_transferencia: false,
  }),
  matriculaFixtureBase({
    numero: '2.628',
    municipio_imovel: 'Lucas do Rio Verde',
    uf_imovel: 'MT',
    cartorio_id: 'cartorio-lucas',
    area_documento: 225.548,
    area_real: 225.548,
    area_explorada: 225.548,
    georreferenciado: 'Parcial',
    georref_prejudica_transferencia: true,
  }),
  matriculaFixtureBase({
    numero: '1.010',
    municipio_imovel: 'Nova Mutum',
    uf_imovel: 'MT',
    cartorio_id: 'cartorio-nova-mutum',
    area_documento: 80,
    area_real: 80,
    area_explorada: 80,
    georreferenciado: 'Não',
    georref_prejudica_transferencia: false,
  }),
];

export const pessoasFixture: PessoaRow[] = [
  pessoaFixtureBase({ tipo_pessoa: 'PJ', denominacao: 'Modelo Agro Ltda.', cpf_cnpj: '12.345.678/0001-90' }),
  pessoaFixtureBase({ tipo_pessoa: 'PF', denominacao: 'José da Silva', cpf_cnpj: '123.456.789-00' }),
  pessoaFixtureBase({ tipo_pessoa: 'PF', denominacao: 'Maria Souza', cpf_cnpj: '234.567.890-11' }),
  pessoaFixtureBase({ tipo_pessoa: 'PF', denominacao: 'Pedro Souza', cpf_cnpj: '345.678.901-22' }),
  pessoaFixtureBase({ tipo_pessoa: 'PF', denominacao: 'Antigo Parceiro', cpf_cnpj: '456.789.012-33' }),
];

/** Espelha `administracao` (pj_pessoa_id → administrador_pessoa_id) — mesmo padrão real do `[BV-PAR]`: os outorgados também administram a outorgante PJ. */
export interface AdministradorFixture {
  id: string;
  pjPessoaId: string;
  administradorPessoaId: string;
  cargo: string | null;
}

export const administracaoFixture: AdministradorFixture[] = [
  { id: 'adm-1', pjPessoaId: pessoasFixture[0].id, administradorPessoaId: pessoasFixture[1].id, cargo: 'Administrador' },
  { id: 'adm-2', pjPessoaId: pessoasFixture[0].id, administradorPessoaId: pessoasFixture[2].id, cargo: 'Administradora' },
];

/** Espelha `titularidade` (matricula_id → titular_pessoa_id, com fração) — quem é o dono registrado do imóvel, distinto de quem outorga/explora. */
export interface TitularidadeFixture {
  id: string;
  matriculaId: string;
  titularPessoaId: string;
  fracao: string;
}

export const titularidadeFixture: TitularidadeFixture[] = [
  { id: 'tit-1', matriculaId: matriculasFixture[0].id, titularPessoaId: pessoasFixture[0].id, fracao: '100' },
  { id: 'tit-2', matriculaId: matriculasFixture[1].id, titularPessoaId: pessoasFixture[4].id, fracao: '100' },
  { id: 'tit-3', matriculaId: matriculasFixture[2].id, titularPessoaId: pessoasFixture[0].id, fracao: '100' },
];

export interface ExploracaoListaItemFixture {
  id: string;
  ref: string;
  tipo: TipoExploracao;
  imovelResumo: string;
  areaResumo: string;
  partesResumo: string;
  vigenciaResumo: string;
  situacao: 'vigente' | 'vencido';
}

export const explosacoesListaFixture: ExploracaoListaItemFixture[] = [
  { id: 'er-01', ref: 'ER 01', tipo: 'parceria', imovelResumo: 'Fazenda Boa Vista · Mat. 2.424', areaResumo: '234,00 / 200,68 ha', partesResumo: 'Modelo Agro Ltda. → José da Silva + Maria Souza', vigenciaResumo: '2022–2025', situacao: 'vigente' },
  { id: 'er-02', ref: 'ER 02', tipo: 'composse', imovelResumo: 'Fazenda Boa Vista · Mat. 2.424', areaResumo: '234,00 / 200,68 ha', partesResumo: 'José da Silva + Maria Souza (50/50)', vigenciaResumo: '2022–2025', situacao: 'vigente' },
  { id: 'er-03', ref: 'ER 03', tipo: 'composse', imovelResumo: 'Fazenda Cristal · Mat. 2.628', areaResumo: '225,54 / 225,54 ha', partesResumo: 'José da Silva + 2 compossuidores (70/15/15)', vigenciaResumo: '2020–2027', situacao: 'vigente' },
  { id: 'er-04', ref: 'ER 04', tipo: 'parceria', imovelResumo: 'Sítio Vencido · Mat. 1.010', areaResumo: '80,00 / 80,00 ha', partesResumo: 'Modelo Agro Ltda. → Antigo Parceiro', vigenciaResumo: '2018–2021', situacao: 'vencido' },
];
