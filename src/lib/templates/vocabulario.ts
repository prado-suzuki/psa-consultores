import { areaExtenso, cardinalExtenso, percentualExtenso, valorExtenso } from './extenso';
import { PARES, concordarTexto, ufPorExtenso, type Genero } from './concordancia';

// Vocabulário de campos organizado POR ENTIDADE (pessoa/bem/matricula/cartorio).
// Cada placeholder é `binding.campo` (ex.: {{ proprietario.nome }}, {{ imovel.area }});
// o binding (papel) define o tipo de entidade — ver binding.ts. Aqui mora só o
// catálogo de campos de cada tipo e a derivação (extensos / concordância) usada
// tanto pelos mapeadores (dados do banco) quanto na edição manual da tela Gerar.

export type TipoCampo = 'texto' | 'textarea' | 'area' | 'valor' | 'inteiro';

export type TipoEntidade = 'pessoa' | 'sociedade' | 'bem' | 'matricula' | 'cartorio';

export interface CampoEntidade {
  /** Id do campo dentro da entidade (parte após o ponto no placeholder). */
  id: string;
  label: string;
  tipo: TipoCampo;
  /** Se presente, é um campo DERIVADO de outro(s) (não é entrada direta no form). */
  derivadoDe?: string | string[];
  /** Recalcula o valor do campo a partir dos demais (extensos, concordância). */
  derivar?: (valores: Record<string, string>) => string;
}

export interface Entidade {
  tipo: TipoEntidade;
  label: string;
  campos: CampoEntidade[];
}

/** Lê um número de uma string em formato pt-BR ("396,4000 ha", "558.413,55") ou cru ("396.4"). */
function paraNumeroBR(bruto: string | undefined): number {
  const limpo = (bruto ?? '').replace(/[^\d.,-]/g, '').trim();
  if (!limpo) return NaN;
  // Com vírgula: ponto é separador de milhar, vírgula é decimal.
  if (limpo.includes(',')) return Number(limpo.replace(/\./g, '').replace(',', '.'));
  return Number(limpo);
}

function paraInteiro(bruto: string | undefined): number {
  const t = (bruto ?? '').trim();
  if (t === '') return NaN;
  return Number(t);
}

/** Lê um inteiro pt-BR com separador de milhar ("4.234.822") ou cru ("1500"). */
function paraInteiroBR(bruto: string | undefined): number {
  const digitos = (bruto ?? '').replace(/\D/g, '');
  return digitos ? Number(digitos) : NaN;
}

// --- Campos derivados reutilizáveis -----------------------------------------

const areaExtensoCampo: CampoEntidade = {
  id: 'areaExtenso',
  label: 'Área (por extenso)',
  tipo: 'texto',
  derivadoDe: 'area',
  derivar: (v) => {
    const n = paraNumeroBR(v.area);
    return Number.isFinite(n) ? areaExtenso(n) : '';
  },
};

const valorExtensoCampo: CampoEntidade = {
  id: 'valorExtenso',
  label: 'Valor (por extenso)',
  tipo: 'texto',
  derivadoDe: 'valor',
  derivar: (v) => {
    const n = paraNumeroBR(v.valor);
    return Number.isFinite(n) ? valorExtenso(n) : '';
  },
};

function cardinalCampo(id: string, label: string, derivadoDe: string): CampoEntidade {
  return {
    id,
    label,
    tipo: 'texto',
    derivadoDe,
    derivar: (v) => {
      const n = paraInteiro(v[derivadoDe]);
      return Number.isFinite(n) ? cardinalExtenso(n) : '';
    },
  };
}

/** Campo derivado que expande uma UF (sigla) por extenso ("MT" → "Mato Grosso"). */
function ufExtensoCampo(id: string, label: string, derivadoDe: string): CampoEntidade {
  return {
    id,
    label,
    tipo: 'texto',
    derivadoDe,
    derivar: (v) => ufPorExtenso(v[derivadoDe]),
  };
}

/** Campo de concordância derivado do gênero (ex.: brasileiro → brasileiro/brasileira). */
function concordanciaCampo(
  id: string,
  label: string,
  par: (g: Genero) => string,
): CampoEntidade {
  return {
    id,
    label,
    tipo: 'texto',
    derivadoDe: 'genero',
    derivar: (v) => par((v.genero || null) as Genero),
  };
}

