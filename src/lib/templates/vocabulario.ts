import {
  areaExtenso, cardinalExtenso, dataExtenso, numeralContrato, percentualExtenso, valorExtenso,
  type UnidadeArea,
} from './extenso';
import { tituloDoInstrumento } from './instrumento';
import {
  PARES, concordar, concordarTexto, generoDeConcordancia, ufComPreposicao, ufPorExtenso, type Genero,
} from './concordancia';

// Vocabulário de campos organizado POR ENTIDADE (pessoa/bem/matricula/cartorio).
// Cada placeholder é `binding.campo` (ex.: {{ proprietario.nome }}, {{ imovel.area }});
// o binding (papel) define o tipo de entidade — ver binding.ts. Aqui mora só o
// catálogo de campos de cada tipo e a derivação (extensos / concordância) usada
// tanto pelos mapeadores (dados do banco) quanto na edição manual da tela Gerar.

export type TipoCampo = 'texto' | 'textarea' | 'area' | 'valor' | 'inteiro' | 'data';

export type TipoEntidade =
  | 'pessoa' | 'sociedade' | 'bem' | 'matricula' | 'cartorio' | 'vertice'
  // Instrumentos agrários (cadastro de exploração rural): o cabeçalho do
  // instrumento e a origem da posse de cada imóvel. Pessoa e matrícula NÃO
  // ganham entidade nova — o contrato rural qualifica as mesmas pessoas e
  // descreve os mesmos imóveis que o Contrato Social.
  | 'instrumento' | 'origemPosse'
  // Governança (GOV-01/GOV-02 e o levantamento do acordo). Mesmo movimento do
  // rural: pessoa e sociedade NÃO ganham entidade nova, porque a alteração
  // contratual de governança qualifica os mesmos sócios e a mesma holding. O
  // que falta é o órgão, a célula da matriz e os parâmetros do acordo.
  | 'orgaoGovernanca' | 'competenciaMatriz' | 'acordoQuotistas';

