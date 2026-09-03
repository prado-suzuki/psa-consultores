/**
 * Mapeadores dos instrumentos agrários: cadastro de exploração rural → motor.
 *
 * Mesmo papel que `capital.ts`, `signatarios.ts` e `cartorio.ts` têm no Contrato
 * Social — um arquivo por domínio, com os mapeadores que `mapeadores.ts` despacha.
 * Não fala com o Supabase e não desenha.
 *
 * ── ONDE CADA COISA MORA ────────────────────────────────────────────────────
 *
 * Este arquivo NÃO monta contexto: quem monta é `montarContexto`, como para
 * qualquer outro documento. Aqui existem duas funções, e elas entram nos dois
 * despachantes que já existem:
 *
 *   · `mapearInstrumentoRural`  → `mapearRegistro('instrumento', row)`
 *   · `listasDoInstrumentoRural` → `itensPorLista` da tela Gerar
 *
 * Extenso, concordância e condicional NÃO são calculados aqui: são campos
 * DERIVADOS declarados em `ENTIDADES.instrumento` (vocabulario.ts), e
 * `derivarCampos` os recalcula. É o que faz o "Ajustar dados manualmente" da tela
 * Gerar oferecer o campo-base certo — trocar 30 por 40 reescreve "quarenta por
 * cento" sozinho, em vez de o número e a frase discordarem no mesmo contrato.
 *
 * ── O QUE ELE REUSA, E POR QUE ISSO IMPORTA ─────────────────────────────────
 *
 * Pessoa e matrícula não ganham mapeador novo: `mapearPessoa` já produz a
 * `qualificacao` inteira do preâmbulo (ramificando PF/PJ, com concordância de
 * gênero) e `mapearMatricula` já produz área, município, cartório e denominação.
 * O contrato rural qualifica as mesmas pessoas e descreve os mesmos imóveis que o
 * Contrato Social — inclusive o outorgante da ORIGEM da posse, que por isso é uma
 * `pessoa` e não um punhado de colunas de texto.
 *
 * A linha de assinatura sai de `itemSignatario`/`papelDeQualidades`
 * (signatarios.ts), a mesma fábrica do fecho societário: uma segunda faria
 * {{ signatario.eTestemunha }} resolver num documento e sumir no outro.
 *
 * O que é genuinamente novo são três coisas: os campos do INSTRUMENTO, os campos
 * da RELAÇÃO (a fração do compossuidor, a área cedida do imóvel — que não são da
 * pessoa nem da matrícula, são do vínculo) e a ORIGEM DA POSSE.
 */
import { generoDeConcordancia, type Genero } from './concordancia';
import {
  areaExtenso, formatarArea, formatarValor, letraAlinea, numeralContrato, percentualExtenso,
  romano, valorExtenso,
} from './extenso';
import {
  coletor,
  formatarDataBR,
  mapearGeorefCabecalho,
  mapearMatricula,
  mapearPessoa,
  mapearVertice,
  publicarOpcionais,
  type Campos,
  type ItemLista,
  type MatriculaParaMapear,
} from './mapeadores';
import {
  itemSignatario,
  itemTestemunha,
  papelDeQualidades,
  representadaPorAdministrador,
  type QualidadeSignatario,
  type SignatarioAvulso,
} from './signatarios';
import { derivarCampos } from './vocabulario';

/** Pessoa do cadastro, na forma mínima que o mapeador de pessoa precisa. */
type PessoaLike = Parameters<typeof mapearPessoa>[0];

/**
 * O georref de uma matrícula, na forma mínima que os dois mapeadores consomem.
 *
 * Estrutural de propósito: derivado dos próprios mapeadores em vez de importado
 * do hook que faz a busca — `lib/templates` não conhece a camada de dados, e é o
 * controller que entrega o resultado já buscado.
 */
type GeorefDaMatricula = {
  cabecalho?: Parameters<typeof mapearGeorefCabecalho>[0];
  vertices?: Parameters<typeof mapearVertice>[0][];
};

export interface ParteRural {
  pessoa: PessoaLike;
  papel: 'explorador' | 'compossuidor' | 'administrador_nomeado';
  /** Só compossuidor. */
  fracao?: number | null;
  ordem: number;
}

export interface ImovelRural {
  matricula: MatriculaParaMapear;
  /** Área cedida NESTE instrumento — não é a área da matrícula. */
  areaExplorada: number | null;
  areaUnidade: string;
  ordem: number;
  origemTipo?: string | null;
  /** Chave que agrupa imóveis de mesma origem no Considerando V. */
  origemChave?: string | null;
}

