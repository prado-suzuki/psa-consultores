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

export const TIPOS_INSTRUMENTO_ORIGEM = ['Parceria', 'Arrendamento', 'Herança', 'Outro'];

export interface ExploracaoImovelDraft {
  id: string;
  ref: string;
  matriculaId: string | null;
  areaExplorada: string;
  /** Por imóvel, não pelo instrumento inteiro — [BV-COM] tem 6 origens distintas numa só composse. */
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

  // Partes — existe
  outorganteId: string | null;
  exploradorId: string | null;
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
    exploradorId: null,
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

export const matriculasFixture: MatriculaRow[] = [
  matriculaFixtureBase({
    numero: '2.424',
    municipio_imovel: 'Sorriso',
    uf_imovel: 'MT',
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
  { id: 'er-01', ref: 'ER 01', tipo: 'parceria', imovelResumo: 'Fazenda Boa Vista · Mat. 2.424', areaResumo: '234,00 / 200,68 ha', partesResumo: 'Modelo Agro Ltda. → José da Silva', vigenciaResumo: '2022–2025', situacao: 'vigente' },
  { id: 'er-02', ref: 'ER 02', tipo: 'composse', imovelResumo: 'Fazenda Boa Vista · Mat. 2.424', areaResumo: '234,00 / 200,68 ha', partesResumo: 'José da Silva + Maria Souza (50/50)', vigenciaResumo: '2022–2025', situacao: 'vigente' },
  { id: 'er-03', ref: 'ER 03', tipo: 'composse', imovelResumo: 'Fazenda Cristal · Mat. 2.628', areaResumo: '225,54 / 225,54 ha', partesResumo: 'José da Silva + 2 compossuidores (70/15/15)', vigenciaResumo: '2020–2027', situacao: 'vigente' },
  { id: 'er-04', ref: 'ER 04', tipo: 'parceria', imovelResumo: 'Sítio Vencido · Mat. 1.010', areaResumo: '80,00 / 80,00 ha', partesResumo: 'Modelo Agro Ltda. → Antigo Parceiro', vigenciaResumo: '2018–2021', situacao: 'vencido' },
];
