import { areaExtenso, cardinalExtenso, percentualExtenso, valorExtenso, type UnidadeArea } from './extenso';
import { PARES, concordarTexto, ufPorExtenso, type Genero } from './concordancia';

// Vocabulário de campos organizado POR ENTIDADE (pessoa/bem/matricula/cartorio).
// Cada placeholder é `binding.campo` (ex.: {{ proprietario.nome }}, {{ imovel.area }});
// o binding (papel) define o tipo de entidade — ver binding.ts. Aqui mora só o
// catálogo de campos de cada tipo e a derivação (extensos / concordância) usada
// tanto pelos mapeadores (dados do banco) quanto na edição manual da tela Gerar.

export type TipoCampo = 'texto' | 'textarea' | 'area' | 'valor' | 'inteiro';

export type TipoEntidade = 'pessoa' | 'sociedade' | 'bem' | 'matricula' | 'cartorio' | 'vertice';

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

// Vocabulário ÚNICO de unidade de área. Dois leitores dependem dele (decidir a
// unidade a partir do campo base `areaUnidade` e retirar o sufixo de exibição de
// `area` antes de converter), e listas separadas foi exatamente o defeito que uma
// delas reconhecer o que a outra ignora: o consultor que trocasse o `m2`
// pré-preenchido por "metros quadrados" caía no default hectare, e o apartamento
// de 360 m² saía "trezentos e sessenta hectares". Um token novo entra aqui e os
// dois leitores passam a conhecê-lo junto.
const TOKEN_AREA_M2 = /m\s*[²2]|metros?\s+quadrados?/;
const TOKEN_AREA_HA = /ha(?:_m2)?|hectares?/;
/** O campo `areaUnidade` INTEIRO nomeia metro quadrado (o resto, inclusive vazio, é hectare). */
const UNIDADE_AREA_M2 = new RegExp(`^\\s*(?:${TOKEN_AREA_M2.source})\\s*$`, 'i');
/** Sufixo de unidade no fim de `area`: é só exibição, sai antes de converter. */
const SUFIXO_UNIDADE_AREA = new RegExp(
  `\\s*(?:${TOKEN_AREA_M2.source}|${TOKEN_AREA_HA.source})\\s*$`,
  'i',
);

/**
 * Unidade da área, lida do campo BASE `areaUnidade` — nunca do sufixo do texto.
 * A unidade é dado, não formatação: adivinhá-la do texto de `area` já produziu
 * extenso na unidade errada (um "360 m2" cujo "2" entrava no número, e um "360"
 * sem sufixo que virava trezentos e sessenta HECTARES num apartamento), e o
 * consultor não teria como corrigir, porque a tela Gerar só expõe campos base e
 * `derivarCampos` reescreve os derivados a cada edição.
 *
 * `area` e `areaUnidade` podem se contradizer (texto "360,00 m²" com unidade
 * "ha", se alguém editar só um dos dois): quem manda é `areaUnidade`, e os dois
 * aparecem lado a lado no painel justamente para o consultor ver a divergência.
 */
function unidadeDaArea(bruto: string | undefined): UnidadeArea {
  return UNIDADE_AREA_M2.test(bruto ?? '') ? 'm2' : 'ha';
}

/**
 * Número de uma área formatada, ignorando o sufixo de unidade ("360,00 m²" → 360;
 * "396,4000 ha" → 396.4; "360" → 360). O que sobra precisa ser UM número pt-BR:
 * texto como "12,5 ha (125.000 m²)" volta NaN em vez de virar 12,5125 ou 125000.
 * Extenso em branco é aceitável, extenso de número errado não é.
 */