/**
 * O instrumento anterior de onde vem a posse (Considerando V).
 *
 * O outorgante é uma PESSOA, não campos de texto: é ele que o contrato qualifica
 * por extenso, e guardar nome/CNPJ/NIRE aqui criaria a mesma empresa duas vezes,
 * com a redação divergindo entre o preâmbulo e o Considerando V.
 */
export interface OrigemPosseRural {
  chave: string;
  tituloInstrumento?: string | null;
  dataAssinatura?: string | null;
  outorgante?: PessoaLike | null;
  /**
   * Quem administra a pessoa jurídica outorgante DAQUELA origem.
   *
   * Existe pelo mesmo motivo que `EntradaInstrumentoRural.outorganteAdministradores`:
   * o Considerando V qualifica a outorgante da origem por inteiro, administradores
   * incluídos, e essa qualificação não é derivável da linha da empresa.
   */
  outorganteAdministradores?: PessoaLike[];
  /**
   * Quem assinou PELA pessoa jurídica naquele ato, como TEXTO — só para origem
   * externa, onde a contraparte não está no cadastro e não há pessoa a qualificar.
   * Origem interna preenche `outorganteAdministradores` e ignora este campo.
   */
  outorganteRepresentante?: string | null;
  /** Retrato na data daquele contrato; `pessoa` não guarda histórico de capital. */
  capitalSocialNaAssinatura?: number | null;
}

/** A linha de `exploracao_rural`, na forma que o mapeador consome. */
export interface InstrumentoRural {
  tipoExploracao: string;
  dataAssinatura: string | null;
  dataEncerramento: string | null;
  dataInicioVigencia: string | null;
  vigenciaProrrogavel: boolean;
  percentualOutorgante: number | null;
  percentualExplorador: number | null;
  culturas: string | null;
  incluiPecuaria: boolean;
  /**
   * Quais modalidades de pecuária a parceria explora: `recria_engorda`, `cria`,
   * `ciclo_completo` — em qualquer combinação, inclusive as três.
   *
   * É outra pergunta que `incluiPecuaria`. Aquele diz SE há gado e troca AGRÍCOLA
   * por AGROPECUÁRIA; esta diz O QUE SE MEDE na partilha da Cláusula Quinta, e a
   * resposta muda a definição de "fruto" — ganho de peso, bezerros nascidos ou
   * peso apurado a cada 12 meses.
   */
  pecuariaModalidades: string[];
  permitePenhor: boolean;
  prazoIndivisaoQuantidade: number | null;
  prazoIndivisaoUnidade: string | null;
  indivisaoProrrogavel: boolean | null;
  indivisaoAvisoQuantidade: number | null;
  indivisaoAvisoUnidade: string | null;
  regraAdministracao: string | null;
  liquidacaoPeriodicidade: string | null;
  liquidacaoNumeroParcelas: number | null;
}

export interface EntradaInstrumentoRural {
  instrumento: InstrumentoRural;
  /** Só na parceria — a composse não tem outorgante. */
  outorgante?: PessoaLike | null;
  /**
   * Quem administra a pessoa jurídica outorgante, e por que não sai de `pessoa`.
   *
   * O preâmbulo assinado qualifica os administradores POR INTEIRO dentro da
   * qualificação da empresa ("neste ato representado por seus administradores
   * José Eduardo…, brasileiro, nascido em…, filho de…; e Maria Auxiliadora…"), e
   * o fecho dá a cada um a sua linha de assinatura. Nenhuma das duas coisas é
   * derivável da linha da empresa: quem administra está em `administracao`.
   */
  outorganteAdministradores?: PessoaLike[];
  /**
   * Capital social da outorgante NA DATA deste instrumento.
   *
   * Retrato, como o `capitalSocialNaAssinatura` da origem da posse: `pessoa` não
   * guarda histórico de capital, e o preâmbulo declara o valor vigente ao assinar.
   */
  outorganteCapitalSocial?: number | null;
  partes: ParteRural[];
  imoveis: ImovelRural[];
  origens?: OrigemPosseRural[];
  /**
   * Testemunhas digitadas na tela Gerar.
   *
   * Existe porque a lista `signatarios` do instrumento agrário SUBSTITUI a do
   * quadro societário (ver `itensPorLista`): sem repassá-las aqui, quem tivesse
   * digitado uma testemunha a veria desaparecer do fecho sem aviso. Os contratos
   * assinados do MMS trazem as duas linhas em branco, e nesse caso o bloco fixo
   * do fecho é que responde por elas.
   */
  testemunhas?: SignatarioAvulso[];
  /**
   * Campos do ATO de gerar, sem cadastro por trás.
   *
   * Foro e número de vias são declarados `manual: true` no vocabulário: vazios,
   * viram lacuna assinalável em vez de sumir. Os outros dois têm padrão calculado
   * aqui e o consultor corrige no "Ajustar dados manualmente" — o nome da composse
   * e o vencimento da primeira parcela variam entre contratos reais sem regra
   * derivável (ver `nomeDaComposse` e o comentário de `liquidacaoPrimeiroVencimento`
   * no vocabulário).
   */
  manuais?: {
    foroComarca?: string;
    foroUf?: string;
    numeroVias?: number;
    nomeComposse?: string;
    liquidacaoPrimeiroVencimento?: string;
    /** "IMEA – Instituto Mato-Grossense de Economia e Agropecuária" — ver o campo no vocabulário. */
    institutoPreco?: string;
  };
}

