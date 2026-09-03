import { concordar, contrairPor, generoDeConcordancia, PARES, type Genero } from './concordancia';
import { mapearPessoa, type AdministradorParaMapear, type ItemLista, type SocioParaMapear } from './mapeadores';
import { comOrigem } from './origem';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';

// Quem assina o instrumento, como LISTA com papel — não como sufixo do rótulo
// de outra pessoa.
//
// Antes disso o fecho iterava {{#socios}} e a outorga conjugal era um sufixo
// ("JOSE EDUARDO … Sócio administrador e Outorga Conjugal"): quem outorga é o
// CÔNJUGE, e o cônjuge não tinha onde assinar (B12); administrador não sócio
// era qualificado na cláusula de administração e não recebia linha nenhuma
// (B13). Uma lista só resolve os dois, e serve a qualquer instrumento futuro
// (doação com anuência, procuração) sem um segundo laço no bloco.

type Campos = Record<string, string>;

/** Signatário que não vem de cadastro (testemunha, advogado), digitado na tela Gerar. */
export interface SignatarioAvulso {
  nome: string;
  cpfCnpj?: string | null;
  /** Complemento curto sob o nome ("OAB/MT nº 1.234"). */
  qualificacao?: string | null;
  genero?: Genero;
}

export interface EntradaSignatarios {
  /** Quadro societário, na ordem em que ele aparece no documento. */
  socios: SocioParaMapear[];
  /** Administração da sociedade (sócios ou não). */
  administradores?: AdministradorParaMapear[];
  /**
   * Sócios que se RETIRAM neste instrumento, por terem cedido a totalidade das
   * quotas (ver `retirantesDaCessao`). Não estão em `socios` — o quadro é o
   * RESULTANTE —, e sem esta lista eles só apareciam pela administração, o que
   * fazia o fecho chamar de "Administrador" quem acabou de sair do quadro e calar
   * a retirada, que é o fato que a peça precisa publicar.
   */
  retirantes?: PessoaRow[];
  /**
   * Resolve uma pessoa pelo id, para achar o cônjuge de quem o regime de bens
   * obriga a outorgar (`pessoa.conjuge_id`). O vínculo é lido COMO ESTÁ: quando
   * gravado de um lado só, o cônjuge daquele lado entra na lista e o do outro
   * não — some quando a reciprocidade do cadastro chegar (B10).
   */
  pessoaPorId?: (id: string) => PessoaRow | null | undefined;
  advogado?: SignatarioAvulso | null;
  testemunhas?: SignatarioAvulso[];
}

/**
 * Qualidade com que a pessoa assina ESTE instrumento. Uma pessoa pode acumular
 * várias (sócia que administra e ainda outorga como cônjuge de outro sócio), e o
 * `papel` diz todas elas: nenhuma qualidade some em silêncio.
 */
export type QualidadeSignatario =
  | 'socio' | 'retirante' | 'administrador' | 'conjuge'
  // Instrumentos agrários. NÃO acumulam com as societárias: quem é parte de um
  // contrato rural assina naquela qualidade e só nela.
  | 'outorgante' | 'outorgado' | 'compossuidor';

/** Ordem das qualidades dentro do rótulo ("Sócio administrador e cônjuge outorgante"). */
const PESO_QUALIDADE: Record<QualidadeSignatario, number> = {
  socio: 0,
  retirante: 1,
  administrador: 2,
  conjuge: 3,
  outorgante: 4,
  outorgado: 5,
  compossuidor: 6,
};

const administradorTitulo = (g: Genero) => concordar(g, 'Administrador', 'Administradora');
/**
 * "Administrador não sócio", a forma LONGA, e por que ela não é o rótulo de todo
 * administrador fora do quadro.
 *
 * Ela existe para desfazer uma contradição na mesma linha: quem cedeu a totalidade
 * das quotas assina como sócio retirante E segue administrando, e sem o "não
 * sócio" a linha afirmaria as duas condições ao mesmo tempo. É a redação da 2ª
 * alteração da MMS Agro ("Sócio retirante, outorga conjugal e administrador não
 * sócio"), o único instrumento do corpus em que alguém administra fora do quadro.
 *
 * Para quem NUNCA foi sócio, o corpus não tem exemplo — nenhum dos quatro
 * documentos de referência traz o caso —, então o rótulo continua o curto
 * (`administradorTitulo`). Alongá-lo ali seria decisão de redação sem lastro,
 * pega de carona num conserto de outro caso. Se a PSA decidir que o fecho deve
 * dizer "não sócio" sempre, o lugar é uma linha só: a entrada `administrador`
 * da tabela abaixo.
 */