function paraAreaNumero(bruto: string | undefined): number {
  const semUnidade = (bruto ?? '').replace(SUFIXO_UNIDADE_AREA, '').trim();
  if (!/^-?[\d.]*\d(?:,\d+)?$/.test(semUnidade)) return NaN;
  // Ponto sem vírgula, em grupos de 3 dígitos, é separador de MILHAR em pt-BR:
  // "1.234 ha" é mil duzentos e trinta e quatro hectares, e lê-lo como 1,234
  // (o que Number() faz) erra por mil vezes calado, no campo que o cartório
  // confere. O mapeador nunca emite essa forma (sempre 4 ou 2 decimais), mas a
  // edição manual no painel emite. Sem grupos de 3 ("396.4"), segue valendo como
  // decimal cru, que é a leitura tolerante documentada em paraNumeroBR.
  const milhar = !semUnidade.includes(',') && /^-?\d{1,3}(?:\.\d{3})+$/.test(semUnidade);
  const n = paraNumeroBR(milhar ? semUnidade.replace(/\./g, '') : semUnidade);
  // Área negativa não existe: formatarArea aplica Math.abs e o extenso de -360
  // sairia como "zero metros quadrados" (Math.floor de um negativo). Recusa.
  return n < 0 ? NaN : n;
}

/** Área (texto + unidade dos campos base) em m², para comparar unidades diferentes. */
function areaEmM2(area: string | undefined, unidade: string | undefined): number {
  const n = paraAreaNumero(area);
  return unidadeDaArea(unidade) === 'm2' ? n : n * 10000;
}