/**
 * `'sim'` / `''` em vez de boolean.
 *
 * O motor trata seção `{{#campo}}` como ativa quando o valor é "truthy" na forma
 * de texto; string vazia desliga. Publicar `false` funcionaria por acaso, mas
 * `'sim'` é o que o resto do vocabulário já usa e aparece legível na prévia.
 */
const flag = (ligado: boolean | null | undefined): string => (ligado ? 'sim' : '');

const texto = (v: string | null | undefined): string => v ?? '';

/**
 * Agrupa os imóveis por origem, do jeito que o Considerando V escreve.
 *
 * O contrato não lista quinze origens para quinze imóveis: ele diz *"Itens 'a' ao
 * 'f' advêm do Instrumento X"*. Quem agrupa é esta função, e ela precisa produzir
 * a MESMA sequência de letras que o Anexo Único imprime — por isso o agrupamento
 * usa a alínea calculada pela ordem, não a posição dentro do grupo.
 *
 * Faixa contígua vira "a" ao "f"; salteada vira "k" e "m". Escrever "ao" numa
 * faixa que tem buraco no meio afirmaria que o imóvel "l" veio daquela origem.
 */
export function descreverItens(alineas: string[]): string {
  if (alineas.length === 0) return '';
  // Aspas CURVAS, como o assinado imprime ("Itens “a” ao “f”"). Os cinco
  // documentos da casa usam “…” 46 vezes e a aspa reta nenhuma.
  const cita = (letra: string) => `“${letra}”`;
  if (alineas.length === 1) return `Item ${cita(alineas[0])}`;
  const contigua = alineas.every((letra, i) => {
    if (i === 0) return true;
    return letra.length === 1 && alineas[i - 1].length === 1
      && letra.charCodeAt(0) === alineas[i - 1].charCodeAt(0) + 1;
  });
  if (contigua) return `Itens ${cita(alineas[0])} ao ${cita(alineas[alineas.length - 1])}`;
  const citadas = alineas.map(cita);
  return `Itens ${citadas.slice(0, -1).join(', ')} e ${citadas[citadas.length - 1]}`;
}

/**
 * Como o Considerando V nomeia o tipo do instrumento de origem, já com a
 * preposição CONTRAÍDA com o artigo.
 *
 * O assinado escreve *"advém DO INSTRUMENTO PARTICULAR DE PARCERIA PARA FINS DE
 * EXPLORAÇÃO AGROPECUÁRIA"* — com artigo e com o título INTEIRO. A versão curta
 * daqui ("de INSTRUMENTO PARTICULAR DE PARCERIA") citava um documento que não
 * existe com aquele nome: quem for conferir a cadeia de posse procura pelo título
 * completo, que é o que está na capa do instrumento anterior.
 */
const TIPO_ORIGEM_POR_EXTENSO: Record<string, string> = {
  parceria: 'do INSTRUMENTO PARTICULAR DE PARCERIA PARA FINS DE EXPLORAÇÃO AGROPECUÁRIA',
  arrendamento: 'do CONTRATO DE ARRENDAMENTO RURAL',
  propria: 'da exploração própria dos COMPOSSUIDORES',
  heranca: 'de sucessão hereditária',
  outro: 'de instrumento particular',
};

/**
 * Nome pelo qual a composse gira: primeiro compossuidor em caixa alta, mais um
 * complemento. Por isso a ORDEM das partes é dado, não enfeite.
 *
 * ⚠️ O COMPLEMENTO NÃO É DERIVÁVEL. Três contratos reais, duas convenções:
 *
 *   · 3+ compossuidores  → "SÉRGIO PITT E OUTROS", "DILCEU ROSSATO E OUTROS"
 *   · casal (2 cônjuges) → "JOSE EDUARDO DE MACEDO SOARES JUNIOR E ESPOSA"
 *
 * "E ESPOSA" depende de os dois serem casados ENTRE SI — fato de `pessoa` e
 * `parentesco`, não da composse — e nem toda dupla de compossuidores é um casal.
 * Contar dois e escrever "E ESPOSA" acertaria um caso e erraria dois irmãos.
 *
 * Então: a função devolve o padrão "E OUTROS", e quem sabe o caso concreto corrige
 * no "Ajustar dados manualmente" (o campo `nomeComposse` do instrumento não é
 * derivado, justamente para poder ser editado).
 */
