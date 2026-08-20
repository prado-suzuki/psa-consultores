import type { MatriculaEnriched } from '@/hooks/useDiagnosticoPatrimonial';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';

// Modelo e fixtures do preview isolado da ALE-3 (docs/osg/levantamento-contratos-rurais.md).
// As fixtures são o modo padrão (roda sem login e sem banco); escolhendo um cliente na
// barra, o preview passa a ler o banco pelos hooks da própria OSG Work — ver
// `ContratosExploracaoPreview.tsx`. Se a ALE-3 for aprovada, o rascunho abaixo é o ponto
// de partida do hook real da próxima sprint.
//
// O que este rascunho contém é **só o que esta tela precisa cadastrar**. Campo que já vem
// de outro cadastro (matrícula, bem, cartório, titularidade, administração, quadro
// societário) não entra aqui nem é re-exibido no formulário — grão do selo redefinido em
// 19/08/2026, ver `SeloCampo.tsx`.

export type TipoExploracao = 'parceria' | 'composse';

/**
 * O enum `osg_tipo_exploracao` no banco tem 6 valores (conferido no schema dev em
 * 19/08/2026): parceria, composse, arrendamento, comodato, condomínio, exploração própria.
 * Esta tela só cadastra os 2 com modelo de cláusula escrito — os outros 4 ficam fora de
 * propósito (decisão de 20/08/2026: não trabalhar com eles nesta sprint).
 */
export const TIPOS_EXPLORACAO_DO_BANCO: { valor: string; rotulo: string }[] = [
  { valor: 'parceria', rotulo: 'Parceria' },
  { valor: 'composse', rotulo: 'Composse' },
];

/** Mesma ideia de `matricula.area_unidade`: quantidade e unidade separadas. */
export type UnidadeDePrazo = 'dias' | 'meses' | 'anos';
export const UNIDADES_DE_PRAZO: UnidadeDePrazo[] = ['dias', 'meses', 'anos'];

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

/**
 * Origem que **não** é um instrumento cadastrado neste sistema. Necessária para o
 * "Considerando V" do modelo de Composse (`06-modelo-composse-rural.md`), que cita, por
 * grupo de imóveis, o título do instrumento de origem, sua data e a qualificação do
 * outorgante daquela origem.
 *
 * Sem isto o `[BV-COM]` real não é reproduzível: das 6 origens dele, **5 são contratos com
 * terceiros que não são clientes da PSA** (Mata do Puba, Santa Cruz, José Alípio/Ariane,
 * Conata, José Hildebrando/Maria Cristina) — não existem como `exploracao_rural` nem como
 * `pessoa`, então não há o que selecionar numa lista de instrumentos cadastrados.
 */
export interface OrigemExternaDraft {
  /** Título literal do instrumento, que varia: [BV-COM] usa 3 nomes diferentes. */
  tituloInstrumento: string;
  dataAssinatura: string;
  outorganteNome: string;
  outorganteCpfCnpj: string;
  outorganteMunicipio: string;
  outorganteUf: string;
  /**
   * NIRE, capital social e administradores da outorgante da origem: exigência literal do
   * template oficial da banca ("Qualificação completa da empresa, que deverá conter o NIRE
   * e o capital social na data da assinatura, bem como dos administradores").
   * O capital é o **da data da assinatura da origem** — valor histórico, não o atual, logo
   * não se deriva de `v_quadro_societario` nem quando a empresa é cliente.
   */
  outorganteNire: string;
  outorganteCapitalSocialNaAssinatura: string;
  outorganteAdministradores: string;
}