const administradorNaoSocioTitulo = (g: Genero) =>
  concordar(g, 'Administrador não sócio', 'Administradora não sócia');
/** Sócio que se RETIRA neste instrumento, por ter cedido a totalidade das quotas. */
const retiranteTitulo = (g: Genero) => concordar(g, 'Sócio retirante', 'Sócia retirante');
// Títulos dos instrumentos agrários. A PJ concorda no FEMININO
// (`generoDeConcordancia`), e é por isso que a sociedade outorgante do contrato
// de parceria assina como *PARCEIRA* outorgante sem ter gênero cadastrado.
const outorganteTitulo = (g: Genero) => concordar(g, 'Parceiro Outorgante', 'Parceira Outorgante');
const outorgadoTitulo = (g: Genero) => concordar(g, 'Parceiro Outorgado', 'Parceira Outorgada');
const compossuidorTitulo = (g: Genero) => concordar(g, 'Compossuidor Rural', 'Compossuidora Rural');
/** "Cônjuge" é o substantivo dos dois gêneros e "outorgante" é invariável. */
const eOutorgante = (base: string) => `${base} e cônjuge outorgante`;

/**
 * O complemento da linha em que uma pessoa jurídica assina POR um administrador.
 *
 * Fica aqui, e não no mapeador agrário, porque é vocabulário de linha de
 * assinatura — a mesma razão pela qual `complementoDaLinha` mora neste arquivo.
 *
 * A concordância é com o ADMINISTRADOR, não com a sociedade: os contratos
 * assinados trazem as duas formas embaixo da mesma empresa, "representada por
 * seu Administrador Jose Eduardo de Macedo Soares Junior" e "representada por
 * sua Administradora Maria Auxiliadora Malheiros".
 */
export function representadaPorAdministrador(nome: string, genero: Genero): string {
  return `representada ${concordar(genero, 'por seu Administrador', 'por sua Administradora')} ${nome}`;
}

/** Primeira letra em minúscula: o título entra no MEIO do rótulo, não o abre. */
const minuscula = (t: string) => t.charAt(0).toLocaleLowerCase('pt-BR') + t.slice(1);

/**
 * Rótulo por COMBINAÇÃO de qualidades, já concordado em gênero — o bloco
 * IMPRIME, não monta. A tabela é exaustiva de propósito: quem acrescentar uma
 * qualidade nova (procurador, anuente, interveniente) acrescenta aqui as
 * combinações dela, porque combinação sem rótulo previsto falha alto em vez de
 * eleger uma das qualidades e calar as outras (ver `papelDeQualidades`).
 */
const ROTULOS: Record<string, (g: Genero) => string> = {
  socio: PARES.socioTitulo,
  'socio+administrador': PARES.socioAdministrador,
  'socio+conjuge': (g) => eOutorgante(PARES.socioTitulo(g)),
  'socio+administrador+conjuge': (g) => eOutorgante(PARES.socioAdministrador(g)),
  administrador: administradorTitulo,
  'administrador+conjuge': (g) => eOutorgante(administradorTitulo(g)),
  conjuge: () => 'Cônjuge outorgante',

  // --- Instrumentos agrários -----------------------------------------------
  // Uma qualidade por linha, sem combinações: ser NOMEADO administrador da
  // composse não é qualidade de assinatura — quem foi nomeado já assina como
  // compossuidor, a nomeação é dita na cláusula de administração, e os contratos
  // assinados trazem uma linha por parte. Se a banca quiser a nomeação embaixo do
  // nome, o lugar é uma entrada nova aqui ('compossuidor+administrador'), não uma
  // segunda linha no fecho.
  outorgante: outorganteTitulo,
  outorgado: outorgadoTitulo,
  compossuidor: compossuidorTitulo,

  // --- Retirante -----------------------------------------------------------
  // `retirante` NUNCA vem sozinho: só se retira quem era sócio, então a chave
  // carrega as duas e o rótulo diz a qualidade que ele tinha ao assinar.
  //
  // "Sócio retirante" e "administrador não sócio" convivem na MESMA linha, e não
  // se fundem em "Sócio administrador" como no caso de quem permanece: no ato ele
  // era sócio, sai dele não sócio, e segue administrando. Fundir os dois títulos
  // afirmaria uma condição que o instrumento acabou de desfazer, e é por isso que
  // a combinação das quatro qualidades é escrita por extenso, na redação da 2ª
  // alteração da MMS Agro ("Sócio retirante, outorga conjugal e administrador não
  // sócio") em vez de sair da composição mecânica dos pares.
  'socio+retirante': retiranteTitulo,
  'socio+retirante+conjuge': (g) => eOutorgante(retiranteTitulo(g)),
  'socio+retirante+administrador': (g) =>
    `${retiranteTitulo(g)} e ${minuscula(administradorNaoSocioTitulo(g))}`,
  'socio+retirante+administrador+conjuge': (g) =>
    `${retiranteTitulo(g)}, outorga conjugal e ${minuscula(administradorNaoSocioTitulo(g))}`,
};