export function nomeDaComposse(partes: ParteRural[], override?: string | null): string {
  if (override?.trim()) return override.trim();
  const primeiro = partes
    .filter((p) => p.papel === 'compossuidor')
    .sort((a, b) => a.ordem - b.ordem)[0];
  if (!primeiro) return '';
  const nome = (primeiro.pessoa as { denominacao?: string | null }).denominacao ?? '';
  return nome ? `${nome.toUpperCase()} E OUTROS` : '';
}

/** As partes de um papel, na ordem declarada. */
const doPapel = (partes: ParteRural[], papel: ParteRural['papel']) =>
  partes.filter((p) => p.papel === papel).sort((a, b) => a.ordem - b.ordem);

/** "A; B; e C" — a enumeração como o preâmbulo separa as qualificações. */
const juntarComE = (partes: string[]): string =>
  partes.length <= 1 ? (partes[0] ?? '') : `${partes.slice(0, -1).join('; ')}; e ${partes[partes.length - 1]}`;

/**
 * A qualificação da pessoa jurídica outorgante como o preâmbulo a escreve: a
 * frase de `mapearPessoa`, mais o capital social vigente na assinatura, mais os
 * administradores qualificados POR INTEIRO.
 *
 * É campo do INSTRUMENTO, e não mescla no binding `{{ outorgante }}`, pelo mesmo
 * motivo que o capital da origem da posse é campo da relação: os dois dados que
 * faltavam — o capital NAQUELA data e quem assinava por ela — são fatos do
 * instrumento, não colunas de `pessoa`. O escritor da frase continua sendo um só
 * (`montarQualificacao`, alcançado por `derivarCampos`); o que muda é o endereço.
 *
 * Os administradores saem no estilo `filiacao` porque é o que os assinados usam
 * para eles — "nascido em 23/05/1.957, filho de …" —, enquanto os outorgados da
 * mesma parceria saem com naturalidade. Ver `montarQualificacao`.
 */
function extrasDaOutorgante(
  capitalSocial: number | null | undefined,
  administradores: PessoaLike[],
  representantePronto?: string | null,
): Campos {
  const extras: Campos = {};
  if (capitalSocial != null) {
    extras.capitalSocial = formatarValor(capitalSocial);
    extras.capitalSocialExtenso = valorExtenso(capitalSocial);
  }

  const qualificados = administradores
    .map((p) => derivarCampos('pessoa', {
      ...mapearPessoa(p),
      estiloQualificacao: 'filiacao',
      // Title Case, e não caixa alta: dentro da qualificação da outorgante o
      // administrador não é parte do instrumento. É o que o assinado faz —
      // "MMS AGRO LTDA, … representado por seus administradores José Eduardo de
      // Macedo Soares Júnior, brasileiro, …" — e a caixa alta ali roubava o
      // destaque de quem de fato contrata.
      estiloNome: 'natural',
    }).qualificacao)
    .filter(Boolean);

  // A lista entra pela MESMA porta que o representante da sócia PJ do quadro
  // societário, e por isso herda a contração da preposição ("representada POR
  // seus administradores…") sem uma segunda regra.
  if (qualificados.length) {
    const tratamento = qualificados.length === 1 ? 'seu administrador' : 'seus administradores';
    extras.representante = `${tratamento} ${juntarComE(qualificados)}`;
  } else if (representantePronto) {
    // Origem EXTERNA: quem assinou pela contraparte é texto digitado, não pessoa
    // do cadastro — não há o que qualificar por inteiro.
    extras.representante = representantePronto;
  }

  return extras;
}

function qualificacaoDoOutorgante(entrada: EntradaInstrumentoRural): string {
  if (!entrada.outorgante) return '';
  return derivarCampos('pessoa', {
    ...mapearPessoa(entrada.outorgante),
    ...extrasDaOutorgante(entrada.outorganteCapitalSocial, entrada.outorganteAdministradores ?? []),
  }).qualificacao ?? '';
}

/**
 * Os imóveis na ordem, cada um com a sua alínea.
 *
 * Calculada UMA vez e usada pelo Anexo e pelo Considerando V. Se cada um
 * calculasse a sua, uma reordenação faria os dois discordarem sobre qual imóvel é
 * o "c" — e o contrato passaria a citar o imóvel errado.
 */
function comAlinea(imoveis: ImovelRural[]) {
  return [...imoveis]
    .sort((a, b) => a.ordem - b.ordem)
    .map((imovel, indice) => ({ imovel, alinea: letraAlinea(indice + 1) }));
}