export function emptyOrigemExterna(): OrigemExternaDraft {
  return {
    tituloInstrumento: '', dataAssinatura: '', outorganteNome: '', outorganteCpfCnpj: '',
    outorganteMunicipio: '', outorganteUf: '', outorganteNire: '',
    outorganteCapitalSocialNaAssinatura: '', outorganteAdministradores: '',
  };
}

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
  /** Origem que já é um instrumento cadastrado aqui (ex.: "ER 01"). */
  instrumentoOrigemRef: string | null;
  /** Origem de fora do sistema — preenchida à mão quando o outorgante da origem não é cliente. */
  origemExterna: OrigemExternaDraft | null;
  /** Estado computado (não digitado): se a Parceria de origem deste imóvel ainda vigora. */
  situacaoOrigem: 'vigente' | 'encerrada';
}

export interface ExploracaoRuralDraft {
  // Instrumento
  // `referencia` (ER 01, ER 02…) saiu em 19/08/2026: é identificador interno, não aparece em
  // nenhum dos dois modelos de contrato, e a tela numera sozinha.
  //
  // `vigencia` (texto) saiu na mesma data: era a coluna legada `exploracao_rural.vigencia`
  // duplicando `data_assinatura`/`data_encerramento`. A migração deve apagar a legada e
  // manter as duas datas.
  tipo: TipoExploracao;
  dataAssinatura: string;
  dataEncerramento: string;
  /**
   * **Fora do formulário de propósito.** Não serve ao contrato: quem consome é o
   * relatório fiscal (`FiscalReport.tsx:72` tem a coluna "Decl. IRPF" lendo
   * `exploracao_rural.declarado_irpf`). A coluna existe e nenhuma tela grava nela, então
   * hoje aquela coluna do relatório fica em "—" para sempre.
   *
   * Fica no rascunho porque é dado do registro, mas sem campo na tela até a OSG decidir a
   * pergunta que o levantamento já registra: pertence a este cadastro ou só ao relatório?
   */
  declaradoIrpf: boolean;
  // Instrumento (segue)
  vigenciaProrrogavel: boolean;
  /** Por quanto tempo renova quando prorrogável — sem contrato real com essa cláusula ainda, ver pendência na seção 2. */
  prazoRenovacaoVigencia: string;

  // Imóvel e áreas: não é campo do cabeçalho — mora inteiro na lista `imoveis`
  // (aba "Imóveis e origens"), porque um instrumento pode cobrir mais de uma
  // matrícula (`[BV-COM]`: 15 imóveis numa só composse). Consolidado em
  // 14/08/2026: havia um campo de matrícula única aqui, desconectado da lista,
  // que duplicava a mesma informação sem sincronia.

  // Partes. CONFIRMADO em reunião de validação com a OSG (Luana,
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
  // Partes (segue)
  compossuidores: CompossuidorDraft[];
  /**
   * **Fora do formulário desde 19/08/2026.** Anuente/interveniente/garantidor não
   * aparecem em nenhum dos 5 contratos reais transcritos em `docs/notebooklm/` (grep:
   * zero ocorrências) — a origem era uma célula da planilha de Diagnóstico Patrimonial
   * do Nodari, não texto de contrato. Na reunião de validação a consultora descartou:
   * "isso daí não precisaria, a gente não tá colocando mais". O que o contrato real tem
   * é a cláusula "DA ANUÊNCIA" ([BV-PAR], 14ª), que é a outorgante autorizando penhor —
   * coberta pela flag `permitePenhor`, não por um papel de parte.
   * Fica no rascunho para o dia em que aparecer contrato que use.
   */
  partesExtras: ParteExtraDraft[];