/** Papéis de quem não vem do cadastro: sem id, não acumulam com ninguém. */
const PAPEL_AVULSO = {
  advogado: (g: Genero) => concordar(g, 'Advogado', 'Advogada'),
  testemunha: () => 'Testemunha',
} as const;

/**
 * Rótulo da linha de assinatura para o conjunto de qualidades da pessoa.
 *
 * Combinação sem rótulo previsto **lança**: um fecho que escolhe uma das
 * qualidades apaga em silêncio a outra, e é assim que a administradora não sócia
 * que também é cônjuge sumia como administradora enquanto a cláusula de
 * administração a nomeava.
 */
export function papelDeQualidades(qualidades: Set<QualidadeSignatario>, genero: Genero): string {
  const chave = [...qualidades]
    // Qualidade desconhecida vai para o fim e SOBRA na chave: é o que faz a
    // busca falhar em vez de casar com uma combinação conhecida menor.
    .sort((a, b) => (PESO_QUALIDADE[a] ?? Number.MAX_SAFE_INTEGER) - (PESO_QUALIDADE[b] ?? Number.MAX_SAFE_INTEGER))
    .join('+');
  const rotulo = ROTULOS[chave];
  if (!rotulo) {
    throw new Error(
      `Signatário com combinação de qualidades sem rótulo previsto: "${chave || '(nenhuma)'}". ` +
      'Declare o rótulo dessa combinação em ROTULOS (signatarios.ts) — o fecho não pode ' +
      'escolher uma qualidade e calar as outras.',
    );
  }
  return rotulo(genero);
}

export interface DadosSignatario {
  nome: string;
  nomeMaiusculo: string;
  papel: string;
  cpfCnpj: string;
  qualificacao: string;
  eSocio?: boolean;
  eRetirante?: boolean;
  eAdministrador?: boolean;
  eConjuge?: boolean;
  eTestemunha?: boolean;
  eAdvogado?: boolean;
  eOutorgante?: boolean;
  eOutorgado?: boolean;
  eCompossuidor?: boolean;
}

/** Condicional de item: 'sim' / '' (o engine não tem "else"). */
const sim = (v: boolean | undefined): string => (v ? 'sim' : '');

/**
 * A LINHA de assinatura como campos, com todas as condicionais publicadas
 * (ausente vira ''). Exportada porque cada instrumento monta a sua lista — o
 * Contrato Social acumula qualidades por pessoa a partir do quadro societário
 * (`mapearSignatarios`, abaixo), o contrato rural sai das partes do cadastro de
 * exploração — mas o FORMATO do item é um só. Duas fábricas fariam
 * {{ signatario.eTestemunha }} resolver num documento e sumir no outro.
 */