/** Agrupa as alíneas por origem, preservando a ordem de aparição. */
function alineasPorOrigem(imoveis: ReturnType<typeof comAlinea>) {
  const mapa = new Map<string, string[]>();
  for (const { imovel, alinea } of imoveis) {
    const chave = imovel.origemChave ?? (imovel.origemTipo ? `tipo:${imovel.origemTipo}` : null);
    if (!chave) continue;
    mapa.set(chave, [...(mapa.get(chave) ?? []), alinea]);
  }
  return mapa;
}

/**
 * Os campos de `{{ instrumento.* }}`.
 *
 * Publica só os campos-BASE; extensos, condicionais derivadas e prosa saem de
 * `derivarCampos('instrumento', …)`, que lê a declaração do vocabulário. O que
 * fica aqui é o que depende das LISTAS (a faixa de alíneas, o dono e o cartório
 * comuns, quantos administradores foram nomeados) — nenhuma delas visível de
 * dentro de um campo derivado.
 */
export function mapearInstrumentoRural(entrada: EntradaInstrumentoRural): Campos {
  const { instrumento: inst, partes, imoveis, manuais = {} } = entrada;
  const { out, set } = coletor();

  const nomeados = doPapel(partes, 'administrador_nomeado');
  const ordenados = comAlinea(imoveis);
  const alineas = ordenados.map((c) => c.alinea);
  const primeiraMatricula = ordenados[0]
    ? (mapearMatricula(ordenados[0].imovel.matricula) as Record<string, string>)
    : null;

  set('tipoExploracao', inst.tipoExploracao);
  set('dataAssinatura', formatarDataBR(inst.dataAssinatura));
  set('dataInicioVigencia', formatarDataBR(inst.dataInicioVigencia));
  set('dataEncerramento', formatarDataBR(inst.dataEncerramento));
  set('prorrogavel', flag(inst.vigenciaProrrogavel));
  set('pecuaria', flag(inst.incluiPecuaria));
  // Uma condicional por modalidade. `incluiPecuaria` entra na conta porque
  // desligar o gado tem de calar os três parágrafos, mesmo que a coluna guarde
  // uma escolha antiga — o contrato não pode medir o que não explora.
  const modalidade = (nome: string) =>
    flag(inst.incluiPecuaria && inst.pecuariaModalidades.includes(nome));
  set('pecuariaRecriaEngorda', modalidade('recria_engorda'));
  set('pecuariaCria', modalidade('cria'));
  set('pecuariaCicloCompleto', modalidade('ciclo_completo'));
  set('culturas', inst.culturas);
  set('penhor', flag(inst.permitePenhor));

  if (inst.percentualOutorgante != null) set('percentualOutorgante', `${inst.percentualOutorgante}%`);
  if (inst.percentualExplorador != null) set('percentualExplorador', `${inst.percentualExplorador}%`);

  // Numeral de duas casas, como o contrato escreve — "pelo prazo de 03 (três)
  // anos", e não "3 (três)". Ver `numeralContrato`: 59 ocorrências com o zero à
  // esquerda nos assinados, nenhuma sem.
  set('prazoIndivisaoQuantidade', numeralContrato(inst.prazoIndivisaoQuantidade));
  set('prazoIndivisaoUnidade', inst.prazoIndivisaoUnidade);
  set('indivisaoProrrogavel', flag(inst.indivisaoProrrogavel));
  set('indivisaoAvisoQuantidade', numeralContrato(inst.indivisaoAvisoQuantidade));
  set('indivisaoAvisoUnidade', inst.indivisaoAvisoUnidade);

  set('regraAdministracao', inst.regraAdministracao);
  // Isoladamente vs. em conjunto NÃO é campo do cadastro: deriva de QUANTOS
  // nomeados existem, e a contagem é da lista, não do cabeçalho.
  set('nomeadoUnico', flag(nomeados.length === 1));
  set('nomeadosEmConjunto', flag(nomeados.length >= 2));

  set('liquidacaoParcelas', numeralContrato(inst.liquidacaoNumeroParcelas));
  set('liquidacaoPeriodicidade', inst.liquidacaoPeriodicidade);
  // Padrão editável, não derivação: dois contratos reais com parcelas ANUAIS
  // discordam do vencimento da primeira (um usa "1 (um) ano do evento", o outro
  // "30 (trinta) dias"). Ver o comentário do campo no vocabulário.
  set('liquidacaoPrimeiroVencimento', manuais.liquidacaoPrimeiroVencimento ?? '30 (trinta) dias após o evento');

  set('nomeComposse', nomeDaComposse(partes, manuais.nomeComposse));
  set('primeiraAlinea', alineas[0]);
  set('ultimaAlinea', alineas[alineas.length - 1]);

  // "advém DO SEGUINTE INSTRUMENTO" / "DOS SEGUINTES INSTRUMENTOS": o Considerando
  // V abre a lista de origens, e o assinado do MMS está no singular porque a
  // posse dos seis imóveis vem de UM contrato. Fixar o plural no bloco fazia o
  // contrato anunciar instrumentos que não existem — e o número não é do
  // cadastro, é de quantos GRUPOS de origem os imóveis formam.
  const quantasOrigens = alineasPorOrigem(ordenados).size;
  set('origemUnica', flag(quantasOrigens === 1));
  set('origensVarias', flag(quantasOrigens >= 2));

  // Numa PARCERIA todos os imóveis são do mesmo dono e do mesmo cartório, e o
  // contrato fecha a Cláusula Primeira com uma frase só. Os dois valores saem da
  // primeira matrícula pelo MESMO mapeador que preenche as colunas do Anexo —
  // inclusive o nome da serventia, que é o que distingue um ofício do outro.
  set('proprietarioComum', primeiraMatricula?.proprietario);
  set('cartorioComum', primeiraMatricula?.cartorio);
  set('cartorioComumComarca', primeiraMatricula?.cartorioComarca);

  // A qualificação INTEIRA da outorgante — com capital social e administradores.
  // Um campo só: o capital e os representantes são partes daquela frase, e
  // publicá-los à parte convidaria o bloco a montar a frase uma segunda vez.
  set('outorganteQualificacao', qualificacaoDoOutorgante(entrada));
  set('institutoPreco', manuais.institutoPreco);

  // Foro entra SEM passar pelo `set`, que descarta vazio. Campo declarado
  // `obrigatorio` não é preenchido por `publicarOpcionais` (a obrigatoriedade
  // existe para o mapeador responder por ele), e ausente o render LANÇA em vez de
  // deixar a lacuna. Publicando '' o motor faz as duas coisas certas: substitui
  // pelo traço assinalável e marca o documento como incompleto na tela Gerar.
  out.foroComarca = manuais.foroComarca ?? '';
  out.foroUf = manuais.foroUf ?? '';
  set('numeroVias', numeralContrato(manuais.numeroVias));

  return derivarCampos('instrumento', publicarOpcionais('instrumento', out));
}