// --- Qualificação completa (parágrafo canônico do preâmbulo) ------------------

/** Redação em prosa dos regimes de bens cadastráveis (opções do PessoaModal). */
const REGIME_PROSA: Record<string, string> = {
  'comunhão parcial': 'comunhão parcial de bens',
  'comunhão universal': 'comunhão universal de bens',
  'separação total': 'separação total de bens',
  'separação obrigatória': 'separação obrigatória de bens',
  'participação final nos aquestos': 'participação final nos aquestos',
};

function regimeProsa(regime: string): string {
  return REGIME_PROSA[regime.trim().toLowerCase()] ?? regime.toLowerCase();
}

/**
 * Estado civil em prosa: "casado em regime de comunhão universal de bens",
 * "solteira, nascida em 04/06/1969" (a Junta exige a data para solteiros),
 * "viúva", "em união estável sob o regime de…".
 */
function estadoCivilProsa(v: Record<string, string>): string {
  const g = (v.genero || null) as Genero;
  const concordado = concordarTexto(v.estadoCivil, g).toLowerCase();
  if (!concordado) return '';
  if (concordado.startsWith('casad')) {
    return v.regimeBens ? `${concordado} em regime de ${regimeProsa(v.regimeBens)}` : concordado;
  }
  if (concordado === 'união estável') {
    return v.regimeBens
      ? `em união estável sob o regime de ${regimeProsa(v.regimeBens)}`
      : 'em união estável';
  }
  if (concordado.startsWith('solteir') && v.dataNascimento) {
    return `${concordado}, ${PARES.nascido(g)} em ${v.dataNascimento}`;
  }
  return concordado;
}

// Tipos de logradouro masculinos — o resto (rua, avenida, rodovia, praça…) é "na".
const LOGRADOURO_MASCULINO =
  /^(largo|beco|sítio|sitio|loteamento|condomínio|condominio|distrito|jardim|parque|núcleo|nucleo|povoado|residencial|conjunto|setor)\b/i;

/** Preposição contraída do endereço: "na Rua…", "no Largo…". */
function naEndereco(endereco: string): string {
  return LOGRADOURO_MASCULINO.test(endereco.trim()) ? `no ${endereco}` : `na ${endereco}`;
}

/** "o senhor X…" → "pelo senhor X…" (contração de "por" na voz passiva). */
function porContraido(texto: string): string {
  if (/^o\s/i.test(texto)) return `pelo ${texto.slice(2)}`;
  if (/^a\s/i.test(texto)) return `pela ${texto.slice(2)}`;
  return `por ${texto}`;
}

/**
 * Monta o parágrafo canônico de qualificação (preâmbulo de contratos) num único
 * campo derivado — em vez de encadear nome/nacionalidade/estado civil/RG/CPF/
 * endereço placeholder a placeholder no modelo. PF tem estado civil, regime e
 * nascimento condicionais; PJ tem CNPJ, NIRE/Junta, sede e — quando presente
 * (sócia PJ numa lista) — o representante. Campo ausente é omitido em vez de
 * travar; a redação vive em código (vocabulário = responsabilidade dev).
 */
function montarQualificacao(v: Record<string, string>): string {
  // Caixa alta + *negrito* (marca inline de marcas.ts), como nos contratos da casa.
  const nome = v.nome ? `*${v.nome.toLocaleUpperCase('pt-BR')}*` : '';
  if (v.tipoPessoa === 'PJ') {
    return [
      nome,
      'pessoa jurídica de direito privado',
      v.cpfCnpj && `inscrita no CNPJ/MF sob o nº ${v.cpfCnpj}`,
      v.nire &&
        `registrada na Junta Comercial${
          v.juntaComercialUf ? ` do Estado de ${ufPorExtenso(v.juntaComercialUf)}` : ''
        } sob o nº ${v.nire}`,
      v.endereco && `com sede estabelecida ${naEndereco(v.endereco)}`,
      v.representante && `neste ato representada ${porContraido(v.representante)}`,
    ].filter(Boolean).join(', ');
  }
  const g = (v.genero || null) as Genero;
  const nacionalidade = v.nacionalidade
    ? /brasileir/i.test(v.nacionalidade)
      ? PARES.brasileiro(g)
      : v.nacionalidade.toLowerCase()
    : '';
  return [
    nome,
    nacionalidade,
    estadoCivilProsa(v),
    v.profissao,
    v.rg && `${PARES.portador(g)} do RG nº ${v.rg}${v.orgaoExpedidor ? ` ${v.orgaoExpedidor}` : ''}`,
    v.cpfCnpj && `${PARES.inscrito(g)} no CPF/MF sob o nº ${v.cpfCnpj}`,
    v.endereco && `${PARES.residente(g)} ${naEndereco(v.endereco)}`,
  ].filter(Boolean).join(', ');
}