  // Percentual — só na Parceria. Corte agregado entre o lado outorgante e o lado
  // outorgados, nunca por pessoa (OSG, 19/08/2026).
  //
  // Remuneração por QUANTIDADE FIXA (sacas/ha) foi descartada em 19/08/2026, depois de
  // rastrear o lastro: (1) a citação de "contrato real de cana-de-açúcar, quantidade por
  // tramo" em `01-campos.md` **não tem chave de fonte** — nenhum cliente, nenhum arquivo;
  // (2) `[NOD-DP]` é uma **planilha** de Diagnóstico Patrimonial de um cliente **TAX, não
  // OSG**; (3) nenhum dos dois modelos oficiais tem cláusula de quantidade fixa; (4) a
  // reunião de validação declarou fora de escopo contrato com preço em dólar/saca ("quem faz
  // é a trading, o produtor só assina"); (5) os planejamentos tributários do Fiscal são todos
  // em percentual. A coluna `exploracao_rural.sacas_por_hectare` existe e está morta (0
  // linhas) — coluna não prova prática, foi o erro do selo "existe".
  percentualOutorgante: string;
  percentualExplorador: string;

  /**
   * Só Parceria. O template oficial troca "AGROPECUÁRIA" por "AGRÍCOLA" em 3 lugares (título,
   * caput da vigência, título do capítulo de atividades) conforme a exploração inclui pecuária
   * ou não — valor padrão do template é AGROPECUÁRIA. Achado em 20/08/2026 ao comparar com um
   * mapeamento externo: ficou sem campo na tela desde 19/08 (o motor tinha os dois campos de
   * contexto prontos, `naturezaExploracao`/`naturezaExploracaoPlural`, só hard-coded).
   */
  incluiPecuaria: boolean;

  culturas: string;
  permitePenhor: boolean;

  // Indivisão (Composse)
  /**
   * Quantidade + unidade, não texto livre (pendência de 14/08 resolvida em 19/08/2026). A
   * composse nova do Franciosi provou o custo do texto livre: ficou "pelo prazo de 10 (dez)
   * anos… renovando-se o prazo de 03 (três) anos sucessivamente" — o "3 anos" sobrou do
   * template e ninguém viu. Com número + unidade, o texto sai derivado e não contradiz.
   */
  prazoIndivisaoQuantidade: string;
  prazoIndivisaoUnidade: UnidadeDePrazo;
  indivisaoProrrogavel: boolean;
  /** CONFIRMADO em [BV-COM], Cláusula Quarta: renova por período igual ao prazo de indivisão, salvo aviso com esta antecedência. */
  indivisaoAvisoQuantidade: string;
  indivisaoAvisoUnidade: UnidadeDePrazo;

  // Documento de origem
  estudoFiscalDocumentoId: string | null;
  documentoComprobatorioId: string | null;

  // Imóveis e origens — aba própria (existe + novo, ver ExploracaoImovelDraft). Tipo e
  // referência do instrumento de origem moram por imóvel, não aqui — [BV-COM] mostra até
  // 6 origens diferentes numa única composse.
  imoveis: ExploracaoImovelDraft[];

  // Assinatura. Achados ao escrever `docs/osg/contratos_exploracao/05-` e
  // `06-modelo-*-rural.md`: campos que TODO contrato real tem, sem coluna em
  // lugar nenhum do banco (confirmado por consulta ao schema, 19/08/2026) — se
  // não entrarem aqui, ficam de fora mesmo que a tela vire produção.
  foroComarca: string;
  foroUf: string;
  /** Nome, CPF e RG: é o que o bloco de assinatura dos dois templates oficiais pede. */
  testemunha1Nome: string;
  testemunha1Cpf: string;
  testemunha1Rg: string;
  testemunha2Nome: string;
  testemunha2Cpf: string;
  testemunha2Rg: string;
  /** Quantas vias assinadas. Varia nos contratos reais: `[BV-PAR]` 4 vias, `[BV-COM]` 3 vias. */
  numeroVias: string;

  // Administração (Composse). Achado #9: `[BV-COM]` autoriza atos por
  // "maioria dos percentuais"; `[ROS-COM]` nomeia 2 compossuidores fixos. Sem
  // regra padrão única, sem coluna em lugar nenhum.
  regraAdministracao: 'maioria' | 'nomeados';
  administradoresNomeados: ParteSimplesDraft[];