export interface CampoEntidade {
  /** Id do campo dentro da entidade (parte após o ponto no placeholder). */
  id: string;
  label: string;
  tipo: TipoCampo;
  /** Se presente, é um campo DERIVADO de outro(s) (não é entrada direta no form). */
  derivadoDe?: string | string[];
  /** Recalcula o valor do campo a partir dos demais (extensos, concordância). */
  derivar?: (valores: Record<string, string>) => string;
  /**
   * Sem este campo resolvido, o documento que o USA está incompleto. É daqui —
   * e não de uma lista fixa no controller — que sai o aviso de "documento
   * incompleto" da tela Gerar: matrícula digitada, doação e alteração
   * contratual têm conjuntos de obrigatórios diferentes porque usam campos
   * diferentes. Ver pendenciasDoDocumento (index.ts).
   */
  obrigatorio?: boolean;
  /**
   * Campo preenchido na tela Gerar, não vindo de cadastro (data de assinatura,
   * testemunhas, advogado). Vazio, ele NÃO resolve para '': vira a lacuna
   * assinalável do tipo (ver lacunaDoTipo em campos.ts), que é o que um
   * instrumento assinado à mão quer no lugar de "Lucas do Rio Verde/MT, .".
   */
  manual?: boolean;
  /**
   * Vazio, vira LACUNA em vez de ''. Igual ao `manual`, mas o campo continua
   * vindo do cadastro.
   *
   * É opt-in por campo, e não regra geral do obrigatório, porque o descarte de
   * bloco por "campos vazios" existe de propósito: a cláusula de capital de um
   * contrato sem sócios TEM de sumir, e não voltar como "R$ ____" (emenda 9.1).
   *
   * Serve para o campo que o documento cita em dezenas de blocos de PROSA, onde
   * a frase continua de pé sem ele. O apelido da empresa é o caso: sem esta
   * marca, um cliente com o nome fantasia em branco perdia 130 dos 266 blocos
   * do Acordo, e o documento saía pela metade sem erro nenhum.
   */
  lacunaSeVazio?: boolean;
  /**
   * Campo de MÁQUINA, não de conferência: existe para o motor concordar ou
   * calcular, e não é dado que o consultor tenha o que conferir. Some do
   * "Ajustar dados manualmente" da tela Gerar e continua valendo por trás.
   *
   * Não confundir com `derivadoDe`, que também não aparece no formulário: o
   * derivado some porque a correção tem efeito é na BASE dele, e a base entra
   * no lugar. Aqui é a própria base que não deve ser oferecida.
   *
   * O caso que criou o sinalizador é `orgaoGovernanca.genero`. Ele não descreve
   * o órgão, descreve a palavra: existe só para sair "O Conselho será composto"
   * e "A Diretoria será composta". Quem digitasse "F" ali não corrigiria um
   * dado errado, quebraria a concordância do documento. Contraste com
   * `pessoa.genero`, que É dado da pessoa e continua editável.
   */
  interno?: boolean;
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

/**
 * Campo derivado com o NUMERAL do livro/folha no padrão da casa: dois dígitos
 * com zero à esquerda quando o valor é puramente numérico ("2" → "02", "13" →
 * "13"), e INALTERADO quando não é ("2-AUX", "3-Auxiliar" saem íntegros, porque
 * o cartório os registra assim).
 *
 * É campo próprio, e não uma mudança em `livroExtenso`: o padrão da PSA é
 * numeral E extenso lado a lado ("no Livro 02 (dois), folhas/ficha 01 (um)"),
 * e fazer o extenso devolver "02 (dois)" o faria mentir sobre o que é, além de
 * tirar a opção de quem quer só o extenso.
 *
 * A regra em si mora em `numeralContrato` (extenso.ts), que os mapeadores também
 * chamam para o número de vias e os prazos do instrumento agrário.
 */
function numeralCampo(id: string, label: string, derivadoDe: string): CampoEntidade {
  return {
    id,
    label,
    tipo: 'texto',
    derivadoDe,
    derivar: (v) => numeralContrato(v[derivadoDe]),
  };
}

/**
 * Condicional derivada ('sim' / '') — o engine não tem "else", então cada lado
 * da pergunta é publicado como um campo. `derivar` devolve string porque é isso
 * que uma seção {{#campo}} lê; booleano funcionaria por acaso.
 */
function condicionalCampo(
  id: string,
  label: string,
  derivadoDe: string | string[],
  ligada: (v: Record<string, string>) => boolean,
): CampoEntidade {
  return { id, label, tipo: 'texto', derivadoDe, derivar: (v) => (ligada(v) ? 'sim' : '') };
}

/**
 * Campo derivado com o percentual por extenso na forma CARTORIAL — a mesma do
 * Contrato Social ("trinta inteiros por cento").
 *
 * Houve uma tentativa de dar aos instrumentos agrários uma forma própria, sem
 * "inteiros". O contrato de parceria ASSINADO desmente: ele escreve
 * "30,00 % (trinta inteiros por cento)" e "70% (setenta inteiros por cento)".
 * É a mesma convenção do societário, e por isso não há duas.
 */
function percentualCartorialCampo(id: string, label: string, derivadoDe: string): CampoEntidade {
  return {
    id,
    label,
    tipo: 'texto',
    derivadoDe,
    derivar: (v) => {
      const n = paraNumeroBR(v[derivadoDe]);
      return Number.isFinite(n) ? percentualExtenso(n) : '';
    },
  };
}

/** Campo derivado que expande uma UF (sigla) por extenso ("MT" → "Mato Grosso"). */
/**
 * Uma chave está marcada numa lista de múltipla escolha do cadastro?
 *
 * `mecanismos`, `metodosAvaliacao` e `objetosPreferencia` são `text[]` no banco
 * e chegam ao motor como uma string de chaves separadas por vírgula, porque o
 * contexto de render é `Record<string, string>`. A separação acontece aqui, e
 * não em cada `derivar`, para que acrescentar um mecanismo seja uma linha.
 */
function listaTem(bruto: string | undefined, chave: string): boolean {
  return (bruto ?? '').split(',').map((x) => x.trim()).filter(Boolean).includes(chave);
}

/**
 * Condicional de um item marcado numa lista do cadastro.
 *
 * Cada mecanismo do acordo acende uma CLÁUSULA INTEIRA: desmarcar o lock-up faz
 * a Cláusula Sexta não existir naquele documento. É por isso que cada um vira
 * campo próprio em vez de o bloco ler a lista: `{{#acordo.temLockUp}}` é o que
 * um bloco condicional sabe consumir.
 */
function itemDaListaCampo(
  id: string, label: string, derivadoDe: string, chave: string,
): CampoEntidade {
  return {
    id, label, tipo: 'texto', derivadoDe,
    derivar: (v) => (listaTem(v[derivadoDe], chave) ? 'sim' : ''),
  };
}

function ufExtensoCampo(id: string, label: string, derivadoDe: string): CampoEntidade {
  return {
    id,
    label,
    tipo: 'texto',
    derivadoDe,
    derivar: (v) => ufPorExtenso(v[derivadoDe]),
  };
}

/**
 * A UF por extenso já com a preposição, para o bloco escrever `Estado {{ … }}`.
 *
 * Existe ao lado de `ufExtensoCampo` porque as duas formas são usadas: a tabela
 * do Anexo quer só o nome ("Lucas do Rio Verde/Mato Grosso") e a prosa quer a
 * regência ("Estado da Bahia", "Estado de Mato Grosso").
 */
function ufComPreposicaoCampo(id: string, label: string, derivadoDe: string): CampoEntidade {
  return {
    id,
    label,
    tipo: 'texto',
    derivadoDe,
    derivar: (v) => ufComPreposicao(v[derivadoDe]),
  };
}

/** Campo derivado com a data na redação dos instrumentos ("10 de outubro de 2.025"). */
function dataExtensoCampo(id: string, label: string, derivadoDe: string): CampoEntidade {
  return {
    id,
    label,
    tipo: 'texto',
    derivadoDe,
    derivar: (v) => dataExtenso(v[derivadoDe]),
  };
}

/**
 * Campo de concordância derivado do gênero (ex.: brasileiro → brasileiro/brasileira).
 *
 * `tipoPessoa` entra na concordância (PJ concorda no feminino) mas NÃO em
 * `derivadoDe`: a base é o que o painel "Ajustar dados manualmente" abre para o
 * consultor corrigir, e o tipo da pessoa é identidade do cadastro, não redação.
 * `derivarCampos` recalcula sobre o registro inteiro, então o tipo é lido de
 * qualquer jeito.
 */
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
    derivar: (v) => par(generoDeConcordancia((v.genero || null) as Genero, v.tipoPessoa)),
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
 *
 * A preposição do casamento varia por instrumento: o societário escreve "casado
 * EM regime de", e os dois instrumentos agrários assinados escrevem "casado SOB O
 * regime de". Quem decide é `estiloQualificacao` (ver `montarQualificacao`) —
 * default continua o societário, para nenhum contrato existente mudar de texto.
 */
function estadoCivilProsa(v: Record<string, string>): string {
  const g = (v.genero || null) as Genero;
  const concordado = concordarTexto(v.estadoCivil, g).toLowerCase();
  if (!concordado) return '';
  if (concordado.startsWith('casad')) {
    const prep = v.estiloQualificacao ? 'sob o regime de' : 'em regime de';
    return v.regimeBens ? `${concordado} ${prep} ${regimeProsa(v.regimeBens)}` : concordado;
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
 * "s/n", "s/nº", "S.N."… → forma canônica dos contratos; número normal ganha "n.º".
 * Mora aqui (e não em mapeadores.ts) porque serve tanto ao endereço em prosa dos
 * mapeadores quanto ao campo DERIVADO `matricula.enderecoNumeroProsa`, e
 * vocabulario.ts não pode importar de mapeadores (a dependência é a inversa).
 *
 * "n.º", com ponto, é a abreviação da casa: 68 ocorrências contra 8 nos dois
 * instrumentos agrários assinados do MMS, e 71 contra 2 nos dois Contratos
 * Sociais (contado em 02/09/2026).
 */
export function numeroProsa(numero: string | null | undefined): string {
  if (!numero) return '';
  return /^s[/.]?\s*n[ºo°.]*$/i.test(numero.trim()) ? 's/n.º' : `n.º ${numero}`;
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
  //
  // A exceção é a pessoa qualificada DENTRO da qualificação de outra: os
  // administradores que a pessoa jurídica outorgante traz consigo ("neste ato
  // representado por seus administradores *José Eduardo de Macedo Soares
  // Júnior*, brasileiro, …") saem em Title Case no instrumento assinado, porque
  // ali eles não são PARTE — são como a parte se representa. Quem pede a
  // exceção é o mapeador que aninha (`qualificacaoDoOutorgante`), pelo campo
  // `estiloNome`; sem ele nada muda.
  const caixa = v.estiloNome === 'natural'
    ? (v.nome ?? '')
    : (v.nome ?? '').toLocaleUpperCase('pt-BR');
  const nome = v.nome ? `*${caixa}*` : '';
  if (v.tipoPessoa === 'PJ') {
    return [
      nome,
      'pessoa jurídica de direito privado',
      v.cpfCnpj && `inscrita no CNPJ/MF sob o n.º ${v.cpfCnpj}`,
      // "sob o NIRE n.º", não "sob o n.º": sem dizer NIRE a frase entrega um número
      // sem nome, logo depois do CNPJ — e é a redação dos contratos assinados,
      // tanto do MMS quanto do Bela Vista.
      v.nire &&
        `registrada na Junta Comercial${
          v.juntaComercialUf ? ` do Estado ${ufComPreposicao(v.juntaComercialUf)}` : ''
        } sob o NIRE n.º ${v.nire}`,
      // Capital social: exigência literal do preâmbulo dos instrumentos agrários
      // ("com capital social totalmente subscrito e integralizado no valor de R$
      // 872.674,00 (…)"). Como `representante`, é campo mesclado pelo mapeador
      // que conhece a sociedade — não coluna de `pessoa`.
      v.capitalSocial && `com capital social totalmente subscrito e integralizado no valor de R$ ${
        v.capitalSocial}${v.capitalSocialExtenso ? ` (${v.capitalSocialExtenso})` : ''}`,
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
  // Os dois trechos opcionais da PF, e por que são ESCOLHA e não acúmulo: os
  // contratos assinados qualificam a MESMA pessoa de duas formas diferentes —
  // os outorgados da parceria saem com "natural de São Paulo/SP nascido em
  // 23/05/1.957", e os administradores da mesma parceria (e os compossuidores da
  // composse) saem com "nascido em 23/05/1.957, filho de X e Y". Nenhum dos dois
  // traz os dois. Quem escolhe é o mapeador do PAPEL, por `estiloQualificacao`;
  // sem estilo, nada entra, e o Contrato Social continua como está.
  const naturalidade = v.estiloQualificacao === 'naturalidade' ? v.naturalidade : '';
  const filiacao = v.estiloQualificacao === 'filiacao' ? v.filiacao : '';
  const nascimento = v.estiloQualificacao && v.dataNascimento
    ? `${PARES.nascido(g)} em ${v.dataNascimento}`
    : '';
  return [
    nome,
    nacionalidade,
    // A ordem é a do assinado: "brasileiro, natural de São Paulo/SP, nascido em
    // 23/05/1.957, casado…" para o outorgado; "brasileiro, nascido em…, filho de
    // X e Y, casado…" para o administrador. Como só um dos dois trechos entra por
    // papel, a mesma sequência serve aos dois.
    naturalidade,
    nascimento,
    filiacao,
    estadoCivilProsa(v),
    v.profissao,
    // "do RG n.º" e não "do RG sob o n.º": os assinados escrevem sem o "sob o" 11
    // vezes contra 3 — ao contrário do CPF, que sempre leva "sob o".
    v.rg && `${PARES.portador(g)} do RG n.º ${v.rg}${v.orgaoExpedidor ? ` ${v.orgaoExpedidor}` : ''}`,
    v.cpfCnpj && `${PARES.inscrito(g)} no CPF/MF sob o n.º ${v.cpfCnpj}`,
    v.endereco && `${PARES.residente(g)} ${naEndereco(v.endereco)}`,
  ].filter(Boolean).join(', ');
}

// --- Catálogo de entidades ---------------------------------------------------

export const ENTIDADES: Record<TipoEntidade, Entidade> = {
  pessoa: {
    tipo: 'pessoa',
    label: 'Pessoa',
    campos: [
      // Nome e CPF/CNPJ identificam a parte: sem eles o instrumento não é
      // registrável, e é por isso que são os obrigatórios da pessoa.
      { id: 'nome', label: 'Nome / Denominação', tipo: 'texto', obrigatorio: true },
      { id: 'tipoPessoa', label: 'Tipo de pessoa (PF/PJ)', tipo: 'texto' },
      { id: 'cpfCnpj', label: 'CPF / CNPJ', tipo: 'texto', obrigatorio: true },
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
      // Naturalidade e filiação: existem no cadastro desde sempre e nunca eram
      // publicadas. Entram como base + um derivado em prosa cada, porque é a
      // prosa que o preâmbulo escreve.
      { id: 'naturalidadeMunicipio', label: 'Naturalidade — município', tipo: 'texto' },
      { id: 'naturalidadeUf', label: 'Naturalidade — UF', tipo: 'texto' },
      {
        id: 'naturalidade',
        label: 'Naturalidade em prosa ("natural de São Paulo/SP")',
        tipo: 'texto',
        derivadoDe: ['naturalidadeMunicipio', 'naturalidadeUf'],
        derivar: (v) => (v.naturalidadeMunicipio
          ? `natural de ${v.naturalidadeMunicipio}${v.naturalidadeUf ? `/${v.naturalidadeUf}` : ''}`
          : ''),
      },
      { id: 'filiacaoPai', label: 'Filiação — pai', tipo: 'texto' },
      { id: 'filiacaoMae', label: 'Filiação — mãe', tipo: 'texto' },
      {
        id: 'filiacao',
        label: 'Filiação em prosa ("filho de X e Y")',
        tipo: 'texto',
        derivadoDe: ['filiacaoPai', 'filiacaoMae', 'genero'],
        derivar: (v) => {
          const nomes = [v.filiacaoPai, v.filiacaoMae].filter(Boolean);
          if (nomes.length === 0) return '';
          const g = generoDeConcordancia((v.genero || null) as Genero, v.tipoPessoa);
          return `${concordar(g, 'filho', 'filha')} de ${nomes.join(' e ')}`;
        },
      },
      // Qual das duas formas o preâmbulo daquele PAPEL usa: 'naturalidade',
      // 'filiacao', ou vazio (societário). É o mapeador do papel que preenche;
      // não é dado de cadastro, e por isso não tem coluna.
      { id: 'estiloQualificacao', label: 'Estilo da qualificação (naturalidade/filiacao)', tipo: 'texto' },
      // Caixa do NOME na qualificação: vazio (o padrão) põe em caixa alta, como
      // toda parte de contrato da casa; 'natural' mantém a caixa do cadastro,
      // para a pessoa qualificada DENTRO da qualificação de outra — ver
      // `montarQualificacao` e `qualificacaoDoOutorgante`.
      { id: 'estiloNome', label: 'Caixa do nome na qualificação (vazio = caixa alta, "natural")', tipo: 'texto' },
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
      // Que peça é esta na cadeia de sucessão: 0 é a constituição, 1 é a
      // primeira alteração, 2 a segunda. Quem conta os elos é a tela Gerar, pelo
      // `substitui_documento_id` — ninguém digita.
      { id: 'numeroAlteracao', label: 'Número da alteração (0 = constituição)', tipo: 'inteiro' },
      // O título que abre a peça, DERIVADO do número acima: campo derivado não é
      // entrada de formulário (ver camposDoBinding), então o título não pode ser
      // reescrito à mão e congelar. Corrigir a numeração é corrigir o NÚMERO; o
      // ordinal por extenso se reescreve sozinho.
      {
        id: 'tituloInstrumento',
        label: 'Título do instrumento',
        tipo: 'texto',
        derivadoDe: 'numeroAlteracao',
        derivar: (v) => tituloDoInstrumento(paraInteiroBR(v.numeroAlteracao)),
      },
      { id: 'tituloColetivoSocios', label: 'Sócio(s) com concordância do quadro', tipo: 'texto' },
      // Condicional (o engine não tem "else"): a administração passou a ser
      // exercida de fora do quadro societário. É o que autoriza a cláusula a
      // dizer "administradores não sócios", em vez de a redação afirmar isso
      // sempre ou nunca.
      { id: 'temAdministradorNaoSocio', label: 'Há administrador não sócio? (condicional)', tipo: 'texto' },
      { id: 'semAdministradorNaoSocio', label: 'Todos os administradores são sócios? (condicional, o engine não tem else)', tipo: 'texto' },
      { id: 'razaoSocial', label: 'Razão social', tipo: 'texto', obrigatorio: true },
      // CNPJ NÃO é obrigatório: o contrato de constituição é justamente o
      // documento que a sociedade leva à Junta para obtê-lo.
      { id: 'cnpj', label: 'CNPJ', tipo: 'texto' },
      { id: 'nire', label: 'NIRE (registro na Junta)', tipo: 'texto' },
      { id: 'juntaUf', label: 'UF da Junta Comercial', tipo: 'texto' },
      ufExtensoCampo('juntaUfExtenso', 'Junta Comercial — Estado por extenso', 'juntaUf'),
      /*
       * "do Estado DO Paraná", não "do Estado DE Paraná".
       *
       * A mesma regência que já vale no endereço de cada parte (ver
       * `enderecoProsa`): dezesseis das vinte e sete unidades da federação não
       * aceitam o "de" seco. O preâmbulo do Acordo escreve a Junta uma vez por
       * documento, e escrevia errado.
       */
      ufComPreposicaoCampo('juntaUfComPreposicao', 'Junta Comercial — Estado com a preposição', 'juntaUf'),
      { id: 'dataConstituicao', label: 'Data de constituição', tipo: 'texto' },
      { id: 'objeto', label: 'Objeto social', tipo: 'textarea' },
      // Capital social e quotas: calculados na geração (calcularCapitalSociedade
      // em mapeadores.ts — PR soma as integralizações aprovadas; demais somam o
      // quadro societário), aqui só os campos + extensos derivados (editáveis).
      { id: 'capitalValor', label: 'Capital social (R$)', tipo: 'valor', obrigatorio: true },
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
      { id: 'capitalAnterior', label: 'Capital social anterior (R$)', tipo: 'valor' },
      {
        id: 'capitalAnteriorExtenso',
        label: 'Capital social anterior (por extenso)',
        tipo: 'texto',
        derivadoDe: 'capitalAnterior',
        derivar: (v) => {
          const n = paraNumeroBR(v.capitalAnterior);
          return Number.isFinite(n) ? valorExtenso(n) : '';
        },
      },
      { id: 'capitalDelta', label: 'Aumento do capital social (R$)', tipo: 'valor' },
      {
        id: 'capitalDeltaExtenso',
        label: 'Aumento do capital social (por extenso)',
        tipo: 'texto',
        derivadoDe: 'capitalDelta',
        derivar: (v) => {
          const n = paraNumeroBR(v.capitalDelta);
          return Number.isFinite(n) ? valorExtenso(n) : '';
        },
      },
      // Condicional que autoriza a resolução de aumento a existir. O delta é
      // calculado por diferença contra o documento registrado anterior
      // (calcularHistoricoCapital), e três casos legítimos NÃO são aumento:
      // delta nulo (peça sem predecessor registrado, não há de onde subtrair),
      // delta zero (o evento foi marcado no assistente mas o capital não mudou
      // no cadastro) e delta negativo (redução de capital, que é outro evento e
      // pede outra redação). Sem este condicional o bloco não tem como sumir e
      // acaba afirmando um aumento de R$ 0,00, que é falso na cara do cartório.
      {
        id: 'houveAumentoCapital',
        label: 'Houve aumento de capital? (condicional)',
        tipo: 'texto',
        derivadoDe: 'capitalDelta',
        derivar: (v) => {
          const n = paraNumeroBR(v.capitalDelta);
          return Number.isFinite(n) && n > 0 ? 'sim' : '';
        },
      },
      { id: 'totalQuotas', label: 'Total de quotas', tipo: 'inteiro', obrigatorio: true },
      // Valor nominal da quota: parâmetro da sociedade (capital.ts), publicado
      // como campo para o bloco imprimir em vez de trazer "R$ 1,00 (um real)"
      // escrito à mão — trocar o nominal deixa de ser caçada por literais.
      { id: 'quotaValorNominal', label: 'Valor nominal da quota (R$)', tipo: 'valor' },
      {
        id: 'quotaValorNominalExtenso',
        label: 'Valor nominal da quota (por extenso)',
        tipo: 'texto',
        derivadoDe: 'quotaValorNominal',
        derivar: (v) => {
          const n = paraNumeroBR(v.quotaValorNominal);
          return Number.isFinite(n) ? valorExtenso(n) : '';
        },
      },
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
      { id: 'sedeLogradouro', label: 'Sede — logradouro', tipo: 'texto' },
      { id: 'sedeNumero', label: 'Sede — número', tipo: 'texto' },
      { id: 'sedeComplemento', label: 'Sede — complemento', tipo: 'texto' },
      { id: 'sedeBairro', label: 'Sede — bairro', tipo: 'texto' },
      /*
       * COMO A EMPRESA É CHAMADA, que não é a razão social nem pedaço dela.
       *
       * O Acordo declara o apelido no preâmbulo e o repete 189 vezes ("a
       * ADMINISTRAÇÃO da DUAL"). Medido nos cinco acordos que declaram apelido:
       * DUAL, ALIANÇA e VIA FÉRTIL saem do começo da razão social, mas "PERCI
       * SMANIOTTO AGRONEGÓCIOS" vira "PS AGRO", que é o nome fantasia, e um
       * usa "NEWCO", empresa a constituir. Cortar na primeira palavra acertaria
       * três e escreveria "PERCI" e "COMÉRCIO" nos outros dois, calado.
       *
       * OBRIGATÓRIO, e só pesa em quem o usa: a pendência se calcula sobre os
       * campos que O DOCUMENTO cita, então o contrato social, que escreve a
       * razão social por extenso, não passa a cobrar nada. Aqui ele precisa
       * disso: vazio, o Acordo sairia com 189 lacunas, e é melhor a tela dizer
       * "falta o nome fantasia" antes de baixar.
       */
      { id: 'nomeFantasia', label: 'Nome fantasia (como o documento a chama)', tipo: 'texto',
        obrigatorio: true, lacunaSeVazio: true },
      { id: 'sedeMunicipio', label: 'Sede — município', tipo: 'texto' },
      { id: 'sedeUf', label: 'Sede — UF', tipo: 'texto' },
      ufExtensoCampo('sedeUfExtenso', 'Sede — Estado por extenso', 'sedeUf'),
      // "estado DO Parana", nao "estado DE Parana": a mesma regencia do
      // endereco de cada parte. O Acordo escreve a sede duas vezes.
      ufComPreposicaoCampo('sedeUfComPreposicao', 'Sede — Estado com a preposição', 'sedeUf'),
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
      // Número e área identificam o imóvel na matrícula: o documento que os cita
      // em branco descreve um imóvel que o registro não reconhece.
      { id: 'numero', label: 'Nº da matrícula', tipo: 'texto', obrigatorio: true },
      { id: 'livro', label: 'Livro', tipo: 'texto' },
      numeralCampo('livroNumeral', 'Livro (numeral, "02")', 'livro'),
      cardinalCampo('livroExtenso', 'Livro (por extenso)', 'livro'),
      { id: 'folha', label: 'Folha / Ficha', tipo: 'texto' },
      numeralCampo('folhaNumeral', 'Folha (numeral, "01")', 'folha'),
      cardinalCampo('folhaExtenso', 'Folha (por extenso)', 'folha'),
      { id: 'municipio', label: 'Município do imóvel', tipo: 'texto' },
      { id: 'uf', label: 'Estado (UF) do imóvel', tipo: 'texto' },
      // A alínea do Anexo escreve "situado no município de X, Estado DE Mato
      // Grosso" / "Estado DA Bahia": a regência é do nome do estado, e o bloco
      // não pode emendar "Estado de " ao campo cru.
      ufComPreposicaoCampo('ufComPreposicao', 'Estado do imóvel com a preposição', 'uf'),
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
      { id: 'area', label: 'Área (hectares no rural, m² no urbano)', tipo: 'area', obrigatorio: true },
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
      // Três valores, porque na integralização eles DIVERGEM e o bloco precisa
      // dizer qual está dizendo (frente de 14/09/2026):
      //   · `valor` é o de sempre — o do imóvel no cadastro, MAS sobrescrito
      //     dentro de {{#integralizacoes}} pelo que o sócio da alínea
      //     integraliza, que é o comportamento que os modelos já esperam;
      //   · `valorDoImovel` é o do imóvel, sempre, mesmo dentro da alínea;
      //   · `valorIntegralizado` é o que AQUELE sócio integraliza, sempre.
      // Com integralização parcial (A entra com 33%, B segura 67%) e com
      // matrícula dividida entre dois sócios, "avaliado em R$ X" e "integraliza
      // R$ Y" são números diferentes, e o leitor que soma as alíneas precisa dos
      // dois para não achar que o capital está errado.
      { id: 'valor', label: 'Valor contábil (R$)', tipo: 'valor' },
      valorExtensoCampo,
      { id: 'valorDoImovel', label: 'Valor contábil do imóvel inteiro (R$)', tipo: 'valor' },
      {
        id: 'valorDoImovelExtenso',
        label: 'Valor do imóvel inteiro (por extenso)',
        tipo: 'texto',
        derivadoDe: 'valorDoImovel',
        derivar: (v) => {
          const n = paraNumeroBR(v.valorDoImovel);
          return Number.isFinite(n) ? valorExtenso(n) : '';
        },
      },
      { id: 'valorIntegralizado', label: 'Valor que este sócio integraliza (R$)', tipo: 'valor' },
      {
        id: 'valorIntegralizadoExtenso',
        label: 'Valor que este sócio integraliza (por extenso)',
        tipo: 'texto',
        derivadoDe: 'valorIntegralizado',
        derivar: (v) => {
          const n = paraNumeroBR(v.valorIntegralizado);
          return Number.isFinite(n) ? valorExtenso(n) : '';
        },
      },
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
      // Nome CADASTRADO da serventia ("2º Ofício de Registro de Imóveis de
      // Sinop"), com fallback genérico no mapeador — nunca vazio.
      { id: 'cartorio', label: 'Cartório', tipo: 'texto' },
      // Sinal de vínculo real. `cartorio` não serve de guarda porque recebe um
      // fallback sintético quando não há serventia cadastrada.
      { id: 'temCartorio', label: 'Tem cartório vinculado? (condicional)', tipo: 'texto' },
      { id: 'comarca', label: 'Comarca', tipo: 'texto' },
      {
        // A comarca APENAS quando ela ainda não está contida no nome do
        // cartório. É o campo que o bloco condiciona ("do {{ imovel.cartorio
        // }}{{#imovel.cartorioComarca}} da comarca de …{{/…}}"): sem ele, o
        // cartório cujo nome já traz a cidade sai "…de Sinop da comarca de
        // Sinop". A supressão da redundância é decisão do MAPEADOR, num lugar
        // só, não de cada bloco.
        id: 'cartorioComarca',
        label: 'Comarca (complemento, quando não está no nome do cartório)',
        tipo: 'texto',
      },
      { id: 'ufCartorio', label: 'Estado (UF) do cartório', tipo: 'texto' },
      ufComPreposicaoCampo('ufCartorioComPreposicao', 'Estado do cartório com a preposição', 'ufCartorio'),
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
  // --- Instrumentos agrários -------------------------------------------------
  //
  // O CABEÇALHO do instrumento de exploração rural: o que vale para o contrato
  // inteiro, e não para uma das partes nem para um dos imóveis. Sai da linha de
  // `exploracao_rural`, menos foro e número de vias, que são do ATO de gerar e
  // por isso vêm marcados como manuais (mesmo tratamento da data de assinatura
  // do Contrato Social: vazios, viram lacuna assinalável em vez de sumir).
  //
  // Extensos e condicionais são DERIVADOS aqui, e não montados no mapeador: é o
  // que faz o "Ajustar dados manualmente" oferecer o campo-base certo (trocar 30
  // por 40 reescreve "quarenta por cento" sozinho) em vez de deixar o número e a
  // frase discordarem dentro do mesmo contrato.
  instrumento: {
    tipo: 'instrumento',
    label: 'Instrumento (exploração rural)',
    campos: [
      { id: 'tipoExploracao', label: 'Tipo de exploração (parceria/composse)', tipo: 'texto' },
      { id: 'dataAssinatura', label: 'Data da assinatura', tipo: 'data', obrigatorio: true },
      { id: 'dataInicioVigencia', label: 'Início da vigência', tipo: 'data' },
      { id: 'dataEncerramento', label: 'Encerramento da vigência', tipo: 'data' },
      // As datas por extenso ao lado das numéricas: os assinados escrevem a
      // vigência e o fecho em prosa ("findará em 10 de outubro de 2.025",
      // "Lucas do Rio Verde/MT, 10 de outubro de 2.022"), e a numérica segue
      // servindo a quem só precisa da referência curta.
      dataExtensoCampo('dataAssinaturaExtenso', 'Data da assinatura (por extenso)', 'dataAssinatura'),
      dataExtensoCampo('dataEncerramentoExtenso', 'Encerramento da vigência (por extenso)', 'dataEncerramento'),
      { id: 'prorrogavel', label: 'Vigência prorrogável? (condicional)', tipo: 'texto' },

      // A pecuária troca UMA palavra em três trechos (título, vigência e capítulo
      // de atividades). Não é campo de texto: deriva do "inclui pecuária?".
      { id: 'pecuaria', label: 'Inclui pecuária? (condicional)', tipo: 'texto' },
      {
        id: 'natureza',
        label: 'Natureza da exploração (AGROPECUÁRIA/AGRÍCOLA)',
        tipo: 'texto',
        derivadoDe: 'pecuaria',
        derivar: (v) => (v.pecuaria ? 'AGROPECUÁRIA' : 'AGRÍCOLA'),
      },
      {
        id: 'naturezaPlural',
        label: 'Natureza da exploração no plural',
        tipo: 'texto',
        // Deriva de `pecuaria`, não de `natureza`: o formulário de ajuste manual
        // troca o campo derivado pelos seus BASES, e encadear derivado sobre
        // derivado ofereceria um campo não editável como se fosse editável.
        derivadoDe: 'pecuaria',
        derivar: (v) => (v.pecuaria ? 'AGROPECUÁRIAS' : 'AGRÍCOLAS'),
      },
      // As mesmas palavras na CAIXA de quem as recebe. O assinado põe a natureza
      // em caixa alta só no título; no meio da frase escreve minúscula
      // ("constituem parceria rural para exploração agropecuária", "para fins de
      // exploração agropecuária tem vigência"), e no subtítulo do capítulo ela
      // acompanha o Title Case do resto ("Das Atividades Agropecuárias").
      //
      // São campos próprios, e não uma função de caixa no motor: o bloco escolhe
      // a forma que a frase dele pede, e "AGROPECUÁRIA" no meio de um período é
      // exatamente o tipo de erro que passa despercebido na revisão.
      {
        id: 'naturezaMinuscula',
        label: 'Natureza da exploração em minúscula (agropecuária/agrícola)',
        tipo: 'texto',
        derivadoDe: 'pecuaria',
        derivar: (v) => (v.pecuaria ? 'agropecuária' : 'agrícola'),
      },
      {
        // Para o nome do instrumento CITADO no meio da prosa, que o fecho do
        // preâmbulo escreve em Title Case: "o presente *Instrumento Particular
        // de Parceria para Fins de Exploração Agropecuária*".
        id: 'naturezaTitulo',
        label: 'Natureza da exploração em Title Case (Agropecuária/Agrícola)',
        tipo: 'texto',
        derivadoDe: 'pecuaria',
        derivar: (v) => (v.pecuaria ? 'Agropecuária' : 'Agrícola'),
      },
      {
        id: 'naturezaPluralTitulo',
        label: 'Natureza da exploração no plural, em Title Case',
        tipo: 'texto',
        derivadoDe: 'pecuaria',
        derivar: (v) => (v.pecuaria ? 'Agropecuárias' : 'Agrícolas'),
      },
      { id: 'culturas', label: 'Culturas exploradas', tipo: 'textarea' },
      /**
       * As três modalidades de pecuária, uma condicional cada.
       *
       * NÃO derivam de `pecuaria`, que é outra pergunta: aquele diz se há gado
       * (e troca AGRÍCOLA por AGROPECUÁRIA); estas dizem O QUE SE MEDE na
       * partilha da Cláusula Quinta — ganho de peso, bezerros nascidos, ou peso
       * apurado a cada 12 meses. Um contrato pode ter as três (a parceria do MMS
       * tem, com seis parágrafos) ou duas (a do Bela Vista, com cinco), então não
       * é escolha entre variantes nem consequência de um booleano.
       *
       * Vêm do cadastro (`exploracao_rural.pecuaria_modalidades`), como `pecuaria`
       * e `penhor` — e não de flag manual: a escolha é fato DESTE contrato, e o
       * mesmo cliente pode ter duas parcerias com modalidades diferentes.
       */
      { id: 'pecuariaRecriaEngorda', label: 'Pecuária de recria e engorda? (condicional)', tipo: 'texto' },
      { id: 'pecuariaCria', label: 'Pecuária de cria? (condicional)', tipo: 'texto' },
      { id: 'pecuariaCicloCompleto', label: 'Pecuária de ciclo completo? (condicional)', tipo: 'texto' },
      { id: 'penhor', label: 'Autoriza penhor da produção? (condicional)', tipo: 'texto' },

      // Partilha dos frutos (parceria).
      { id: 'percentualOutorgante', label: 'Percentual do outorgante', tipo: 'texto' },
      percentualCartorialCampo('percentualOutorganteExtenso', 'Percentual do outorgante (por extenso)', 'percentualOutorgante'),
      { id: 'percentualExplorador', label: 'Percentual do explorador', tipo: 'texto' },
      percentualCartorialCampo('percentualExploradorExtenso', 'Percentual do explorador (por extenso)', 'percentualExplorador'),

      // Indivisão da coisa comum (composse). Quantidade e unidade separadas, com
      // o extenso ao lado — a frase "3 (três) anos" é montada pelo BLOCO, como
      // em "{{ numeroVias }} ({{ numeroViasExtenso }}) vias".
      { id: 'prazoIndivisaoQuantidade', label: 'Prazo de indivisão — quantidade', tipo: 'inteiro' },
      cardinalCampo('prazoIndivisaoQuantidadeExtenso', 'Prazo de indivisão — quantidade (por extenso)', 'prazoIndivisaoQuantidade'),
      { id: 'prazoIndivisaoUnidade', label: 'Prazo de indivisão — unidade (anos/meses)', tipo: 'texto' },
      { id: 'indivisaoProrrogavel', label: 'Indivisão prorrogável? (condicional)', tipo: 'texto' },
      { id: 'indivisaoAvisoQuantidade', label: 'Aviso de divisão — antecedência', tipo: 'inteiro' },
      cardinalCampo('indivisaoAvisoQuantidadeExtenso', 'Aviso de divisão — antecedência (por extenso)', 'indivisaoAvisoQuantidade'),
      { id: 'indivisaoAvisoUnidade', label: 'Aviso de divisão — unidade (meses/dias)', tipo: 'texto' },

      // Administração da composse.
      { id: 'regraAdministracao', label: 'Regra de administração (maioria/nomeados)', tipo: 'texto' },
      condicionalCampo('administracaoMaioria', 'Administração por maioria? (condicional)',
        ['regraAdministracao', 'tipoExploracao'],
        (v) => v.tipoExploracao === 'composse' && v.regraAdministracao === 'maioria'),
      condicionalCampo('administracaoNomeados', 'Administração por nomeados? (condicional)',
        ['regraAdministracao', 'tipoExploracao'],
        (v) => v.tipoExploracao === 'composse' && v.regraAdministracao === 'nomeados'),
      // Isoladamente vs. em conjunto NÃO é campo do cadastro: sai de quantos
      // nomeados a lista tem, e quem conta é o mapeador.
      { id: 'nomeadoUnico', label: 'Administrador nomeado é único? (condicional)', tipo: 'texto' },
      { id: 'nomeadosEmConjunto', label: 'Nomeados administram em conjunto? (condicional)', tipo: 'texto' },

      // Liquidação de haveres (composse).
      { id: 'liquidacaoParcelas', label: 'Liquidação — nº de parcelas', tipo: 'inteiro' },
      cardinalCampo('liquidacaoParcelasExtenso', 'Liquidação — nº de parcelas (por extenso)', 'liquidacaoParcelas'),
      { id: 'liquidacaoPeriodicidade', label: 'Liquidação — periodicidade (anual/mensal)', tipo: 'texto' },
      {
        id: 'liquidacaoPeriodicidadeProsa',
        label: 'Liquidação — periodicidade em prosa',
        tipo: 'texto',
        derivadoDe: 'liquidacaoPeriodicidade',
        // "anuais", e não "anuais e consecutivas": o composse assinado do MMS diz
        // "em 10 (dez) parcelas iguais e anuais atualizadas monetariamente", e o
        // "e consecutivas" era acréscimo meu dentro de cláusula assinada — o
        // mesmo caso do "dele" da Cláusula Décima Sexta da parceria e do "Da" do
        // Capítulo III do composse.
        //
        // Este campo é derivado e editável: contrato que de fato diga
        // "consecutivas" ganha a palavra pelo "Ajustar dados manualmente", em vez
        // de todos os contratos a receberem de graça.
        derivar: (v) => (v.liquidacaoPeriodicidade === 'anual' ? 'anuais' : 'mensais'),
      },
      // NÃO deriva da periodicidade, por mais que pareça: dois contratos reais
      // com parcelas anuais discordam do vencimento da primeira (um usa "1 (um)
      // ano do evento", outro "30 (trinta) dias"). São eixos independentes, e
      // amarrá-los faria o gerador escrever com confiança uma data que o
      // contrato do cliente não tem. O mapeador põe o padrão; o consultor troca
      // no "Ajustar dados manualmente".
      { id: 'liquidacaoPrimeiroVencimento', label: 'Liquidação — vencimento da 1ª parcela', tipo: 'texto' },

      // Nome sob o qual a composse gira. O complemento não é derivável ("E
      // OUTROS" em três compossuidores, "E ESPOSA" num casal, e nem toda dupla é
      // um casal): o mapeador põe o padrão e o consultor corrige.
      { id: 'nomeComposse', label: 'Nome pelo qual a composse gira', tipo: 'texto' },

      // Preenchidos pelo mapeador a partir das listas — o Anexo e a Cláusula
      // Primeira citam a faixa de alíneas e o dono/cartório comuns.
      { id: 'primeiraAlinea', label: 'Primeira alínea do Anexo', tipo: 'texto' },
      { id: 'ultimaAlinea', label: 'Última alínea do Anexo', tipo: 'texto' },
      // "advém do seguinte instrumento" / "dos seguintes instrumentos". Conta os
      // GRUPOS de origem, não os imóveis: seis imóveis de uma parceria só são um
      // instrumento. O engine não tem "else", daí os dois campos.
      { id: 'origemUnica', label: 'A posse vem de um só instrumento? (condicional)', tipo: 'texto' },
      { id: 'origensVarias', label: 'A posse vem de dois ou mais instrumentos? (condicional)', tipo: 'texto' },
      { id: 'proprietarioComum', label: 'Proprietário comum dos imóveis', tipo: 'texto' },
      { id: 'cartorioComum', label: 'Cartório comum dos imóveis', tipo: 'texto' },
      { id: 'cartorioComumComarca', label: 'Comarca a dizer depois do nome do cartório', tipo: 'texto' },
      /**
       * A qualificação da outorgante como o preâmbulo assinado a escreve: a frase
       * de `pessoa` MAIS o capital social vigente na assinatura MAIS os
       * administradores qualificados por inteiro.
       *
       * Mora no instrumento, e não em `{{ outorgante }}`, porque os dois dados que
       * `pessoa` não tem — o capital NAQUELA data e quem assinava por ela — são
       * fatos deste instrumento. É a mesma razão pela qual o capital da origem da
       * posse é campo da relação. Quem escreve a frase continua sendo
       * `montarQualificacao`; ver `qualificacaoDoOutorgante` em contextoRural.ts.
       */
      { id: 'outorganteQualificacao', label: 'Qualificação da parceira outorgante', tipo: 'textarea' },

      // Do ATO de gerar, não do cadastro.
      { id: 'foroComarca', label: 'Foro — comarca', tipo: 'texto', manual: true, obrigatorio: true },
      { id: 'foroUf', label: 'Foro — UF', tipo: 'texto', manual: true, obrigatorio: true },
      ufExtensoCampo('foroUfExtenso', 'Foro — Estado por extenso', 'foroUf'),
      ufComPreposicaoCampo('foroUfComPreposicao', 'Foro — Estado com a preposição', 'foroUf'),
      { id: 'numeroVias', label: 'Número de vias', tipo: 'inteiro', manual: true },
      cardinalCampo('numeroViasExtenso', 'Número de vias (por extenso)', 'numeroVias'),
      /**
       * O instituto que apura o preço na praça do foro, citado no parágrafo da
       * mora ("os preços apurados pelo IMEA – Instituto Mato-Grossense de
       * Economia e Agropecuária").
       *
       * `manual` e NÃO derivado da UF de propósito: o corpus tem dois institutos
       * (IMEA no Mato Grosso, IAGRO na Bahia) e não existe tabela dos vinte e
       * sete. Derivar de duas amostras seria inventar o nome do órgão para
       * vinte e cinco estados, e um contrato que cita um instituto inexistente é
       * pior do que um contrato com lacuna assinalável.
       */
      { id: 'institutoPreco', label: 'Instituto que apura o preço (sigla e nome)', tipo: 'texto', manual: true },
    ],
  },
  // De onde vem a posse de um grupo de imóveis, como o Considerando V escreve.
  // É sempre item de lista ({{#origensDaPosse}}), nunca binding unitário — e o
  // OUTORGANTE dela não mora aqui: é uma `pessoa` de verdade, alcançada por
  // {{ outorgante.* }} dentro do item, pelo mesmo mapeador que qualifica
  // qualquer outra. O único dado que `pessoa` não guarda é o capital social na
  // DATA daquele instrumento, que é retrato e por isso é campo desta relação.
  origemPosse: {
    tipo: 'origemPosse',
    label: 'Origem da posse',
    campos: [
      { id: 'letra', label: 'Letra da origem (a, b, c…)', tipo: 'texto' },
      { id: 'itens', label: 'Itens do Anexo que vêm desta origem', tipo: 'texto' },
      { id: 'advir', label: 'Verbo concordado (advém/advêm)', tipo: 'texto' },
      { id: 'tipo', label: 'Tipo do instrumento de origem', tipo: 'texto' },
      { id: 'tipoPorExtenso', label: 'Tipo do instrumento de origem, com a preposição', tipo: 'texto' },
      { id: 'propria', label: 'Exploração própria? (condicional)', tipo: 'texto' },
      { id: 'deTerceiro', label: 'Vem de terceiro? (condicional, o engine não tem else)', tipo: 'texto' },
      { id: 'tituloInstrumento', label: 'Título do instrumento de origem', tipo: 'texto' },
      { id: 'dataAssinatura', label: 'Data de assinatura da origem', tipo: 'data' },
      // O Considerando V escreve a data POR EXTENSO ("firmado em 10 de outubro de
      // 2.022"), como o assinado. Em dd/mm/aaaa a citação do instrumento anterior
      // sai num formato que nenhum outro trecho do contrato usa.
      dataExtensoCampo('dataAssinaturaExtenso', 'Data de assinatura da origem (por extenso)', 'dataAssinatura'),
      { id: 'capitalSocialNaAssinatura', label: 'Capital social do outorgante na assinatura (R$)', tipo: 'valor' },
      {
        id: 'capitalSocialNaAssinaturaExtenso',
        label: 'Capital social do outorgante na assinatura (por extenso)',
        tipo: 'texto',
        derivadoDe: 'capitalSocialNaAssinatura',
        derivar: (v) => {
          const n = paraNumeroBR(v.capitalSocialNaAssinatura);
          return Number.isFinite(n) ? valorExtenso(n) : '';
        },
      },
    ],
  },

  /**
   * Um órgão de governança do cliente: Conselho de Administração, Diretoria,
   * Reunião de Sócios, ou a instância que o cliente inventou.
   *
   * Os campos de composição vêm de `orgao_governanca` (GOV-01) mais a
   * parametrização. NÃO entram aqui `vigencia_inicio` e `vigencia_fim`: nos
   * sete contratos lidos a vigência do órgão não vira cláusula nenhuma, é
   * histórico do sistema. Nem `entra_no_contrato`, que é filtro de composição
   * do modelo e não texto.
   *
   * Numeral E extenso lado a lado, como no livro e folha da matrícula, porque
   * o contrato escreve "no mínimo 03 (três) e no máximo 06 (seis) membros".
   */
  orgaoGovernanca: {
    tipo: 'orgaoGovernanca',
    label: 'Órgão de governança',
    campos: [
      { id: 'nome', label: 'Nome do órgão', tipo: 'texto', obrigatorio: true },

      /*
       * A CLÁUSULA CONCORDA COM O ÓRGÃO, e por isso o gênero é campo.
       *
       * "O Conselho de Administração será compostO por" contra "A Diretoria
       * será compostA por"; "Compete AO Conselho" contra "Compete À Diretoria".
       * O card manda usar `derivadoDe`/`derivar` para concordância em vez de uma
       * segunda função, e é o que estes três fazem, chamando o `concordar` que
       * já qualifica pessoa.
       *
       * O gênero não se deduz da TERMINAÇÃO: "Conselho de Administração" acaba
       * em palavra feminina, e "gestão" e "órgão" acabam igual sendo uma
       * feminina e outro masculino. Deduz-se da primeira palavra, que é o
       * núcleo, e quem faz isso é `generoDoOrgao` no cadastro. Aqui o campo
       * chega resolvido.
       *
       * `interno` porque é propriedade da PALAVRA, não do órgão: no painel de
       * conferência ele não seria dado a conferir, seria uma alavanca para
       * quebrar a concordância. Vem do cadastro do órgão e se corrige lá.
       */
      { id: 'genero', label: 'Gênero do nome (M/F)', tipo: 'texto', interno: true },
      {
        id: 'artigo',
        label: 'Artigo do órgão (o/a)',
        tipo: 'texto',
        derivadoDe: 'genero',
        derivar: (v) => PARES.artigo(v.genero === 'F' ? 'F' : 'M'),
      },
      {
        /*
         * O artigo em caixa alta, para começo de frase. O contrato abre a
         * cláusula com "O Conselho de Administração será composto" e diz
         * "Compete ao Conselho" no meio de outra: é a mesma concordância em
         * duas posições, e o motor não capitaliza sozinho. Mesma ideia do
         * `socioTitulo`, que existe porque o rótulo da assinatura é título e
         * não meio de frase.
         */
        id: 'artigoMaiusculo',
        label: 'Artigo em começo de frase (O/A)',
        tipo: 'texto',
        derivadoDe: 'genero',
        derivar: (v) => concordar(v.genero === 'F' ? 'F' : 'M', 'O', 'A'),
      },
      {
        id: 'ao',
        label: 'Preposição com artigo (ao/à)',
        tipo: 'texto',
        derivadoDe: 'genero',
        derivar: (v) => concordar(v.genero === 'F' ? 'F' : 'M', 'ao', 'à'),
      },
      {
        id: 'composto',
        label: 'Composto/composta, concordado',
        tipo: 'texto',
        derivadoDe: 'genero',
        derivar: (v) => concordar(v.genero === 'F' ? 'F' : 'M', 'composto', 'composta'),
      },

      { id: 'membrosMinimo', label: 'Mínimo de membros', tipo: 'inteiro' },
      numeralCampo('membrosMinimoNumeral', 'Mínimo de membros (numeral)', 'membrosMinimo'),
      cardinalCampo('membrosMinimoExtenso', 'Mínimo de membros (por extenso)', 'membrosMinimo'),

      { id: 'membrosMaximo', label: 'Máximo de membros', tipo: 'inteiro' },
      numeralCampo('membrosMaximoNumeral', 'Máximo de membros (numeral)', 'membrosMaximo'),
      cardinalCampo('membrosMaximoExtenso', 'Máximo de membros (por extenso)', 'membrosMaximo'),

      /*
       * Horita e Bela Vista escrevem "composto por 03 (três) membros", sem
       * faixa. Não é campo novo: é mínimo igual a máximo, e o bloco troca de
       * redação sozinho. Publicar os dois lados porque o engine não tem else.
       */
      condicionalCampo(
        'membrosFixo',
        'Número fixo de membros? (condicional)',
        ['membrosMinimo', 'membrosMaximo'],
        (v) => !!v.membrosMinimo && v.membrosMinimo === v.membrosMaximo,
      ),
      condicionalCampo(
        'membrosEmFaixa',
        'Membros em faixa mínimo/máximo? (condicional)',
        ['membrosMinimo', 'membrosMaximo'],
        (v) => !!v.membrosMinimo && !!v.membrosMaximo && v.membrosMinimo !== v.membrosMaximo,
      ),

      { id: 'mandatoAnos', label: 'Mandato, em anos', tipo: 'inteiro' },
      numeralCampo('mandatoAnosNumeral', 'Mandato (numeral)', 'mandatoAnos'),
      cardinalCampo('mandatoAnosExtenso', 'Mandato (por extenso)', 'mandatoAnos'),

      /*
       * Os cargos chegam já concatenados pelo mapeador ("Diretor de Mercado e
       * Finanças, Diretor Operações e Diretor de Sistema de Irrigação", que é o
       * Bela Vista literal). Vazio, o Mattei mostra a saída: "com denominação
       * atribuída no momento da composição".
       */
      { id: 'cargos', label: 'Cargos deste órgão', tipo: 'texto' },
      condicionalCampo('temCargos', 'Tem cargos nomeados? (condicional)', 'cargos', (v) => !!v.cargos),
      condicionalCampo('semCargos', 'Sem cargos nomeados? (condicional)', 'cargos', (v) => !v.cargos),

      /*
       * NÃO HÁ CAMPO DE REPRESENTAÇÃO AQUI, e a ausência é medida.
       *
       * O limite de valor para representar a sociedade aparece em UM dos sete
       * contratos, o Perci ("cujo valor não exceda R$ 2.000.000,00"). Mattei,
       * Bela Vista, Horita, Zamo, Agro Ferragens e o modelo da casa não têm nem
       * "exceda" nem "dois diretores em conjunto".
       *
       * Nas matrizes a frequência é outra, três em cinco, o que diz que a
       * consultoria propõe a regra e ela raramente chega ao contrato. Uma
       * ocorrência em sete não paga campo; ele volta se a consultoria disser
       * que a regra é padrão.
       */
    ],
  },

  /**
   * Uma célula da Matriz de Alçadas: o que UM órgão faz em UMA atividade.
   *
   * É o item da lista que vira alínea da cláusula de competência, e a mesma
   * célula serve à grade do documento da Matriz. Os campos chegam prontos do
   * mapeador porque a leitura deles já existe em `lib/matrizAlcadas.ts`: papéis
   * concatenados, alçada com unidade e base já resolvidas.
   */
  competenciaMatriz: {
    tipo: 'competenciaMatriz',
    label: 'Competência da Matriz de Alçadas',
    campos: [
      { id: 'atividade', label: 'Atividade', tipo: 'texto', obrigatorio: true },
      { id: 'detalhamento', label: 'O que a atividade abrange neste cliente', tipo: 'texto' },
      { id: 'papeis', label: 'Papéis na decisão', tipo: 'texto' },
      /*
       * OS MESMOS VERBOS NO INFINITIVO, que é como a alínea do contrato
       * escreve: a célula da Matriz diz "Delibera" e a cláusula diz
       * "Deliberar sobre a distribuição de lucros". Vem do catálogo, não de
       * derivação: 7 dos 32 papéis terminam em "e" e são ambíguos entre -er e
       * -ir (Decide/Decidir contra Submete/Submeter).
       */
      { id: 'papeisInfinitivo', label: 'Papéis no infinitivo', tipo: 'texto' },
      /*
       * A preposição do órgão de destino, que concorda com o gênero DELE e não
       * com o desta célula. Sem ela saía "encaminhando a Conselho" e
       * "encaminhando a Reunião de Sócios", no documento gerado em 14/09.
       */
      { id: 'sobeParaAo', label: 'Preposição do destino (ao/à)', tipo: 'texto' },
      { id: 'alcada', label: 'Alçada (valor ou percentual, já formatada)', tipo: 'texto' },
      { id: 'sobePara', label: 'Sobe para', tipo: 'texto' },
      { id: 'foraDaPolitica', label: 'Trata do que foge da política? (condicional)', tipo: 'texto' },
      { id: 'resumo', label: 'A célula inteira em uma linha (para a grade)', tipo: 'texto' },
      condicionalCampo('temDetalhamento', 'Tem detalhamento? (condicional)', 'detalhamento', (v) => !!v.detalhamento),
      condicionalCampo('temAlcada', 'Tem alçada? (condicional)', 'alcada', (v) => !!v.alcada),
      condicionalCampo('sobe', 'Escala para outro órgão? (condicional)', 'sobePara', (v) => !!v.sobePara),
    ],
  },

  /**
   * Os parâmetros do Acordo de Quotistas que a alteração contratual consome.
   *
   * Vinculados contra o LEVANTAMENTO, não contra tabela: o cadastro do acordo é
   * a GOV-03 e vem depois. Aqui entram os seis medidos descendo ao contrato
   * social (cláusula de preferência e de apuração de haveres) mais os que a
   * cláusula do capítulo do Acordo precisa. Os outros 27 parâmetros medidos
   * chegam com a GOV-03.
   */
  acordoQuotistas: {
    tipo: 'acordoQuotistas',
    label: 'Acordo de Quotistas (parâmetros)',
    campos: [
      /*
       * `assinadoEm` NÃO É A LINHA DE ASSINATURA. São duas datas diferentes, e
       * confundi-las escreve o documento errado.
       *
       * A LINHA que se preenche à mão na hora de assinar é `dataAssinatura`, em
       * CAMPOS_MANUAIS, no fim deste arquivo: ela é do documento SENDO GERADO,
       * não tem cadastro por trás, e vazia vira a lacuna assinalável em vez de
       * resolver ''. É ela que o fecho do Acordo usa.
       *
       * `assinadoEm` é um FATO sobre um acordo que já existe, e quem o escreve é
       * o CONTRATO SOCIAL, no meio de uma cláusula dele. Medido nos contratos do
       * acervo, os três casos:
       *
       *   Perci, já assinado: "o acordo celebrado entre as partes, em 29 de
       *   Janeiro de 2.021, e disponível na sede da sociedade"
       *
       *   Bela Vista, ainda não: "firmaram em __ de ____ de 2.025, acordo de
       *   quotistas com vigência pelo período de 20 (vinte) anos"
       *
       *   Modelo: "firmaram em [dia] de [mês] de [ano], acordo de quotistas"
       *
       * Ou seja: o contrato social precisa saber a data do acordo do cliente
       * para citá-la, e é isso que este campo guarda. Vazio, o capítulo sai na
       * outra redação, com a lacuna ou com "os sócios poderão firmar".
       */
      { id: 'assinadoEm', label: 'Data de assinatura do acordo', tipo: 'data' },
      dataExtensoCampo('assinadoEmExtenso', 'Data de assinatura (por extenso)', 'assinadoEm'),
      condicionalCampo('jaAssinado', 'Acordo já assinado? (condicional)', 'assinadoEm', (v) => !!v.assinadoEm),
      condicionalCampo('aindaNaoAssinado', 'Acordo ainda não firmado? (condicional)', 'assinadoEm', (v) => !v.assinadoEm),

      { id: 'vigenciaAnos', label: 'Vigência do acordo, em anos', tipo: 'inteiro' },
      numeralCampo('vigenciaAnosNumeral', 'Vigência do acordo (numeral)', 'vigenciaAnos'),
      cardinalCampo('vigenciaAnosExtenso', 'Vigência do acordo (por extenso)', 'vigenciaAnos'),

      /*
       * NÃO EXISTE PRAZO DE SIGILO, e os quatro campos dele sairam daqui.
       *
       * Contado nos sete acordos do acervo: ZERO ocorrências de sigilo ou
       * confidencialidade como cláusula. Campo sem frase em documento nenhum é
       * campo que não devia existir, mesma regra que derrubou o limite de aval e
       * fiança.
       *
       * O par numeral+extenso continua vivo nos outros prazos: `numeralContrato`
       * zera à esquerda e `cardinalExtenso` soletra, e juntos escrevem "03
       * (três) anos".
       */

      /*
       * O ALCANCE, que muda a redação de quase toda cláusula.
       *
       * Com sociedades relacionadas listadas, a regra passa a dizer "da
       * SOCIEDADE e das SOCIEDADES RELACIONADAS". As empresas em si são LISTA
       * (ver PAPEIS_LISTA em binding.ts); aqui só fica o interruptor, porque uma
       * seção {{#…}} vazia não reescreve a frase de fora dela.
       *
       * `interno` nos dois: não são dado a conferir, são o reflexo de uma lista
       * que se confere na própria lista.
       */
      { id: 'temSociedadesRelacionadas', label: 'Alcança sociedades relacionadas? (condicional)',
        tipo: 'texto', interno: true },
      { id: 'temRamos', label: 'O acordo divide a família em ramos? (condicional)',
        tipo: 'texto', interno: true },
      /*
       * QUANTOS RAMOS SAO, POR EXTENSO, e a falta disto so apareceu ao montar a
       * clausula de verdade para conferir.
       *
       * O AgroAlianca abre a definicao contando: "os DOIS grupos de descendentes
       * em linha vertical das QUOTISTAS". O numero esta FORA da secao de
       * repeticao, entao {{#ramosFamiliares}} nao o alcanca, e sem campo a frase
       * sairia "os grupos de descendentes" ou com um numero chumbado no bloco,
       * que mentiria no cliente com tres ramos.
       */
      { id: 'quantosRamos', label: 'Quantos ramos familiares', tipo: 'inteiro', interno: true },
      cardinalCampo('quantosRamosExtenso', 'Quantos ramos (por extenso)', 'quantosRamos'),

      /*
       * A REUNIÃO PRÉVIA, e o que ela obriga.
       *
       * Não é combinação verbal: a ata dela "constitui Acordo de Voto, de forma
       * a definir e vincular o voto dos QUOTISTAS a serem proferidos, sempre em
       * bloco e de modo uniforme, nas REUNIÕES DE SÓCIOS", literal no modelo da
       * casa. Quem é o bloco varia: no modelo, Perci e Horita são todos os
       * quotistas juntos; na AgroAliança é cada ramo por si ("Cada grupo de
       * DESCENDENTES DAS QUOTISTAS votará conjuntamente, como um bloco único"),
       * e é `temRamos` que distingue os dois casos para o bloco de texto.
       */
      { id: 'reuniaoPreviaObrigatoria', label: 'Reunião prévia obrigatória? (condicional)',
        tipo: 'texto' },
      condicionalCampo('semReuniaoPrevia', 'Acordo sem reunião prévia? (condicional)',
        'reuniaoPreviaObrigatoria', (v) => !v.reuniaoPreviaObrigatoria),

      /*
       * A APURAÇÃO DE HAVERES TEM UM CAMPO SÓ, E NÃO SEIS.
       *
       * A primeira versão publicava prazo do balanço, horizonte do fluxo, taxa
       * mínima e regra de combinação como campos. Medido nos sete contratos,
       * nenhum deles varia: "60 (sessenta) dias" em 6 de 6, "05 (cinco) anos"
       * em 3 de 3, IPCA nos 2 que têm, e "maior valor" nos 2 que têm. Campo que
       * não varia é texto fixo do modelo, e publicá-lo convida alguém a montar
       * formulário para uma pergunta que não existe.
       *
       * O que VARIA é se a apuração usa o fluxo de caixa descontado além do
       * patrimônio líquido: Bela Vista, Horita e Agro Ferragens usam os dois;
       * Perci, Mattei e Zamo usam só o patrimônio líquido. Então é UMA condição
       * que acende o bloco inteiro do fluxo, com os números dentro dele fixos.
       */
      /*
       * A PREFERÊNCIA: a fila em prosa, o que passa por ela, e o interruptor.
       *
       * `ordemPreferencia` é a fila já escrita ("aos descendentes dos
       * SIGNATÁRIOS, depois aos demais QUOTISTAS"), para a cláusula que a diz
       * numa frase só. A mesma fila também sai como LISTA, para o bloco que
       * quer uma alínea por posição; as duas vêm da mesma tabela.
       */
      { id: 'ordemPreferencia', label: 'Ordem do direito de preferência', tipo: 'texto' },
      { id: 'objetosPreferencia', label: 'Objetos sujeitos à preferência (em prosa)',
        tipo: 'texto' },
      { id: 'objetosPreferenciaChaves', label: 'Objetos sujeitos à preferência (chaves)',
        tipo: 'texto', interno: true },
      // A Cláusula Quinta trata das quotas; é a Décima que estende a imóveis,
      // máquinas e oportunidades, e ela só existe se houver algo além delas.
      {
        id: 'preferenciaAlemDasQuotas',
        label: 'A preferência vai além das quotas? (condicional)',
        tipo: 'texto',
        derivadoDe: 'objetosPreferenciaChaves',
        derivar: (v) => {
          const itens = (v.objetosPreferenciaChaves ?? '')
            .split(',').map((x) => x.trim()).filter(Boolean);
          return itens.some((x) => x !== 'quotas') ? 'sim' : '';
        },
      },

      /*
       * OS MECANISMOS, e por que só seis viram condicional aqui.
       *
       * O cadastro tem dez marcações, mas quatro delas já têm um interruptor
       * próprio com os detalhes pendurados: não concorrência, opção de compra,
       * opção de venda e arbitragem. Duas fontes para o mesmo fato é convite a
       * documento com cabeçalho de cláusula e corpo vazio, então A REGRA É UMA:
       * onde existe interruptor com detalhe, ele decide; a marcação do
       * mecanismo é índice, não chave. Os seis abaixo não têm detalhe nenhum, e
       * a marcação é tudo o que existe.
       *
       * (A duplicidade está no CADASTRO, não aqui. Some quando a tela deixar as
       * quatro marcações espelharem o interruptor em vez de aceitarem resposta
       * própria.)
       */
      { id: 'mecanismos', label: 'Mecanismos marcados (chaves)', tipo: 'texto', interno: true },
      itemDaListaCampo('temPreferencia', 'Tem direito de preferência? (condicional)',
        'mecanismos', 'preferencia'),
      itemDaListaCampo('temLockUp', 'Tem lock-up? (condicional)', 'mecanismos', 'lock_up'),
      itemDaListaCampo('temTagAlong', 'Tem tag along? (condicional)', 'mecanismos', 'tag_along'),
      itemDaListaCampo('temDragAlong', 'Tem drag along? (condicional)',
        'mecanismos', 'drag_along'),
      itemDaListaCampo('temQuarentena', 'Tem quarentena? (condicional)',
        'mecanismos', 'quarentena'),
      itemDaListaCampo('temUsufrutoComVoto', 'Trata de usufruto com voto? (condicional)',
        'mecanismos', 'usufruto'),

      /*
       * A APURAÇÃO DE HAVERES TEM DOIS CAMPOS, E NÃO SEIS.
       *
       * A primeira versão publicava prazo do balanço, horizonte do fluxo, taxa
       * mínima e regra de combinação como campos. Medido nos sete contratos,
       * nenhum deles varia: "60 (sessenta) dias" em 7 de 7, "05 (cinco) anos"
       * em 3 de 3, IPCA nos 2 que citam índice, e "maior valor" em todos que
       * combinam. Campo que não varia é texto fixo do modelo, e publicá-lo
       * convida alguém a montar formulário para uma pergunta que não existe.
       *
       * O que VARIA é quais métodos entram: Bela Vista, Horita e Agro Ferragens
       * usam patrimônio líquido e fluxo de caixa descontado; Perci, Mattei e
       * Zamo usam só o patrimônio líquido. Então é uma condição que acende o
       * bloco inteiro do fluxo, com os números dentro dele fixos.
       */
      { id: 'metodosAvaliacao', label: 'Métodos de avaliação (chaves)', tipo: 'texto',
        interno: true },
      {
        id: 'usaFluxoDeCaixa',
        label: 'A apuração inclui fluxo de caixa descontado? (condicional)',
        tipo: 'texto',
      },
      condicionalCampo(
        'somentePatrimonioLiquido',
        'Apuração só por patrimônio líquido? (condicional)',
        'usaFluxoDeCaixa',
        (v) => !v.usaFluxoDeCaixa,
      ),
      itemDaListaCampo('usaDuplaAvaliacao', 'A apuração pede dupla avaliação? (condicional)',
        'metodosAvaliacao', 'dupla_avaliacao'),
      { id: 'consolidaComposse', label: 'Consolida composse na avaliação? (condicional)',
        tipo: 'texto' },

      /*
       * A NÃO CONCORRÊNCIA: o interruptor e os quatro detalhes dele.
       *
       * Está em 6 dos 7 acordos. Os quatro só fazem sentido com ele ligado, e é
       * o interruptor que a cláusula consulta: o mecanismo `nao_concorrencia`
       * do cadastro não entra aqui, pela regra escrita acima.
       */
      { id: 'naoConcorrencia', label: 'Tem cláusula de não concorrência? (condicional)',
        tipo: 'texto' },
      { id: 'naoConcorrenciaPrazoAnos', label: 'Prazo da não concorrência, em anos',
        tipo: 'inteiro' },
      numeralCampo('naoConcorrenciaPrazoAnosNumeral', 'Prazo da não concorrência (numeral)',
        'naoConcorrenciaPrazoAnos'),
      cardinalCampo('naoConcorrenciaPrazoAnosExtenso', 'Prazo da não concorrência (por extenso)',
        'naoConcorrenciaPrazoAnos'),
      { id: 'naoConcorrenciaArea', label: 'Área protegida pela não concorrência',
        tipo: 'texto' },
      // Texto, e não valor: no modelo o número anda grudado no índice de
      // correção, "multa meramente punitiva de R$ 1.000.000,00 (um milhão de
      // reais), cujo valor será atualizado pelo ÍNDICE DE ATUALIZAÇÃO".
      { id: 'naoConcorrenciaMulta', label: 'Multa por descumprimento', tipo: 'texto' },
      { id: 'naoConcorrenciaAlcancaParentes',
        label: 'A não concorrência alcança parentes e sócios? (condicional)', tipo: 'texto' },

      /*
       * AS OPÇÕES DE COMPRA E DE VENDA, que são cláusulas inversas.
       *
       * A de compra é o direito de EXIGIR que alguém venda; a de venda é o de
       * exigir que comprem. Costumam valer na morte, na separação e na exclusão.
       */
      { id: 'opcaoCompraPrevista', label: 'Tem opção de compra? (condicional)', tipo: 'texto' },
      { id: 'opcaoCompraQuem', label: 'Quem detém a opção de compra', tipo: 'texto' },
      { id: 'opcaoCompraPreco', label: 'Preço na opção de compra', tipo: 'texto' },
      { id: 'opcaoVendaPrevista', label: 'Tem opção de venda? (condicional)', tipo: 'texto' },
      { id: 'jurosValorSubscrito', label: 'Juros sobre o valor subscrito', tipo: 'texto' },

      /*
       * A SOLUÇÃO DE CONFLITOS, que é uma escolha entre duas redações.
       *
       * Arbitragem está nos 7 acordos e em ZERO dos 8 contratos sociais. A
       * câmara varia de verdade: cinco usam a Câmara de Comércio Brasil Canadá
       * e a Utida usa a Câmara FGV. Quantos árbitros são NÃO é campo: "o número
       * de árbitros será de 03 (três)" em 6 de 6, texto fixo do modelo.
       */
      { id: 'solucaoLitigios', label: 'Solução de litígios (arbitragem/judicial)',
        tipo: 'texto', interno: true },
      condicionalCampo('porArbitragem', 'Conflito vai para arbitragem? (condicional)',
        'solucaoLitigios', (v) => v.solucaoLitigios === 'arbitragem'),
      condicionalCampo('porJudicial', 'Conflito vai para o Judiciário? (condicional)',
        'solucaoLitigios', (v) => v.solucaoLitigios === 'judicial'),
      { id: 'camaraArbitral', label: 'Câmara arbitral', tipo: 'texto' },

      /*
       * QUEM ESCOLHE OS ÁRBITROS, que são sempre três.
       *
       * Duas redações, medidas nos sete acordos. Em 5, incluindo o modelo: "um
       * nomeado pelo reclamante, o outro pela parte reclamada e o terceiro
       * eleito por aqueles dois". Em 2: "nomeados conforme o regulamento da
       * CAM-CCBCC". O número três é texto fixo, 6 de 6 que dizem.
       */
      { id: 'regimeNomeacaoArbitros', label: 'Quem escolhe os árbitros (partes/câmara)',
        tipo: 'texto', interno: true },
      condicionalCampo('arbitrosPelasPartes', 'As partes nomeiam os árbitros? (condicional)',
        'regimeNomeacaoArbitros', (v) => v.regimeNomeacaoArbitros === 'partes'),
      condicionalCampo('arbitrosPelaCamara', 'A câmara nomeia os árbitros? (condicional)',
        'regimeNomeacaoArbitros', (v) => v.regimeNomeacaoArbitros === 'camara'),

      /*
       * O REPRESENTANTE DOS QUOTISTAS, com o tratamento concordado.
       *
       * O modelo escreve "os QUOTISTAS elegem o Sr. LUIZ MARCELO como
       * representante dos QUOTISTAS". O gênero é `interno` pelo mesmo motivo do
       * gênero do órgão: descreve a palavra que vem antes do nome e não é dado a
       * conferir nesta tela, porque a pessoa se corrige no cadastro dela.
       */
      { id: 'representanteNome', label: 'Representante dos quotistas', tipo: 'texto' },
      { id: 'representanteGenero', label: 'Gênero do representante (M/F)', tipo: 'texto',
        interno: true },
      {
        id: 'representanteTratamento',
        label: 'Tratamento do representante (Sr./Sra.)',
        tipo: 'texto',
        derivadoDe: 'representanteGenero',
        derivar: (v) => concordar(v.representanteGenero === 'F' ? 'F' : 'M', 'Sr.', 'Sra.'),
      },
      condicionalCampo('temRepresentante', 'Há representante eleito? (condicional)',
        'representanteNome', (v) => !!(v.representanteNome ?? '').trim()),
      /*
       * O SUBSTITUTO, que a mesma cláusula nomeia logo depois: "na sua falta ou
       * incapacidade civil, a incumbência passará ao Sr. …". Mesma dupla de
       * campos do titular, e pelo mesmo motivo: o tratamento concorda com o
       * gênero da pessoa cadastrada, que texto livre não teria.
       */
      { id: 'substitutoRepresentanteNome', label: 'Substituto do representante', tipo: 'texto' },
      { id: 'substitutoRepresentanteGenero', label: 'Gênero do substituto (M/F)', tipo: 'texto',
        interno: true },
      {
        id: 'substitutoRepresentanteTratamento',
        label: 'Tratamento do substituto (Sr./Sra.)',
        tipo: 'texto',
        derivadoDe: 'substitutoRepresentanteGenero',
        derivar: (v) => concordar(v.substitutoRepresentanteGenero === 'F' ? 'F' : 'M', 'Sr.', 'Sra.'),
      },
      /*
       * O FORO ELEITO, cláusula 26.6, e também a cidade da arbitragem, que é a
       * mesma em 5 dos 5 acordos que trazem as duas. Não deriva da sede: o
       * AgroAliança senta em Sorriso e elege Cuiabá. O estado vai por extenso,
       * como o documento escreve.
       */
      { id: 'foroEleitoComarca', label: 'Foro eleito — cidade', tipo: 'texto' },
      { id: 'foroEleitoEstado', label: 'Foro eleito — estado por extenso', tipo: 'texto' },
    ],
  },
};

export const TIPOS_ENTIDADE = Object.keys(ENTIDADES) as TipoEntidade[];

// --- Campos MANUAIS (preenchidos na tela Gerar, sem cadastro por trás) --------

/**
 * Placeholders de topo (sem binding) que o consultor preenche na hora de gerar:
 * não existe cadastro de "data desta assinatura" nem de testemunha do ato. Eles
 * são declarados aqui, e não bloco a bloco, porque o comportamento do campo
 * vazio (a lacuna assinalável) é decisão do MOTOR para todos de uma vez — o
 * bloco que escreve "{{ foroComarca }}/{{ foroUf }}, {{ dataAssinatura }}."
 * está com a pontuação certa; era o campo que mentia ao resolver ''.
 *
 * Declarar um campo manual novo é acrescentar uma linha aqui. Placeholder livre
 * NÃO declarado continua resolvendo '' como sempre: virar lacuna é opt-in, para
 * um {{ observacao }} opcional não estampar um traço no contrato.
 */
export const CAMPOS_MANUAIS: CampoEntidade[] = [
  { id: 'dataAssinatura', label: 'Data da assinatura', tipo: 'data', manual: true, obrigatorio: true },
  { id: 'testemunha1Nome', label: 'Testemunha 1 — nome', tipo: 'texto', manual: true },
  { id: 'testemunha1Cpf', label: 'Testemunha 1 — CPF', tipo: 'texto', manual: true },
  { id: 'testemunha1Rg', label: 'Testemunha 1 — RG', tipo: 'texto', manual: true },
  { id: 'testemunha2Nome', label: 'Testemunha 2 — nome', tipo: 'texto', manual: true },
  { id: 'testemunha2Cpf', label: 'Testemunha 2 — CPF', tipo: 'texto', manual: true },
  { id: 'testemunha2Rg', label: 'Testemunha 2 — RG', tipo: 'texto', manual: true },
  { id: 'advogadoNome', label: 'Advogado — nome', tipo: 'texto', manual: true },
  { id: 'advogadoOabNumero', label: 'Advogado — nº da OAB', tipo: 'texto', manual: true },
  { id: 'advogadoOabUf', label: 'Advogado — UF da OAB', tipo: 'texto', manual: true },
];

const CAMPOS_MANUAIS_POR_ID = new Map(CAMPOS_MANUAIS.map((c) => [c.id, c]));

/** O campo manual de um placeholder de topo, se declarado. */
export function campoManual(id: string): CampoEntidade | undefined {
  return CAMPOS_MANUAIS_POR_ID.get(id);
}

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