// --- Catálogo de entidades ---------------------------------------------------

export const ENTIDADES: Record<TipoEntidade, Entidade> = {
  pessoa: {
    tipo: 'pessoa',
    label: 'Pessoa',
    campos: [
      { id: 'nome', label: 'Nome / Denominação', tipo: 'texto' },
      { id: 'tipoPessoa', label: 'Tipo de pessoa (PF/PJ)', tipo: 'texto' },
      { id: 'cpfCnpj', label: 'CPF / CNPJ', tipo: 'texto' },
      { id: 'nacionalidade', label: 'Nacionalidade', tipo: 'texto' },
      { id: 'estadoCivil', label: 'Estado civil', tipo: 'texto' },
      { id: 'regimeBens', label: 'Regime de bens', tipo: 'texto' },
      { id: 'dataNascimento', label: 'Data de nascimento', tipo: 'texto' },
      { id: 'profissao', label: 'Profissão', tipo: 'texto' },
      { id: 'rg', label: 'Documento de identidade', tipo: 'texto' },
      { id: 'orgaoExpedidor', label: 'Órgão expedidor', tipo: 'texto' },
      { id: 'endereco', label: 'Endereço', tipo: 'texto' },
      { id: 'nire', label: 'NIRE (registro na Junta)', tipo: 'texto' },
      { id: 'juntaComercialUf', label: 'UF da Junta Comercial', tipo: 'texto' },
      { id: 'genero', label: 'Gênero (M/F)', tipo: 'texto' },
      // Concordância de gênero (campos derivados, sem nova sintaxe no template).
      concordanciaCampo('artigo', 'Artigo (o/a)', PARES.artigo),
      concordanciaCampo('brasileiro', 'Nacionalidade concordada (brasileiro/a)', PARES.brasileiro),
      concordanciaCampo('nascido', 'Nascido(a)', PARES.nascido),
      concordanciaCampo('portador', 'Portador(a)', PARES.portador),
      concordanciaCampo('residente', 'Residente e domiciliado(a)', PARES.residente),
      concordanciaCampo('inscrito', 'Inscrito(a)', PARES.inscrito),
      concordanciaCampo('peloSocio', 'Pelo sócio / Pela sócia', PARES.peloSocio),
      {
        id: 'nomeMaiusculo',
        label: 'Nome em caixa alta',
        tipo: 'texto',
        derivadoDe: 'nome',
        derivar: (v) => (v.nome ?? '').toLocaleUpperCase('pt-BR'),
      },
      {
        id: 'casado',
        label: 'Estado civil concordado (casado/a)',
        tipo: 'texto',
        derivadoDe: 'estadoCivil',
        derivar: (v) => concordarTexto(v.estadoCivil, (v.genero || null) as Genero),
      },
      {
        id: 'qualificacao',
        label: 'Qualificação completa',
        tipo: 'textarea',
        derivadoDe: [
          'nome', 'tipoPessoa', 'cpfCnpj', 'nacionalidade', 'estadoCivil', 'regimeBens',
          'dataNascimento', 'profissao', 'rg', 'orgaoExpedidor', 'endereco',
          'nire', 'juntaComercialUf', 'genero',
        ],
        derivar: montarQualificacao,
      },
    ],
  },
  // A PJ que é OBJETO do documento (a sociedade sendo constituída/alterada) —
  // distinta de `pessoa` (sócios, administradores…). Campos atômicos da sede
  // (município/UF/CEP) e a redação em prosa (`sede`), preenchidos pelo mapeador
  // a partir da pessoa PJ; o contrato a chama de "a Sociedade".
  sociedade: {
    tipo: 'sociedade',
    label: 'Sociedade',
    campos: [
      { id: 'razaoSocial', label: 'Razão social', tipo: 'texto' },
      { id: 'cnpj', label: 'CNPJ', tipo: 'texto' },
      { id: 'nire', label: 'NIRE (registro na Junta)', tipo: 'texto' },
      { id: 'juntaUf', label: 'UF da Junta Comercial', tipo: 'texto' },
      ufExtensoCampo('juntaUfExtenso', 'Junta Comercial — Estado por extenso', 'juntaUf'),
      { id: 'dataConstituicao', label: 'Data de constituição', tipo: 'texto' },
      { id: 'objeto', label: 'Objeto social', tipo: 'textarea' },
      // Capital social e quotas: calculados na geração (calcularCapitalSociedade
      // em mapeadores.ts — PR soma as integralizações aprovadas; demais somam o
      // quadro societário), aqui só os campos + extensos derivados (editáveis).
      { id: 'capitalValor', label: 'Capital social (R$)', tipo: 'valor' },
      {
        id: 'capitalExtenso',
        label: 'Capital social (por extenso)',
        tipo: 'texto',
        derivadoDe: 'capitalValor',
        derivar: (v) => {
          const n = paraNumeroBR(v.capitalValor);
          return Number.isFinite(n) ? valorExtenso(n) : '';
        },
      },
      { id: 'totalQuotas', label: 'Total de quotas', tipo: 'inteiro' },
      {
        id: 'totalQuotasExtenso',
        label: 'Total de quotas (por extenso)',
        tipo: 'texto',
        derivadoDe: 'totalQuotas',
        derivar: (v) => {
          const n = paraInteiroBR(v.totalQuotas);
          return Number.isFinite(n) ? cardinalExtenso(n) : '';
        },
      },
      // Sede completa em prosa ("Rua X, nº 119, bairro Centro, no município de…")
      // mais as partes atômicas (cobrem os placeholders legados sedeEndereco/
      // sedeMunicipio/sedeUf/sedeCep, agora sob o namespace sociedade.*).
      { id: 'sede', label: 'Sede (endereço completo)', tipo: 'textarea' },
      { id: 'sedeEndereco', label: 'Sede — logradouro e número', tipo: 'texto' },
      { id: 'sedeBairro', label: 'Sede — bairro', tipo: 'texto' },
      { id: 'sedeMunicipio', label: 'Sede — município', tipo: 'texto' },
      { id: 'sedeUf', label: 'Sede — UF', tipo: 'texto' },
      ufExtensoCampo('sedeUfExtenso', 'Sede — Estado por extenso', 'sedeUf'),
      { id: 'sedeCep', label: 'Sede — CEP', tipo: 'texto' },
    ],
  },
  bem: {
    tipo: 'bem',
    label: 'Bem',
    campos: [
      { id: 'denominacao', label: 'Denominação', tipo: 'texto' },
      { id: 'referencia', label: 'Referência (DP)', tipo: 'texto' },
      { id: 'tipo', label: 'Tipo do bem', tipo: 'texto' },
      { id: 'valor', label: 'Valor contábil (R$)', tipo: 'valor' },
      valorExtensoCampo,
      { id: 'ccir', label: 'Cadastro do imóvel rural (CCIR/SNCR)', tipo: 'texto' },
      { id: 'inscricaoMunicipal', label: 'Inscrição municipal', tipo: 'texto' },
    ],
  },
  matricula: {
    tipo: 'matricula',
    label: 'Imóvel / Matrícula',
    campos: [
      { id: 'numero', label: 'Nº da matrícula', tipo: 'texto' },
      { id: 'livro', label: 'Livro', tipo: 'texto' },
      cardinalCampo('livroExtenso', 'Livro (por extenso)', 'livro'),
      { id: 'folha', label: 'Folha / Ficha', tipo: 'texto' },
      cardinalCampo('folhaExtenso', 'Folha (por extenso)', 'folha'),
      { id: 'municipio', label: 'Município do imóvel', tipo: 'texto' },
      { id: 'uf', label: 'Estado (UF) do imóvel', tipo: 'texto' },
      { id: 'area', label: 'Área (hectares)', tipo: 'area' },
      areaExtensoCampo,
      { id: 'valor', label: 'Valor contábil (R$)', tipo: 'valor' },
      valorExtensoCampo,
      { id: 'denominacao', label: 'Denominação', tipo: 'texto' },
      { id: 'proprietario', label: 'Proprietário(s)', tipo: 'texto' },
      // Fração integralizada (composse/condomínio): o titular integralizador
      // lidera ({{ imovel.percentual }} de um imóvel… de propriedade dele) e os
      // demais viram a área remanescente. Preenchidos pelo mapeador a partir da
      // titularidade; ausentes ⇒ forma inteira ("de propriedade de A, B e C").
      { id: 'percentual', label: 'Fração integralizada (%)', tipo: 'texto' },
      {
        id: 'percentualExtenso',
        label: 'Fração integralizada (por extenso)',
        tipo: 'texto',
        derivadoDe: 'percentual',
        derivar: (v) => {
          const n = paraNumeroBR(v.percentual);
          return Number.isFinite(n) ? percentualExtenso(n) : '';
        },
      },
      { id: 'remanescente', label: 'Titulares da área remanescente', tipo: 'texto' },
      {
        // Condicional para {{#imovel.fracionado}}…{{/imovel.fracionado}}: verdadeiro
        // quando há fração E remanescente. Sempre definido (derivado) para a seção
        // não quebrar quando o imóvel é inteiro.
        id: 'fracionado',
        label: 'É fração? (condicional)',
        tipo: 'texto',
        derivadoDe: ['percentual', 'remanescente'],
        derivar: (v) => (v.percentual && v.remanescente ? 'sim' : ''),
      },
      {
        // Oposto de fracionado ("Um imóvel rural…" × "X% de um imóvel rural…"):
        // o engine não tem "else", então cada ramo tem sua condicional.
        id: 'inteiro',
        label: 'É imóvel inteiro? (condicional, oposto de fracionado)',
        tipo: 'texto',
        derivadoDe: ['percentual', 'remanescente'],
        derivar: (v) => (v.percentual && v.remanescente ? '' : 'sim'),
      },
      { id: 'cartorio', label: 'Cartório', tipo: 'texto' },
      { id: 'comarca', label: 'Comarca', tipo: 'texto' },
      { id: 'ufCartorio', label: 'Estado (UF) do cartório', tipo: 'texto' },
      { id: 'ccir', label: 'Cadastro do imóvel rural (CCIR/SNCR)', tipo: 'texto' },
      { id: 'confrontacoes', label: 'Limites e confrontações', tipo: 'textarea' },
    ],
  },
  cartorio: {
    tipo: 'cartorio',
    label: 'Cartório',
    campos: [
      { id: 'nome', label: 'Nome do cartório', tipo: 'texto' },
      { id: 'comarca', label: 'Comarca', tipo: 'texto' },
      { id: 'uf', label: 'Estado (UF)', tipo: 'texto' },
    ],
  },
};

export const TIPOS_ENTIDADE = Object.keys(ENTIDADES) as TipoEntidade[];

export function camposDaEntidade(tipo: TipoEntidade): CampoEntidade[] {
  return ENTIDADES[tipo].campos;
}

export function campoDaEntidade(tipo: TipoEntidade, id: string): CampoEntidade | undefined {
  return ENTIDADES[tipo].campos.find((c) => c.id === id);
}

/**
 * Recalcula os campos derivados (extensos, concordância) de uma entidade a partir
 * dos valores atuais. Usado pelos mapeadores (após preencher os campos-base com os
 * dados do banco) e na edição manual da tela Gerar.
 */
export function derivarCampos(
  tipo: TipoEntidade,
  valores: Record<string, string>,
): Record<string, string> {
  const out = { ...valores };
  for (const campo of ENTIDADES[tipo].campos) {
    if (campo.derivar) out[campo.id] = campo.derivar(out);
  }
  return out;
}