  // Liquidação de haveres (Composse). Achado #9: `[BV-COM]` usa 60
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

/**
 * Campos de `pessoa` que o preâmbulo dos dois modelos de contrato exige de cada parte.
 * Serve para avisar, no cadastro, que a qualificação está incompleta — o contrato sairia
 * com lacuna no meio da frase, e o cadastro rural não tem como saber isso sozinho.
 *
 * Não é hipótese: no schema dev (19/08/2026), de 87 pessoas físicas só 21 têm
 * naturalidade, 41 data de nascimento, 35 filiação e 53 regime de bens.
 */
const CAMPOS_CONTRATO_PF: { campo: keyof PessoaRow; rotulo: string; soParteExploradora?: boolean }[] = [
  { campo: 'cpf_cnpj', rotulo: 'CPF' },
  { campo: 'nacionalidade', rotulo: 'nacionalidade' },
  { campo: 'naturalidade_municipio', rotulo: 'naturalidade' },
  { campo: 'data_nascimento', rotulo: 'data de nascimento' },
  { campo: 'profissao', rotulo: 'profissão' },
  { campo: 'estado_civil', rotulo: 'estado civil' },
  { campo: 'regime_bens', rotulo: 'regime de bens' },
  { campo: 'documento_identidade_numero', rotulo: 'RG' },
  { campo: 'endereco_logradouro', rotulo: 'endereço' },
  { campo: 'endereco_municipio', rotulo: 'município' },
  // Só o preâmbulo de explorador/compossuidor traz "filh[o/a] de X e Y"; o do outorgante não.
  { campo: 'filiacao_pai', rotulo: 'filiação (pai)', soParteExploradora: true },
  { campo: 'filiacao_mae', rotulo: 'filiação (mãe)', soParteExploradora: true },
];

const CAMPOS_CONTRATO_PJ: { campo: keyof PessoaRow; rotulo: string }[] = [
  { campo: 'cpf_cnpj', rotulo: 'CNPJ' },
  { campo: 'junta_comercial_uf', rotulo: 'UF da Junta Comercial' },
  { campo: 'nire', rotulo: 'NIRE' },
  { campo: 'endereco_logradouro', rotulo: 'endereço da sede' },
  { campo: 'endereco_municipio', rotulo: 'município da sede' },
];

/** Rótulos dos campos que faltam para esta pessoa entrar no contrato sem lacuna. */
export function camposFaltandoNaQualificacao(pessoa: PessoaRow | null, opcoes?: { parteExploradora?: boolean }): string[] {
  if (!pessoa) return [];
  const lista = pessoa.tipo_pessoa === 'PJ'
    ? CAMPOS_CONTRATO_PJ
    : CAMPOS_CONTRATO_PF.filter((c) => !c.soParteExploradora || opcoes?.parteExploradora);
  return lista.filter(({ campo }) => {
    const valor = pessoa[campo];
    return valor == null || valor === '';
  }).map((c) => c.rotulo);
}

let seq = 0;
const nextId = (prefixo: string) => `${prefixo}-${(seq += 1)}`;

export function emptyExploracaoDraft(tipo: TipoExploracao = 'parceria'): ExploracaoRuralDraft {
  return {
    tipo,
    dataAssinatura: '',
    dataEncerramento: '',
    declaradoIrpf: false,
    vigenciaProrrogavel: true,
    prazoRenovacaoVigencia: '',
    outorganteId: null,
    exploradores: [],
    compossuidores: [],
    partesExtras: [],
    percentualOutorgante: '',
    percentualExplorador: '',
    incluiPecuaria: true,
    culturas: '',
    permitePenhor: false,
    prazoIndivisaoQuantidade: '3',
    prazoIndivisaoUnidade: 'anos',
    indivisaoProrrogavel: true,
    indivisaoAvisoQuantidade: '3',
    indivisaoAvisoUnidade: 'meses',
    estudoFiscalDocumentoId: null,
    documentoComprobatorioId: null,
    imoveis: [],
    foroComarca: '',
    foroUf: '',
    testemunha1Nome: '', testemunha1Cpf: '', testemunha1Rg: '',
    testemunha2Nome: '', testemunha2Cpf: '', testemunha2Rg: '',
    numeroVias: '',
    regraAdministracao: 'maioria',
    administradoresNomeados: [],
    liquidacaoPeriodicidade: 'mensal',
    liquidacaoNumeroParcelas: '',
  };
}

/**
 * Molde com todas as colunas de `matricula` **mais** os campos que `useAllMatriculas`
 * devolve por join (`MatriculaEnriched`: bem_denominacao, cartorio_*, cliente_nome) — a
 * fixture precisa da mesma forma que o modo "banco real" usa, porque é o que o preview do
 * contrato lê pra montar "denominado {{imovel.nomeImovel}}" e "Cartório de {{...}}".
 */
function matriculaFixtureBase(overrides: Partial<MatriculaEnriched>): MatriculaEnriched {
  return {
    id: nextId('matricula'),
    bem_referencia: null,
    bem_denominacao: null,
    bem_cliente_id: null,
    cliente_nome: null,
    titular_cliente_ids: [],
    cartorio_nome: null,
    cartorio_comarca: null,
    cartorio_uf: null,
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

export const matriculasFixture: MatriculaEnriched[] = [
  matriculaFixtureBase({
    numero: '2.424',
    municipio_imovel: 'Sorriso',
    uf_imovel: 'MT',
    cartorio_id: 'cartorio-sorriso',
    bem_id: 'bem-boa-vista',
    area_documento: 284.961,
    area_real: 284.961,
    area_explorada: 234,
    georreferenciado: 'Sim',
    georref_prejudica_transferencia: false,
    confrontacoes_texto: 'Ao Norte com a Fazenda São Judas; ao Sul com o Córrego do Lobo; a Leste com a Rodovia MT-242; a Oeste com a Fazenda Santa Helena.',
    bem_denominacao: 'Fazenda Boa Vista',
    cartorio_nome: 'Cartório do Registro de Imóveis de Sorriso',
    cartorio_comarca: 'Sorriso',
    cartorio_uf: 'MT',
    // Proprietário = a própria outorgante (Modelo Agro) — caso simples, o mesmo dono cede o que já é seu.
    cliente_nome: 'Modelo Agro Ltda.',
  }),
  matriculaFixtureBase({
    numero: '2.628',
    municipio_imovel: 'Lucas do Rio Verde',
    uf_imovel: 'MT',
    cartorio_id: 'cartorio-lucas',
    bem_id: 'bem-cristal',
    area_documento: 225.548,
    area_real: 225.548,
    area_explorada: 225.548,
    georreferenciado: 'Parcial',
    georref_prejudica_transferencia: true,
    confrontacoes_texto: 'Ao Norte com a Gleba I da mesma fazenda; ao Sul e a Leste com terras de terceiros; a Oeste com a estrada vicinal.',
    bem_denominacao: 'Fazenda Cristal',
    cartorio_nome: 'Cartório do Registro de Imóveis de Lucas do Rio Verde',
    cartorio_comarca: 'Lucas do Rio Verde',
    cartorio_uf: 'MT',
    // Proprietário diferente do outorgante — demonstra o caso [BV-COM] (Anexo com donos distintos).
    cliente_nome: 'Agropecuária Mata do Puba Ltda.',
  }),
  matriculaFixtureBase({
    numero: '1.010',
    municipio_imovel: 'Nova Mutum',
    uf_imovel: 'MT',
    cartorio_id: 'cartorio-nova-mutum',
    bem_id: 'bem-sitio-vencido',
    area_documento: 80,
    area_real: 80,
    area_explorada: 80,
    georreferenciado: 'Não',
    georref_prejudica_transferencia: false,
    bem_denominacao: 'Sítio Vencido',
    cartorio_nome: 'Cartório do Registro de Imóveis de Nova Mutum',
    cartorio_comarca: 'Nova Mutum',
    cartorio_uf: 'MT',
    cliente_nome: 'Modelo Agro Ltda.',
  }),
];

// Qualificação preenchida de propósito em graus diferentes: José está completo, Maria e Pedro
// têm lacunas — é assim que o banco real está hoje (de 87 PF no dev, só 21 têm naturalidade e
// 35 têm filiação), e é o que o aviso de qualificação incompleta precisa mostrar.
export const pessoasFixture: PessoaRow[] = [
  pessoaFixtureBase({
    tipo_pessoa: 'PJ', denominacao: 'Modelo Agro Ltda.', cpf_cnpj: '12.345.678/0001-90',
    junta_comercial_uf: 'MT', nire: '51204567890',
    endereco_logradouro: 'Rodovia MT-242, km 108, s/n — Zona Rural', endereco_municipio: 'Sorriso', endereco_uf: 'MT',
  }),
  pessoaFixtureBase({
    tipo_pessoa: 'PF', denominacao: 'José da Silva', cpf_cnpj: '123.456.789-00',
    nacionalidade: 'brasileiro', naturalidade_municipio: 'Vacaria', naturalidade_uf: 'RS',
    data_nascimento: '1957-09-23', profissao: 'produtor rural', estado_civil: 'casado', regime_bens: 'comunhão universal de bens',
    documento_identidade_numero: '809.793-3', documento_identidade_orgao: 'SESP/MT',
    filiacao_pai: 'Cristiano da Silva', filiacao_mae: 'Gentila Furlan da Silva',
    endereco_logradouro: 'Rua Jorge Amado', endereco_numero: '556', endereco_bairro: 'Jardim Paraíso',
    endereco_municipio: 'Sorriso', endereco_uf: 'MT', endereco_cep: '78890-000',
  }),
  pessoaFixtureBase({
    tipo_pessoa: 'PF', denominacao: 'Maria Souza', cpf_cnpj: '234.567.890-11',
    nacionalidade: 'brasileira', profissao: 'produtora rural', estado_civil: 'casada',
    documento_identidade_numero: '08.235.316-60', documento_identidade_orgao: 'SSP/MT',
    endereco_logradouro: 'Rodovia MT-449, km 12', endereco_municipio: 'Sorriso', endereco_uf: 'MT',
  }),
  pessoaFixtureBase({
    tipo_pessoa: 'PF', denominacao: 'Pedro Souza', cpf_cnpj: '345.678.901-22',
    nacionalidade: 'brasileiro', profissao: 'agricultor',
    endereco_logradouro: 'Rua 24 de Junho', endereco_numero: '205', endereco_municipio: 'Sorriso', endereco_uf: 'MT',
  }),
  pessoaFixtureBase({ tipo_pessoa: 'PF', denominacao: 'Antigo Parceiro', cpf_cnpj: '456.789.012-33' }),
];

/**
 * Administradores e capital social da(s) PJ da fixture — só usados quando o preview do
 * contrato roda em modo exemplo (sem cliente selecionado). Em modo banco real, o mesmo dado
 * vem de `useAdministracaoByPj`/`useQuadroSocietarioByEmpresa`, que não retornam nada para
 * um `pessoaId` fictício.
 */
export const ADMINISTRADORES_FIXTURE_POR_PJ: Record<string, string[]> = {
  [pessoasFixture[0].id]: ['José da Silva', 'Maria Souza'],
};
/** Valor cru (não formatado) — `mapearSociedade` (motor real) formata pra "R$ 8.050.169,00" na hora de montar o contexto. */
export const CAPITAL_SOCIAL_FIXTURE_POR_PJ: Record<string, number> = {
  [pessoasFixture[0].id]: 8_050_169,
};


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