export function itemSignatario(dados: DadosSignatario): Campos {
  return {
    nome: dados.nome,
    nomeMaiusculo: dados.nomeMaiusculo,
    papel: dados.papel,
    cpfCnpj: dados.cpfCnpj,
    qualificacao: dados.qualificacao,
    eSocio: sim(dados.eSocio),
    eRetirante: sim(dados.eRetirante),
    eAdministrador: sim(dados.eAdministrador),
    eConjuge: sim(dados.eConjuge),
    eTestemunha: sim(dados.eTestemunha),
    eAdvogado: sim(dados.eAdvogado),
    eOutorgante: sim(dados.eOutorgante),
    eOutorgado: sim(dados.eOutorgado),
    eCompossuidor: sim(dados.eCompossuidor),
  };
}

/**
 * A linha de uma testemunha digitada na tela Gerar.
 *
 * Exportada porque cada instrumento monta a sua lista de signatários, mas o
 * RÓTULO da testemunha é um só — deixar cada mapeador escrever "Testemunha" na
 * mão é como as duas fábricas de item que este arquivo existe para evitar.
 */
export function itemTestemunha(s: SignatarioAvulso): Campos {
  return itemSignatario({
    nome: s.nome,
    nomeMaiusculo: s.nome.toLocaleUpperCase('pt-BR'),
    papel: PAPEL_AVULSO.testemunha(),
    cpfCnpj: s.cpfCnpj ?? '',
    qualificacao: s.qualificacao ?? '',
    eTestemunha: true,
  });
}

/** Pessoa do cadastro enquanto a lista é montada: qualidades e complementos acumulam aqui. */
interface SignatarioEmMontagem {
  pessoa: PessoaRow;
  nome: string;
  nomeMaiusculo: string;
  cpfCnpj: string;
  genero: Genero;
  exigeOutorga: boolean;
  qualidades: Set<QualidadeSignatario>;
  /** Nome do sócio de quem esta pessoa é cônjuge outorgante. */
  conjugeDe: string;
  /** Cargo na administração, quando cadastrado. */
  cargo: string;
  /** Quem assina pela sócia PJ. */
  representante: string;
}

/**
 * Complemento curto sob o papel, em ordem de necessidade: quem assina PELA sócia
 * PJ é indispensável; de quem a pessoa é cônjuge liga a outorga ao sócio, e só
 * faz falta a quem não está no quadro societário; o cargo fecha, porque é a
 * única coisa que a linha de um administrador não sócio ainda não disse.
 *
 * Sócio não leva cargo nem vínculo conjugal aqui: os dois já estão no `papel` e
 * o nome dele está no quadro.
 */
function complementoDaLinha(sig: SignatarioEmMontagem): string {
  // `representante` chega com o artigo dentro ("o senhor X"), então a preposição
  // contrai no ponto de junção — sem isso saía "representada por o senhor".
  if (sig.representante) return `neste ato representada ${contrairPor(sig.representante)}`;
  if (sig.qualidades.has('socio')) return '';
  if (sig.conjugeDe) return `cônjuge de ${sig.conjugeDe}`;
  return cargoQueAcrescenta(sig);
}

/**
 * O cargo cadastrado, mas SÓ quando ele acrescenta algo ao papel.
 *
 * O cargo está no complemento para dizer a única coisa que a linha de um
 * administrador não sócio ainda não disse. Quando ele repete o papel, ou pior,
 * quando CONTRADIZ o instrumento, ele deixa de informar e passa a confundir: o
 * cadastro grava "Sócio-Administrador" como cargo, e numa peça em que a pessoa
 * cedeu a totalidade das quotas o fecho saía com "Administrador não sócio" no
 * papel e "Sócio-Administrador" logo embaixo, duas linhas afirmando coisas
 * opostas sobre a mesma assinatura.
 *
 * Regra: cai fora o cargo que se diz sócio sem que a pessoa seja sócia neste
 * instrumento, e o cargo que o papel já contém. O cadastro não é corrigido aqui
 * de propósito — quem decide o texto do cargo é o cadastro, e o fecho só decide
 * se aquele texto ainda ajuda a ler ESTA assinatura.
 */
function cargoQueAcrescenta(sig: SignatarioEmMontagem): string {
  const cargo = sig.cargo.trim();
  if (!cargo) return '';
  const normal = (t: string) =>
    t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z]+/g, ' ').trim();
  const cargoNormal = normal(cargo);
  if (/\bsocio\b/.test(cargoNormal) && !sig.qualidades.has('socio')) return '';
  const papelNormal = normal(papelDeQualidades(sig.qualidades, sig.genero));
  if (papelNormal.includes(cargoNormal)) return '';
  return cargo;
}

