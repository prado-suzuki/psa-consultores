import { concordar, generoDeConcordancia, PARES, type Genero } from './concordancia';
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
export type QualidadeSignatario = 'socio' | 'administrador' | 'conjuge';

/** Ordem das qualidades dentro do rótulo ("Sócio administrador e cônjuge outorgante"). */
const PESO_QUALIDADE: Record<QualidadeSignatario, number> = {
  socio: 0,
  administrador: 1,
  conjuge: 2,
};

const administradorTitulo = (g: Genero) => concordar(g, 'Administrador', 'Administradora');
/** "Cônjuge" é o substantivo dos dois gêneros e "outorgante" é invariável. */
const eOutorgante = (base: string) => `${base} e cônjuge outorgante`;

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

interface DadosSignatario {
  nome: string;
  nomeMaiusculo: string;
  papel: string;
  cpfCnpj: string;
  qualificacao: string;
  eSocio?: boolean;
  eAdministrador?: boolean;
  eConjuge?: boolean;
  eTestemunha?: boolean;
  eAdvogado?: boolean;
}

/** Condicional de item: 'sim' / '' (o engine não tem "else"). */
const sim = (v: boolean | undefined): string => (v ? 'sim' : '');

function itemSignatario(dados: DadosSignatario): Campos {
  return {
    nome: dados.nome,
    nomeMaiusculo: dados.nomeMaiusculo,
    papel: dados.papel,
    cpfCnpj: dados.cpfCnpj,
    qualificacao: dados.qualificacao,
    eSocio: sim(dados.eSocio),
    eAdministrador: sim(dados.eAdministrador),
    eConjuge: sim(dados.eConjuge),
    eTestemunha: sim(dados.eTestemunha),
    eAdvogado: sim(dados.eAdvogado),
  };
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
  if (sig.representante) return `neste ato representada por ${sig.representante}`;
  if (sig.qualidades.has('socio')) return '';
  if (sig.conjugeDe) return `cônjuge de ${sig.conjugeDe}`;
  return sig.cargo;
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
  const { socios, administradores = [], pessoaPorId, advogado, testemunhas = [] } = entrada;

  const idsAdministradores = new Set(administradores.map((a) => a.pessoa.id).filter(Boolean));
  const idsSocios = new Set(socios.map((s) => s.pessoa.id).filter(Boolean));

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