/** Item de lista de pessoa, com as condicionais PF/PJ que o vocabulário espera. */
function itemPessoa(chave: string, campos: Campos, tipoPessoa: string | undefined): ItemLista {
  return {
    [chave]: campos,
    // O engine não tem "else": cada ramo da qualificação tem a sua condicional.
    sePF: tipoPessoa === 'PF',
    sePJ: tipoPessoa === 'PJ',
  };
}

/**
 * A linha de assinatura de uma parte, pela fábrica única do fecho.
 *
 * `complemento` é o texto CURTO sob o papel, e por padrão é vazio: a
 * qualificação completa da parte já está no preâmbulo, e repeti-la embaixo da
 * régua imprimiria o parágrafo inteiro outra vez. A exceção é a pessoa jurídica,
 * que precisa dizer por quem assina.
 */
function signatarioDa(
  pessoa: PessoaLike,
  qualidade: QualidadeSignatario,
  complemento = '',
): Campos | null {
  const campos = mapearPessoa(pessoa);
  if (!campos.nome) return null;
  const genero = generoDeConcordancia((campos.genero || null) as Genero, campos.tipoPessoa);
  return itemSignatario({
    nome: campos.nome,
    nomeMaiusculo: campos.nomeMaiusculo ?? '',
    papel: papelDeQualidades(new Set([qualidade]), genero),
    cpfCnpj: campos.cpfCnpj ?? '',
    qualificacao: complemento,
    eOutorgante: qualidade === 'outorgante',
    eOutorgado: qualidade === 'outorgado',
    eCompossuidor: qualidade === 'compossuidor',
  });
}

/**
 * Os complementos "representada por seu Administrador X", um por administrador
 * da outorgante — e é o que faz a pessoa jurídica ganhar UMA LINHA POR
 * ADMINISTRADOR no fecho.
 *
 * Não é enfeite: a parceria do MMS tem quatro linhas de assinatura (a MMS Agro
 * duas vezes, uma por administrador) e a do Bela Vista tem seis (três
 * administradores). Uma linha só para a empresa deixaria de fora a assinatura
 * de quem de fato assinou.
 *
 * Sem administrador cadastrado devolve `['']`: a empresa assina numa linha, sem
 * complemento — que é o comportamento que existia antes de os administradores
 * entrarem no cadastro.
 */