/**
 * Uma entrada por LINHA DE ASSINATURA do documento, nesta ordem:
 * sócios na ordem do quadro, cada um imediatamente seguido do seu cônjuge
 * outorgante quando o regime de bens exigir; depois os administradores que não
 * são sócios; depois advogado e testemunhas.
 *
 * Ninguém aparece duas vezes, e o `papel` ACUMULA todas as qualidades daquela
 * pessoa naquele instrumento: sócia que administra sai "Sócia administradora";
 * administradora não sócia casada com um sócio sai "Administradora e cônjuge
 * outorgante"; as três juntas saem inteiras. Assinar duas vezes não outorga mais
 * do que assinar uma, e nenhuma qualidade pode evaporar porque a pessoa foi lida
 * duas vezes — era o que fazia o fecho não ter quem assinasse como administrador
 * enquanto a cláusula de administração nomeava a pessoa.
 *
 * Por isso a montagem é em duas etapas: primeiro cada pessoa junta as qualidades
 * e os complementos dela, depois a lista é emitida de uma vez, na ordem em que a
 * pessoa apareceu. Emitir dentro de cada laço obrigaria a descartar a segunda
 * emissão, que é exatamente a perda de qualidade que a regra proíbe.
 *
 * Item sem nome não entra: uma régua de assinatura sem nome embaixo não é
 * signatário, é ruído no fecho.
 */