const areaExtensoCampo: CampoEntidade = {
  id: 'areaExtenso',
  label: 'Área (por extenso)',
  tipo: 'texto',
  derivadoDe: ['area', 'areaUnidade'],
  derivar: (v) => {
    const n = paraAreaNumero(v.area);
    return Number.isFinite(n) ? areaExtenso(n, unidadeDaArea(v.areaUnidade)) : '';
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

/**
 * "s/n", "s/nº", "S.N."… → forma canônica dos contratos; número normal ganha "nº".
 * Mora aqui (e não em mapeadores.ts) porque serve tanto ao endereço em prosa dos
 * mapeadores quanto ao campo DERIVADO `matricula.enderecoNumeroProsa`, e
 * vocabulario.ts não pode importar de mapeadores (a dependência é a inversa).
 */
export function numeroProsa(numero: string | null | undefined): string {
  if (!numero) return '';
  return /^s[/.]?\s*n[ºo°.]*$/i.test(numero.trim()) ? 's/nº' : `nº ${numero}`;
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
      // Rótulos da linha de assinatura (fecho do contrato).
      concordanciaCampo('socioTitulo', 'Sócio / Sócia', PARES.socioTitulo),
      concordanciaCampo('socioAdministrador', 'Sócio administrador / Sócia administradora', PARES.socioAdministrador),
      {
        // A outorga do cônjuge é dispensada só no regime da separação absoluta
        // (art. 1.647 do Código Civil), então comunhão (parcial ou universal) e
        // participação final nos aquestos a exigem. Os valores gravados no cadastro
        // hoje são "Comunhão Universal", "Comunhão Parcial" e "Separação Total".
        // Solteiro/viúvo chegam sem regime e não ligam a condicional.
        id: 'exigeOutorgaConjugal',
        label: 'Exige outorga conjugal? (condicional, pelo regime de bens)',
        tipo: 'texto',
        derivadoDe: 'regimeBens',
        derivar: (v) => (/comunh|aquest/i.test(v.regimeBens ?? '') ? 'sim' : ''),
      },
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
          // Feminino: conta quotas ("mil quotas", "oitocentas e setenta e duas mil…").
          return Number.isFinite(n) ? cardinalExtenso(n, true) : '';
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
      // Classificação do imóvel: é o que separa as redações da família "Descrição
      // de imóvel" (seletores em supabase/migrations/20260806140000). Condicionais
      // com 'sim'/'' como fracionado/inteiro — o engine não tem "else".
      { id: 'tipoBem', label: 'Tipo do bem (IR = rural, IB = urbano)', tipo: 'texto' },
      {
        id: 'rural',
        label: 'É imóvel rural? (condicional)',
        tipo: 'texto',
        derivadoDe: 'tipoBem',
        derivar: (v) => (v.tipoBem === 'IR' ? 'sim' : ''),
      },
      {
        id: 'urbano',
        label: 'É imóvel urbano? (condicional)',
        tipo: 'texto',
        derivadoDe: 'tipoBem',
        derivar: (v) => (v.tipoBem === 'IB' ? 'sim' : ''),
      },
      { id: 'tipoExploracaoPosse', label: 'Tipo de exploração / posse', tipo: 'texto' },
      {
        // Direitos ainda não averbados na matrícula (promessa de compra e venda
        // quitada): o titular detém o imóvel sem título registrado, e a redação
        // muda de "de propriedade de" para "de posse/propriedade de".
        //
        // Casa por SUBSTRING, não por igualdade — a assimetria de risco manda: um
        // valor legado ('Composse', 'posse' minúsculo, 'Posse de fato') que não
        // ligasse a condicional levaria o resolvedor à variante de propriedade
        // exclusiva, e o contrato afirmaria propriedade de quem só tem posse, que
        // é afirmação falsa em documento levado a registro. Capturar demais é
        // barrado cedo e alto: a variante de posse usa {{ imovel.promessaData }} e
        // {{ imovel.promissariaVendedora }}, que não existem no vocabulário e
        // derrubam a prévia. Mesmo casamento de EstruturaAtual.tsx (origemDe).
        //
        // Este é um PROXY: o caso do modelo Word é "escritura pública não
        // averbada", que não tem campo próprio no cadastro (tipo_exploracao_posse
        // fala de exploração, não de título). Um campo próprio provavelmente
        // resolve isso melhor no futuro.
        id: 'posse',
        label: 'Direitos não averbados na matrícula? (condicional)',
        tipo: 'texto',
        derivadoDe: 'tipoExploracaoPosse',
        derivar: (v) => (/posse/i.test(v.tipoExploracaoPosse ?? '') ? 'sim' : ''),
      },
      // Endereço do imóvel: identifica o URBANO (o rural usa a denominação).
      // Logradouro/número/complemento/bairro/CEP vêm de `bem` (colunas criadas em
      // 20260806120500); município e UF continuam sendo os da matrícula (fonte
      // única), e a prosa os junta como no endereço de pessoa.
      { id: 'endereco', label: 'Endereço do imóvel (em prosa)', tipo: 'texto' },
      { id: 'enderecoLogradouro', label: 'Endereço — logradouro', tipo: 'texto' },
      { id: 'enderecoNumero', label: 'Endereço — número', tipo: 'texto' },
      {
        // Número já na forma dos contratos ("nº 119" / "s/nº"): o modelo que
        // escrevia "nº {{ imovel.enderecoNumero }}" saía como "nº s/n" no imóvel
        // sem número. É DERIVADO do número cru, não campo base: se fosse base, um
        // modelo que usasse os dois deixaria o consultor editar um e esquecer o
        // outro, e sairiam dois números diferentes no mesmo contrato.
        id: 'enderecoNumeroProsa',
        label: 'Endereço — número em prosa ("nº 119" / "s/nº")',
        tipo: 'texto',
        derivadoDe: 'enderecoNumero',
        derivar: (v) => numeroProsa(v.enderecoNumero),
      },
      { id: 'enderecoComplemento', label: 'Endereço — complemento', tipo: 'texto' },
      { id: 'enderecoBairro', label: 'Endereço — bairro', tipo: 'texto' },
      { id: 'enderecoCep', label: 'Endereço — CEP', tipo: 'texto' },
      { id: 'area', label: 'Área (hectares no rural, m² no urbano)', tipo: 'area' },
      // A unidade é DADO (vem de matricula.area_unidade combinada com o tipo do
      // imóvel), não formatação: é campo base, editável, e é dele que o extenso
      // tira a unidade. O sufixo em `area` é só exibição.
      { id: 'areaUnidade', label: 'Unidade da área (ha / m²)', tipo: 'texto' },
      areaExtensoCampo,
      { id: 'areaConstruida', label: 'Área construída (m²)', tipo: 'area' },
      {
        // O modelo urbano só manda escrever a construída "em havendo área
        // construída inferior à área total", então a condicional exige a
        // comparação, não só a presença. A total pode estar em hectare e a
        // construída é sempre m², daí a normalização por `areaUnidade`. A
        // tolerância de 0,01 m² é load-bearing, e o exemplo é conferível: 0,1005
        // ha × 10.000 dá 1005.0000000000001 em ponto flutuante, então um lote de
        // 1.005 m² todo construído ligaria o trecho ("sendo 1.005,00 m² de área
        // construída" num imóvel de 1.005,00 m²). Sem área total comparável
        // fica DESLIGADA: não se pode afirmar "inferior" sem os dois lados, e
        // omitir a construída é o caso seguro (o modelo rural nunca a cita).
        id: 'temAreaConstruida',
        label: 'Tem área construída menor que a total? (condicional)',
        tipo: 'texto',
        derivadoDe: ['area', 'areaUnidade', 'areaConstruida'],
        derivar: (v) => {
          const construida = paraAreaNumero(v.areaConstruida);
          if (!Number.isFinite(construida) || construida <= 0) return '';
          const total = areaEmM2(v.area, v.areaUnidade);
          if (!Number.isFinite(total)) return '';
          return construida < total - 0.01 ? 'sim' : '';
        },
      },
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
      // Equivalente urbano do CCIR ("inscrito no cadastro municipal sob o nº").
      // Mora em `bem`, como o CCIR, mas o binding do imóvel precisa do seu.
      { id: 'inscricaoMunicipal', label: 'Inscrição municipal (cadastro municipal)', tipo: 'texto' },
      { id: 'confrontacoes', label: 'Limites e confrontações', tipo: 'textarea' },
      // Cabeçalho do georreferenciamento (memorial SIGEF), preenchido do BigQuery
      // quando a matrícula tem georref — ver useGeorefByMatricula / mapearGeorefCabecalho.
      // Os vértices em si saem na seção de lista {{#vertices}} (entidade `vertice`).
      { id: 'georefArea', label: 'Georref — Área (ha)', tipo: 'texto' },
      { id: 'georefPerimetro', label: 'Georref — Perímetro (m)', tipo: 'texto' },
      { id: 'georefSistema', label: 'Georref — Sistema de referência', tipo: 'texto' },
      { id: 'georefCertificacao', label: 'Georref — Código de certificação SIGEF', tipo: 'texto' },
      { id: 'georefDataCertificacao', label: 'Georref — Data da certificação', tipo: 'texto' },
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
  // Vértice do memorial descritivo (uma linha de georef_detalhe). É sempre item de
  // lista ({{#vertices}}…{{/vertices}}), nunca binding unitário — não tem registro
  // próprio na tela Gerar. Valores fiéis ao PDF (coordenadas em GMS preservadas).
  vertice: {
    tipo: 'vertice',
    label: 'Vértice (georreferenciamento)',
    campos: [
      { id: 'codVertice', label: 'Código do vértice', tipo: 'texto' },
      { id: 'longitude', label: 'Longitude', tipo: 'texto' },
      { id: 'latitude', label: 'Latitude', tipo: 'texto' },
      { id: 'altitude', label: 'Altitude (m)', tipo: 'texto' },
      { id: 'codVante', label: 'Código do vértice vante', tipo: 'texto' },
      { id: 'azimute', label: 'Azimute', tipo: 'texto' },
      { id: 'distancia', label: 'Distância vante (m)', tipo: 'texto' },
      { id: 'confrontacoes', label: 'Confrontações', tipo: 'texto' },
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