function complementosDaOutorgante(administradores: PessoaLike[]): string[] {
  const complementos = administradores.flatMap((p) => {
    const campos = mapearPessoa(p);
    if (!campos.nome) return [];
    const genero = generoDeConcordancia((campos.genero || null) as Genero, campos.tipoPessoa);
    return [representadaPorAdministrador(campos.nome, genero)];
  });
  return complementos.length ? complementos : [''];
}

/**
 * As listas do instrumento agrário, prontas para `itensPorLista`.
 *
 * `signatarios` entra aqui porque, num contrato rural, quem assina são as PARTES
 * do instrumento — não o quadro societário que `mapearSignatarios` percorre.
 *
 * ⚠️ Nomear administrador da COMPOSSE não cria linha de assinatura: quem foi
 * nomeado já assina como compossuidor, a nomeação é dita na cláusula de
 * administração, e os contratos assinados trazem uma linha por parte.
 *
 * Já a pessoa jurídica OUTORGANTE ganha uma linha por administrador dela — ver
 * `complementosDaOutorgante`. São coisas diferentes: nomear administrador de uma
 * composse é ato deste instrumento; administrar a outorgante é fato anterior a
 * ele, e é quem de fato põe a assinatura no papel.
 */
export function listasDoInstrumentoRural(
  entrada: EntradaInstrumentoRural,
  /**
   * Georref por id de matrícula, para os *Elementos do Perímetro* da alínea do
   * Anexo. Chega por parâmetro, e não dentro da `entrada`, porque não vem do
   * cadastro de exploração rural: vem do SIGEF pelo BigQuery, e quem o busca é o
   * controller — é o mesmo caminho pelo qual `imoveisSelecionados` e `memoriais`
   * recebem o seu. Ausente, a seção `{{#vertices}}` fica vazia e o trecho é
   * descartado, que é como o resto do motor trata dado que não existe.
   */
  georefPorMatricula: Record<string, GeorefDaMatricula | undefined> = {},
): Record<string, ItemLista[]> {
  const { partes, imoveis, origens = [], outorgante } = entrada;
  const ordenados = comAlinea(imoveis);

  const listaDePessoas = (papel: ParteRural['papel'], chave: string, extras: (p: ParteRural, i: number) => Campos) =>
    doPapel(partes, papel).map((p, i) =>
      itemPessoa(
        chave,
        // Re-deriva depois de mesclar os extras da relação, como o quadro
        // societário faz com o representante da sócia PJ.
        derivarCampos('pessoa', { ...mapearPessoa(p.pessoa), ...extras(p, i) }),
        (p.pessoa as { tipo_pessoa?: string }).tipo_pessoa,
      ),
    );

  const ordinais = (i: number) => ({ ordem: String(i + 1), ordemRomana: romano(i + 1).toLowerCase() });

  const assinaturas: ItemLista[] = [];
  if (outorgante) {
    for (const complemento of complementosDaOutorgante(entrada.outorganteAdministradores ?? [])) {
      const linha = signatarioDa(outorgante, 'outorgante', complemento);
      if (linha) assinaturas.push({ signatario: linha });
    }
  }
  for (const p of doPapel(partes, 'explorador')) {
    const linha = signatarioDa(p.pessoa, 'outorgado');
    if (linha) assinaturas.push({ signatario: linha });
  }
  for (const p of doPapel(partes, 'compossuidor')) {
    const linha = signatarioDa(p.pessoa, 'compossuidor');
    if (linha) assinaturas.push({ signatario: linha });
  }
  // Testemunhas por último, como no fecho societário. Só as digitadas: os
  // contratos assinados do MMS deixam as duas linhas em branco, e nesse caso quem
  // responde por elas é o bloco fixo do fecho, não esta lista.
  for (const t of entrada.testemunhas ?? []) {
    if (t.nome) assinaturas.push({ signatario: itemTestemunha(t) });
  }

  return {
    // O ESTILO da qualificação é do PAPEL, e os assinados são explícitos: os
    // parceiros outorgados saem com "natural de São Paulo/SP nascido em
    // 23/05/1.957"; os compossuidores, com "nascido em 23/05/1.957, filho de X e
    // Y". Nenhum dos dois traz os dois fragmentos, e é `montarQualificacao` que
    // escolhe — aqui só se diz qual estilo aquele papel usa.
    exploradores: listaDePessoas('explorador', 'explorador', (_p, i) => ({
      ...ordinais(i),
      estiloQualificacao: 'naturalidade',
    })),
    compossuidores: listaDePessoas('compossuidor', 'compossuidor', (p, i) => ({
      ...ordinais(i),
      estiloQualificacao: 'filiacao',
      // A fração é campo da RELAÇÃO, não da pessoa: a mesma pessoa tem frações
      // diferentes em composses diferentes. O extenso é a forma CARTORIAL
      // ("cinquenta inteiros por cento"), a mesma do Contrato Social — é o que o
      // contrato de parceria assinado usa.
      ...(p.fracao != null
        ? { fracao: `${p.fracao}%`, fracaoExtenso: percentualExtenso(p.fracao) }
        : {}),
    })),
    administradoresNomeados: listaDePessoas('administrador_nomeado', 'adminNomeado', () => ({})),

    imoveisDoAnexo: ordenados.map(({ imovel, alinea }) => {
      const georef = georefPorMatricula[imovel.matricula.id];
      return {
        imovel: {
          ...mapearMatricula(imovel.matricula),
          // Área, perímetro e certificação do SIGEF, pelo mesmo mapeador que o
          // memorial usa — a alínea do Anexo cita o perímetro junto da área.
          ...mapearGeorefCabecalho(georef?.cabecalho),
          alinea,
          areaCedida:
            imovel.areaExplorada != null
              ? formatarArea(imovel.areaExplorada, imovel.areaUnidade as Parameters<typeof areaExtenso>[1])
              : '',
          areaCedidaExtenso:
            imovel.areaExplorada != null
              ? areaExtenso(imovel.areaExplorada, imovel.areaUnidade as Parameters<typeof areaExtenso>[1])
              : '',
        },
        // Os *Elementos do Perímetro* da alínea. Mesma coleção do memorial SIGEF,
        // mesmo mapeador de vértice: o Anexo do Bela Vista a imprime em tabela e o
        // do MMS em prosa, e a diferença é do bloco, não do dado.
        vertices: (georef?.vertices ?? []).map(mapearVertice),
      };
    }),

    origensDaPosse: [...alineasPorOrigem(ordenados).entries()].map(([chave, alineas], indice) => {
      const origem = origens.find((o) => o.chave === chave);
      const doImovel = ordenados.find((c) => c.imovel.origemChave === chave)?.imovel.origemTipo;
      const tipo = doImovel ?? (chave.startsWith('tipo:') ? chave.slice(5) : 'outro');

      const { out, set } = coletor();
      set('letra', letraAlinea(indice + 1));
      set('itens', descreverItens(alineas));
      // "Item 'g' ADVÉM" / "Itens 'a' ao 'f' ADVÊM": o sujeito da frase é a
      // lista, e ela tem número variável. O bloco não pode fixar o verbo.
      set('advir', alineas.length === 1 ? 'advém' : 'advêm');
      set('tipo', tipo);
      set('tipoPorExtenso', TIPO_ORIGEM_POR_EXTENSO[tipo] ?? TIPO_ORIGEM_POR_EXTENSO.outro);
      // O motor não tem `else`: as duas condicionais são publicadas em separado.
      set('propria', flag(tipo === 'propria'));
      set('deTerceiro', flag(tipo !== 'propria'));
      set('tituloInstrumento', origem?.tituloInstrumento);
      set('dataAssinatura', formatarDataBR(origem?.dataAssinatura ?? null));
      set('capitalSocialNaAssinatura', origem?.capitalSocialNaAssinatura);

      const tipoPessoaOutorgante = (origem?.outorgante as { tipo_pessoa?: string } | null | undefined)
        ?.tipo_pessoa;

      return {
        origemPosse: derivarCampos('origemPosse', publicarOpcionais('origemPosse', out)),
        // A qualificação do outorgante da ORIGEM é montada pela MESMA função que
        // monta a do outorgante deste instrumento — com capital social e com os
        // administradores qualificados por inteiro.
        //
        // Antes ela só mesclava `representante` (texto), e o resultado era um
        // parágrafo de 95 palavras onde o assinado tem 268: o Considerando V do
        // composse do MMS qualifica a MMS Agro com o capital de R$ 872.674,00 e
        // com os dois administradores inteiros, porque é a cadeia de posse que
        // ele está provando. Sem isso o contrato afirma vir de um instrumento
        // cuja outorgante ele descreve pela metade.
        outorgante: origem?.outorgante
          ? derivarCampos('pessoa', {
              ...mapearPessoa(origem.outorgante),
              ...extrasDaOutorgante(
                origem.capitalSocialNaAssinatura,
                origem.outorganteAdministradores ?? [],
                origem.outorganteRepresentante,
              ),
            })
          : {},
        // O assinado diz "como Parceira Outorgante *a empresa* MMS AGRO LTDA".
        // As duas condicionais existem porque o outorgante da origem pode ser
        // pessoa física — e "a empresa João da Silva" seria uma afirmação falsa
        // sobre a contraparte, não um deslize de redação.
        sePJ: tipoPessoaOutorgante === 'PJ',
        sePF: tipoPessoaOutorgante === 'PF',
      };
    }),

    signatarios: assinaturas,
  };
}