export function mapearSignatarios(entrada: EntradaSignatarios): ItemLista[] {
  const { socios, administradores = [], retirantes = [], pessoaPorId, advogado, testemunhas = [] } = entrada;

  const idsAdministradores = new Set(administradores.map((a) => a.pessoa.id).filter(Boolean));
  const idsSocios = new Set(socios.map((s) => s.pessoa.id).filter(Boolean));
  const idsRetirantes = new Set(retirantes.map((p) => p.id).filter(Boolean));

  // --- Etapa 1: acumular qualidades por pessoa, fixando a ordem das linhas ---

  const porPessoa = new Map<string, SignatarioEmMontagem>();
  const ordem: SignatarioEmMontagem[] = [];
  const posicionados = new Set<SignatarioEmMontagem>();
  let semId = 0;

  /** Acumulador da pessoa (o mapeador de pessoa é a fonte única dos campos). */
  const acumulador = (pessoa: PessoaRow): SignatarioEmMontagem => {
    // Pessoa sem id não tem como ser reconhecida em outra lista: cada aparição é
    // uma pessoa distinta, como já era antes da acumulação.
    const chave = pessoa.id || `sem-id:${(semId += 1)}`;
    const existente = porPessoa.get(chave);
    if (existente) return existente;
    const campos = mapearPessoa(pessoa);
    const novo: SignatarioEmMontagem = {
      pessoa,
      nome: campos.nome ?? '',
      nomeMaiusculo: campos.nomeMaiusculo ?? '',
      cpfCnpj: campos.cpfCnpj ?? '',
      genero: generoDeConcordancia((campos.genero || null) as Genero, campos.tipoPessoa),
      exigeOutorga: campos.exigeOutorgaConjugal === 'sim',
      qualidades: new Set<QualidadeSignatario>(),
      conjugeDe: '',
      cargo: '',
      representante: '',
    };
    porPessoa.set(chave, novo);
    return novo;
  };

  /** Fixa a posição da linha na primeira vez em que a pessoa a merece. */
  const posicionar = (s: SignatarioEmMontagem) => {
    if (posicionados.has(s)) return;
    posicionados.add(s);
    ordem.push(s);
  };

  for (const s of socios) {
    const sig = acumulador(s.pessoa);
    sig.qualidades.add('socio');
    if (s.pessoa.id && idsAdministradores.has(s.pessoa.id)) sig.qualidades.add('administrador');
    // Sócia PJ assina por quem a representa — o complemento vai sob o papel.
    if (s.representante) sig.representante = s.representante;
    posicionar(sig);

    // Outorga conjugal: a MESMA flag de sempre (derivada do regime de bens)
    // decide, o que muda é o efeito — em vez de virar sufixo do rótulo do
    // sócio, ela põe o cônjuge na lista, com nome e linha próprios.
    if (!sig.exigeOutorga) continue;
    const conjuge = s.pessoa.conjuge_id ? pessoaPorId?.(s.pessoa.conjuge_id) : null;
    if (!conjuge) continue;
    const sigConjuge = acumulador(conjuge);
    sigConjuge.qualidades.add('conjuge');
    if (!sigConjuge.conjugeDe) sigConjuge.conjugeDe = sig.nome;
    // O cônjuge que também é sócio assina na posição DELE no quadro, com o papel
    // acumulado: adiantá-lo para cá quebraria "sócios na ordem do quadro".
    if (!(conjuge.id && idsSocios.has(conjuge.id))) posicionar(sigConjuge);
  }

  // Retirantes depois do quadro resultante e antes de quem só administra: é a
  // ordem do instrumento registrado (a sócia ingressante encabeça, os que saíram
  // vêm em seguida) e a que o leitor da junta espera.
  for (const pessoa of retirantes) {
    const sig = acumulador(pessoa);
    // As duas juntas: era sócio (é o que dá sentido a "retirante") e se retira.
    sig.qualidades.add('socio');
    sig.qualidades.add('retirante');
    if (pessoa.id && idsAdministradores.has(pessoa.id)) sig.qualidades.add('administrador');
    posicionar(sig);

    // A retirada transfere quotas, e transferir pede a outorga do cônjuge pelo
    // mesmo regime de bens que já governa a subscrição — daí a mesma flag.
    if (!sig.exigeOutorga) continue;
    const conjuge = pessoa.conjuge_id ? pessoaPorId?.(pessoa.conjuge_id) : null;
    if (!conjuge) continue;
    const sigConjuge = acumulador(conjuge);
    sigConjuge.qualidades.add('conjuge');
    if (!sigConjuge.conjugeDe) sigConjuge.conjugeDe = sig.nome;
    // Cônjuge que também é retirante (o casal que cedeu tudo) assina na posição
    // DELE, com o papel acumulado — adiantá-lo quebraria a ordem acima.
    if (!(conjuge.id && idsRetirantes.has(conjuge.id))) posicionar(sigConjuge);
  }

  for (const a of administradores) {
    const sig = acumulador(a.pessoa);
    sig.qualidades.add('administrador');
    if (a.cargo) sig.cargo = a.cargo;
    // Quem já é sócio, ou já entrou como cônjuge do sócio dele, mantém a posição
    // que tinha; quem só administra entra aqui, depois do quadro.
    posicionar(sig);
  }

  // --- Etapa 2: emitir uma linha por pessoa ---------------------------------

  const itens: ItemLista[] = [];
  const emitir = (campos: Campos, pessoa?: PessoaRow | null) => {
    if (!campos.nome) return;
    itens.push({ signatario: pessoa?.id ? comOrigem(campos, { tipo: 'pessoa', id: pessoa.id }) : campos });
  };

  for (const sig of ordem) {
    emitir(
      itemSignatario({
        nome: sig.nome,
        nomeMaiusculo: sig.nomeMaiusculo,
        papel: papelDeQualidades(sig.qualidades, sig.genero),
        cpfCnpj: sig.cpfCnpj,
        qualificacao: complementoDaLinha(sig),
        eSocio: sig.qualidades.has('socio'),
        eRetirante: sig.qualidades.has('retirante'),
        eAdministrador: sig.qualidades.has('administrador'),
        eConjuge: sig.qualidades.has('conjuge'),
      }),
      sig.pessoa,
    );
  }

  const avulso = (s: SignatarioAvulso, papel: string, marca: Partial<DadosSignatario>) =>
    emitir(
      itemSignatario({
        nome: s.nome,
        nomeMaiusculo: s.nome.toLocaleUpperCase('pt-BR'),
        papel,
        cpfCnpj: s.cpfCnpj ?? '',
        qualificacao: s.qualificacao ?? '',
        ...marca,
      }),
    );

  if (advogado) avulso(advogado, PAPEL_AVULSO.advogado(advogado.genero), { eAdvogado: true });
  for (const t of testemunhas) avulso(t, PAPEL_AVULSO.testemunha(), { eTestemunha: true });

  return itens;
}
