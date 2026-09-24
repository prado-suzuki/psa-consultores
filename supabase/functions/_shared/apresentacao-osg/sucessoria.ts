/**
 * Conteúdo do capítulo 04 (Organização sucessória): os tokens do molde, página a página.
 * Só texto e formato; base e imposto vêm gravados. Regras em docs/osg/apresentacao-da-osg.md.
 */

import {
  aberturaDoImposto, divArredondado, FAIXAS, formatMoney, parseMoney, quantizar2, tetoDaFaixa, ZERO, type Money,
} from './itcmd.ts';
import { cardinalExtenso, nomesCurtos, valorExtenso } from './texto.ts';
import { MAXIMO_DE_CENARIOS, planoDoResumo, type PaginaDoResumoPlano } from './paginacao.ts';
import { anota, ONDE, type ProblemaDoDeck } from './regras.ts';

// ═══════════════════════════════════════════════════════════════════════════
// A entrada
// ═══════════════════════════════════════════════════════════════════════════

/* O que a calculadora gravou: cada cenário é uma cadeia de simulações aprovadas, e o gerador
   não refaz a conta. Dinheiro e quotas em texto decimal, nunca `number`. */

export type Regua = 'contabil' | 'itr' | 'mercado';
export type PorRegua<T> = Record<Regua, T>;

export const REGUAS: readonly Regua[] = ['contabil', 'itr', 'mercado'];

/** A sigla da régua nos tokens do molde: `RT_CT_BASE`, `TI_IT_R_F3`. */
export const SIGLA_DA_REGUA: Record<Regua, 'CT' | 'IT' | 'MC'> = {
  contabil: 'CT',
  itr: 'IT',
  mercado: 'MC',
};

export interface PessoaDoCapitulo {
  id: string;
  /** Como está no cadastro ("AVELINO NERI BOCOLLI"); o slide usa o nome curto. */
  nome: string;
  /** `null` = não cadastrado: o texto sai sem Sr./Sra. e o capítulo avisa. */
  genero: 'M' | 'F' | null;
  fundador: boolean;
  filiacaoPaiId: string | null;
  filiacaoMaeId: string | null;
}

export interface ParentescoDoCapitulo {
  /** Em `tipo = 'Filho(a)'`, `pessoaId` é o FILHO e `parenteId` é o pai ou a mãe. */
  pessoaId: string;
  parenteId: string;
  tipo: string;
}

export interface DoadorDoAto {
  pessoaId: string;
  quotas: string;
  quotasTransmitidas: string;
  quotasFinal: string;
  emissaoConjunta: boolean;
  conjugeId: string | null;
  aporte: string;
}

export interface DonatarioDoAto {
  pessoaId: string;
  quotasAtuais: string;
  legitima: string;
  disponivel: string;
  quotasFinal: string;
  aporte: string;
}

/** As duas bases da guia com usufruto, integral (100) e reduzida (70). Nenhuma é a escolhida. */
export type BaseDoAto = '100' | '70';

/** Base e imposto de uma guia nas três réguas, numa base de cálculo. */
export interface ApuracaoDoAto {
  base: PorRegua<string>;
  imposto: PorRegua<string>;
}

/**
 * A guia em cada base gravada: as duas com alternativa, uma só na doação sem reserva e na
 * simulação antiga. Vazio na reserva, que não tem guia própria.
 */
export type PorBaseDoAto = Partial<Record<BaseDoAto, ApuracaoDoAto>>;

export interface GuiaDoAto {
  doadorId: string;
  donatarioId: string;
  porBase: PorBaseDoAto;
}

export interface UsufrutoDoAto {
  pessoaId: string;
  papel: 'usufrui' | 'concede';
  quotas: string;
  plena: string;
  nuaReserva: string;
  nuaInstituicao: string;
  usufruto: string;
}

export interface ConcessaoDoAto {
  deId: string;
  paraId: string;
  origem: 'reserva' | 'instituicao';
  quotas: string;
  /** Vazio na reserva: ela não tem guia própria. */
  porBase: PorBaseDoAto;
}

/** Uma simulação gravada: um ato da cadeia. */
export interface AtoDoCapitulo {
  id: string;
  versao: number;
  nome: string | null;
  status: string;
  /** `AAAA-MM`: o mês da UPF. */
  competencia: string;
  upf: string;
  totalDeQuotas: string;
  acervo: PorRegua<string>;
  /** Com reserva, a guia da doação tem as duas bases; sem, só a integral. */
  comReserva: boolean;
  origemId: string | null;
  doadores: DoadorDoAto[];
  donatarios: DonatarioDoAto[];
  gias: GuiaDoAto[];
  usufruto: UsufrutoDoAto[];
  concessoes: ConcessaoDoAto[];
}

export interface EntradaDoCapitulo {
  /** Cada cenário é a cadeia de atos, do mais antigo ao mais novo. */
  cenarios: AtoDoCapitulo[][];
  pessoas: PessoaDoCapitulo[];
  parentescos: ParentescoDoCapitulo[];
}

/** Token → valor, como o `applyTokensToNode` recebe. */
export type Tokens = Record<string, string>;

// ═══════════════════════════════════════════════════════════════════════════
// A saída
// ═══════════════════════════════════════════════════════════════════════════

export interface PaginaDaSimulacao {
  /** Os tokens da página: `CEN_*`, as frases `SIM_*` e a linha TOTAL. */
  tokens: Tokens;
  /** Uma entrada por linha da tabela (a linha-modelo `SIM_NOME`). */
  linhas: Tokens[];
  semAporte: boolean;
  semReserva: boolean;
}

export interface CartaoDoAto {
  base: string;
  guias: Array<{ rotulo: string; base: string; itcd: string }>;
  itcd: string;
}

export interface AtoDoResumo {
  /** "Doação de Regina para Cristina:" — vazio fora de cadeia. */
  rotulo: string;
  cartoes: Record<'CT' | 'IT' | 'MC', CartaoDoAto>;
}

export interface PaginaDoResumo {
  tokens: Tokens;
  plano: PaginaDoResumoPlano;
  /** Os atos desta página, na ordem do `plano.atos`. */
  atos: AtoDoResumo[];
  /** Introdução longa (primeiro cenário) ou curta. */
  primeiroCenario: boolean;
  base100: boolean;
}

export interface CenarioDoCapitulo {
  /** O nome dado à simulação, sem numeral fixo na frente. */
  nome: string;
  simulacao: PaginaDaSimulacao[];
  resumo: PaginaDoResumo[];
  usufruto: { tokens: Tokens; linhas: Tokens[] } | null;
  instituicoes: Tokens[];
}

export interface CapituloSucessorio {
  tributacaoAtual: Tokens;
  cenarios: CenarioDoCapitulo[];
  resumoDosCenarios: Tokens;
  problemas: ProblemaDoDeck[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Formato
// ═══════════════════════════════════════════════════════════════════════════

const agrupar = (inteiro: string) => inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Quotas: "4.448.500". */
export function fmtQuotas(q: bigint): string {
  return `${q < 0n ? '-' : ''}${agrupar((q < 0n ? -q : q).toString())}`;
}

/** Dinheiro: "R$ 4.448.500,00". */
export function fmtReais(m: Money): string {
  const texto = formatMoney(m);
  const negativo = texto.startsWith('-');
  const [inteiro, fracao] = texto.replace('-', '').split('.');
  return `${negativo ? '-' : ''}R$ ${agrupar(inteiro)},${fracao}`;
}

/** Percentual com 2 casas: "46,54%". Denominador zero é "0,00%", não divisão por zero. */
export function fmtPct(parte: bigint, total: bigint): string {
  if (total === 0n) return '0,00%';
  const centesimos = divArredondado(parte * 10_000n, total);
  const inteiro = centesimos / 100n;
  return `${agrupar(inteiro.toString())},${(centesimos % 100n).toString().padStart(2, '0')}%`;
}

/** Percentual no texto corrido: "51%" quando redondo, "46,54%" quando não. */
export function pctNoTexto(parte: bigint, total: bigint): string {
  return fmtPct(parte, total).replace(/,00%$/, '%');
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto',
  'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function mesDa(competencia: string): { extenso: string; abreviado: string; ano: string } {
  const m = /^(\d{4})-(\d{2})$/.exec(competencia.trim());
  const mes = m ? MESES[Number(m[2]) - 1] : undefined;
  if (!m || !mes) return { extenso: competencia, abreviado: competencia, ano: '' };
  return { extenso: mes, abreviado: mes.slice(0, 3), ano: m[1] };
}

const q = (s: string | number | null | undefined): bigint => BigInt(String(s ?? '0').split('.')[0] || '0');
const m = (s: string | number | null | undefined): Money => quantizar2(parseMoney(String(s ?? '0')));
const quotasOuTraco = (v: bigint) => (v === 0n ? '-' : fmtQuotas(v));
const reaisOuTraco = (v: Money) => (v === 0n ? '-' : fmtReais(v));
const extensoDeQuotas = (v: bigint) => cardinalExtenso(Number(v), true);
const extensoDeReais = (v: Money) => valorExtenso(Number(formatMoney(v)));

function lista(itens: string[]): string {
  if (itens.length <= 1) return itens[0] ?? '';
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Pessoas: nome curto, tratamento, parentesco
// ═══════════════════════════════════════════════════════════════════════════

class Pessoas {
  private readonly porId: Map<string, PessoaDoCapitulo>;
  private readonly curto: Map<string, string>;
  /** Quem apareceu num lugar que pede gênero e não tem — vira UM aviso no fim. */
  readonly semGenero = new Set<string>();

  constructor(private readonly entrada: EntradaDoCapitulo) {
    this.porId = new Map(entrada.pessoas.map((p) => [p.id, p]));
    const ids = new Set<string>();
    for (const atos of entrada.cenarios) {
      for (const a of atos) {
        a.doadores.forEach((d) => { ids.add(d.pessoaId); if (d.conjugeId) ids.add(d.conjugeId); });
        a.donatarios.forEach((d) => ids.add(d.pessoaId));
        a.usufruto.forEach((u) => ids.add(u.pessoaId));
        a.concessoes.forEach((c) => { ids.add(c.deId); ids.add(c.paraId); });
      }
    }
    // Nome curto resolvido sobre o CAPÍTULO inteiro: a mesma pessoa se chama igual em
    // todas as páginas, e duas Marias viram "Maria Silva" e "Maria Souza" em todas.
    this.curto = nomesCurtos([...ids].map((id) => ({ id, nome: this.porId.get(id)?.nome ?? id })));
  }

  nome(id: string): string {
    return this.curto.get(id) ?? this.porId.get(id)?.nome ?? id;
  }

  genero(id: string): 'M' | 'F' | null {
    const g = this.porId.get(id)?.genero ?? null;
    if (g == null) this.semGenero.add(this.nome(id));
    return g;
  }

  fundador(id: string): boolean {
    return this.porId.get(id)?.fundador === true;
  }

  /** "Sr. Avelino" · "Sra. Iracema" · "Avelino" sem gênero. */
  tratamento(id: string): string {
    const g = this.genero(id);
    return g === 'M' ? `Sr. ${this.nome(id)}` : g === 'F' ? `Sra. ${this.nome(id)}` : this.nome(id);
  }

  /** "do Sr. Avelino" · "da Sra. Regina" · "de Regina". */
  deTratamento(id: string): string {
    const g = this.genero(id);
    return g === 'M' ? `do Sr. ${this.nome(id)}` : g === 'F' ? `da Sra. ${this.nome(id)}` : `de ${this.nome(id)}`;
  }

  /** "o Sr. Avelino" · "a Sra. Cristina" · "Cristina". */
  comArtigo(id: string): string {
    const g = this.genero(id);
    return g === 'M' ? `o Sr. ${this.nome(id)}` : g === 'F' ? `a Sra. ${this.nome(id)}` : this.nome(id);
  }

  /** "dos fundadores" · "do fundador" · "da fundadora"; `null` se alguém do grupo não é fundador. */
  grupoDeFundadores(ids: string[], preposicao: 'de' | 'a'): string | null {
    if (ids.length === 0 || !ids.every((id) => this.fundador(id))) return null;
    const generos = ids.map((id) => this.porId.get(id)?.genero ?? null);
    const femininas = generos.every((g) => g === 'F');
    if (ids.length === 1) {
      if (femininas) return preposicao === 'de' ? 'da fundadora' : 'à fundadora';
      return preposicao === 'de' ? 'do fundador' : 'ao fundador';
    }
    if (femininas) return preposicao === 'de' ? 'das fundadoras' : 'às fundadoras';
    return preposicao === 'de' ? 'dos fundadores' : 'aos fundadores';
  }

  /** `filho` é Filho(a) de alguém de `pais`? Pelo parentesco ou pela filiação do cadastro. */
  private filhoDe(filho: string, pais: Set<string>): boolean {
    const p = this.porId.get(filho);
    if (p && ((p.filiacaoPaiId && pais.has(p.filiacaoPaiId)) || (p.filiacaoMaeId && pais.has(p.filiacaoMaeId)))) {
      return true;
    }
    return this.entrada.parentescos.some(
      (r) => r.tipo === 'Filho(a)' && r.pessoaId === filho && pais.has(r.parenteId),
    );
  }

  /** "as filhas" · "o filho" quando todo donatário é filho de quem doa; `null` sem isso ou sem gênero. */
  relacaoDosDonatarios(donatarios: string[], doadores: Set<string>): string | null {
    if (donatarios.length === 0 || !donatarios.every((d) => this.filhoDe(d, doadores))) return null;
    const generos = donatarios.map((d) => this.genero(d));
    if (generos.some((g) => g == null)) return null;
    const todasF = generos.every((g) => g === 'F');
    if (donatarios.length === 1) return todasF ? 'a filha' : 'o filho';
    return todasF ? 'as filhas' : 'os filhos';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Leitura dos atos
// ═══════════════════════════════════════════════════════════════════════════

/** Quem assina pela linha do doador: o titular, e o cônjuge na emissão conjunta. */
const assinantes = (d: DoadorDoAto): string[] =>
  (d.emissaoConjunta && d.conjugeId ? [d.pessoaId, d.conjugeId] : [d.pessoaId]);

/** O nome da linha do doador, como a calculadora mostra: "Avelino e Iracema". */
function nomeDoDoador(p: Pessoas, d: DoadorDoAto): string {
  return lista(assinantes(d).map((id) => p.nome(id)));
}

const instituicoesDe = (a: AtoDoCapitulo): ConcessaoDoAto[] => a.concessoes.filter((c) => c.origem === 'instituicao');

/** A guia na base pedida ou, na simulação antiga, na que existe; a resposta diz qual. Nulo na reserva. */
function naBase(porBase: PorBaseDoAto, base: BaseDoAto): { apuracao: ApuracaoDoAto; base: BaseDoAto } | null {
  const pedida = porBase[base];
  if (pedida) return { apuracao: pedida, base };
  const outra: BaseDoAto = base === '100' ? '70' : '100';
  return porBase[outra] ? { apuracao: porBase[outra]!, base: outra } : null;
}

/* A regra do deck: doação em 100%, instituição com as duas bases, e o total do cenário soma a
   instituição em 70%. */
const BASE_DA_DOACAO: BaseDoAto = '100';
const BASE_DA_INSTITUICAO_NO_TOTAL: BaseDoAto = '70';

/** A doação saiu toda na base do deck? Falso quando alguma guia só tem a outra. */
const doacaoNaBaseDoDeck = (a: AtoDoCapitulo): boolean =>
  a.gias.every((g) => naBase(g.porBase, BASE_DA_DOACAO)?.base === BASE_DA_DOACAO);

/** O total do ato numa régua: a doação mais as guias de instituição, como gravado. */
function totalDoAto(a: AtoDoCapitulo, r: Regua): Money {
  const doacao = a.gias.reduce((s, g) => s + m(naBase(g.porBase, BASE_DA_DOACAO)?.apuracao.imposto[r]), ZERO);
  return instituicoesDe(a).reduce(
    (s, c) => s + m(naBase(c.porBase, BASE_DA_INSTITUICAO_NO_TOTAL)?.apuracao.imposto[r]),
    doacao,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// As frases da Simulação (Cn.1)
// ═══════════════════════════════════════════════════════════════════════════

function fraseDaDoacao(p: Pessoas, a: AtoDoCapitulo): string {
  const fim = a.comReserva ? ';' : '.';
  const doam = a.doadores.flatMap(assinantes);
  const recebem = a.donatarios.map((d) => d.pessoaId);
  const blocoInteiro = a.doadores.length > 0
    && a.doadores.every((d) => q(d.quotas) > 0n && q(d.quotasTransmitidas) === q(d.quotas));

  if (blocoInteiro) {
    const doado = a.doadores.reduce((s, d) => s + q(d.quotasTransmitidas), 0n);
    const tinham = a.doadores.reduce((s, d) => s + q(d.quotas), 0n);
    const grupo = p.grupoDeFundadores(doam, 'de');
    const deQuem = grupo
      ? `${grupo} (${lista(doam.map((id) => p.tratamento(id)))})`
      : `de ${lista(doam.map((id) => p.tratamento(id)))}`;
    const relacao = p.relacaoDosDonatarios(recebem, new Set(doam));
    const paraQuem = relacao
      ? `${relacao} ${lista(recebem.map((id) => p.nome(id)))}`
      : lista(recebem.map((id) => p.comArtigo(id)));
    const saiu = a.doadores.every((d) => q(d.quotasFinal) === 0n);
    const titulares = a.doadores.map((d) => d.pessoaId);
    const quemSai = p.grupoDeFundadores(titulares, 'de')
      ?? (titulares.length > 1 ? 'dos doadores' : p.genero(titulares[0]) === 'F' ? 'da doadora' : 'do doador');
    return `Doação de ${pctNoTexto(doado, tinham)} das quotas ${deQuem} para ${paraQuem}`
      + `${saiu ? `, com a consequente saída ${quemSai} do quadro societário` : ''}${fim}`;
  }

  const doado = a.doadores.reduce((s, d) => s + q(d.quotasTransmitidas), 0n);
  return `Doação de ${fmtQuotas(doado)} (${extensoDeQuotas(doado)}) quotas, de titularidade plena `
    + `${lista(a.doadores.map((d) => p.deTratamento(d.pessoaId)))}, `
    + `para ${lista(recebem.map((id) => p.comArtigo(id)))}${fim}`;
}

/** "vitalício" vem do deck: a calculadora não modela usufruto a termo. */
const FRASE_DA_RESERVA =
  'A doação será realizada com reserva de usufruto vitalício sobre 100% das quotas doadas, da seguinte forma:';

function fraseDoAporte(p: Pessoas, a: AtoDoCapitulo): string {
  const aportantes = [
    ...a.doadores.map((d) => ({ id: d.pessoaId, valor: m(d.aporte), quotas: q(d.quotas) })),
    ...a.donatarios.map((d) => ({ id: d.pessoaId, valor: m(d.aporte), quotas: q(d.quotasAtuais) })),
  ].filter((x) => x.valor > ZERO);
  if (aportantes.length === 0) return '';

  const total = aportantes.reduce((s, x) => s + x.valor, ZERO);
  const inicio = 'Realizar um aumento de capital social por meio de moeda corrente nacional, no montante';
  if (aportantes.length > 1) {
    return `${inicio} total de ${fmtReais(total)} (${extensoDeReais(total)}), por `
      + `${lista(aportantes.map((x) => `${p.nome(x.id)} (${fmtReais(x.valor)})`))}.`;
  }

  const [x] = aportantes;
  const g = p.genero(x.id);
  const pelo = g === 'M' ? `pelo sócio ${p.nome(x.id)}` : g === 'F' ? `pela sócia ${p.nome(x.id)}` : `por ${p.nome(x.id)}`;
  const ficando = g === 'M' ? 'ficando este com' : g === 'F' ? 'ficando esta com' : 'ficando com';
  const capital = q(a.totalDeQuotas);
  // Valor das quotas pelo preço da quota do acervo contábil: é preço, não imposto.
  const equivalente = capital > 0n
    ? divArredondado(m(a.acervo.contabil) * x.quotas, capital * 100n) * 100n
    : ZERO;
  return `${inicio} de ${fmtReais(x.valor)} (${extensoDeReais(x.valor)}) ${pelo}, ${ficando} `
    + `${pctNoTexto(x.quotas, capital)} das quotas da sociedade, correspondente a `
    + `${fmtReais(equivalente)} (${extensoDeReais(equivalente)}).`;
}

function tituloDaTabela(p: Pessoas, a: AtoDoCapitulo): string {
  const doam = a.doadores.flatMap(assinantes);
  const blocoInteiro = a.doadores.length > 0
    && a.doadores.every((d) => q(d.quotas) > 0n && q(d.quotasTransmitidas) === q(d.quotas));
  if (blocoInteiro) {
    const grupo = p.grupoDeFundadores(doam, 'de');
    return `Doação da totalidade das quotas ${grupo ?? `de ${lista(doam.map((id) => p.nome(id)))}`}`
      + (a.comReserva ? ' com usufruto' : '');
  }
  return `Doação de quotas de ${lista(a.doadores.map((d) => p.nome(d.pessoaId)))} para `
    + `${lista(a.donatarios.map((d) => p.nome(d.pessoaId)))}`;
}

function paginaDaSimulacao(p: Pessoas, a: AtoDoCapitulo, cenario: Tokens): PaginaDaSimulacao {
  const capital = q(a.totalDeQuotas);
  const linhas: Tokens[] = [
    ...a.doadores.map((d) => ({
      SIM_NOME: nomeDoDoador(p, d),
      SIM_QT: fmtQuotas(q(d.quotas)),
      SIM_PCT: fmtPct(q(d.quotas), capital),
      SIM_LEG: '-',
      SIM_DISP: '-',
      SIM_REC: '-',
      SIM_FINAL: fmtQuotas(q(d.quotasFinal)),
      SIM_PCTF: fmtPct(q(d.quotasFinal), capital),
    })),
    ...a.donatarios.map((d) => ({
      SIM_NOME: p.nome(d.pessoaId),
      SIM_QT: fmtQuotas(q(d.quotasAtuais)),
      SIM_PCT: fmtPct(q(d.quotasAtuais), capital),
      SIM_LEG: quotasOuTraco(q(d.legitima)),
      SIM_DISP: quotasOuTraco(q(d.disponivel)),
      SIM_REC: quotasOuTraco(q(d.legitima) + q(d.disponivel)),
      SIM_FINAL: fmtQuotas(q(d.quotasFinal)),
      SIM_PCTF: fmtPct(q(d.quotasFinal), capital),
    })),
  ];

  const somaQt = a.doadores.reduce((s, d) => s + q(d.quotas), 0n)
    + a.donatarios.reduce((s, d) => s + q(d.quotasAtuais), 0n);
  const somaLeg = a.donatarios.reduce((s, d) => s + q(d.legitima), 0n);
  const somaDisp = a.donatarios.reduce((s, d) => s + q(d.disponivel), 0n);
  const somaFinal = a.doadores.reduce((s, d) => s + q(d.quotasFinal), 0n)
    + a.donatarios.reduce((s, d) => s + q(d.quotasFinal), 0n);

  const aporte = fraseDoAporte(p, a);
  return {
    tokens: {
      ...cenario,
      SIM_APORTE: aporte,
      SIM_DOACAO: fraseDaDoacao(p, a),
      SIM_RESERVA: a.comReserva ? FRASE_DA_RESERVA : '',
      SIM_TAB_TIT: tituloDaTabela(p, a),
      SIM_T_QT: fmtQuotas(somaQt),
      SIM_T_PCT: fmtPct(somaQt, capital),
      SIM_T_LEG: quotasOuTraco(somaLeg),
      SIM_T_DISP: quotasOuTraco(somaDisp),
      SIM_T_REC: quotasOuTraco(somaLeg + somaDisp),
      SIM_T_FINAL: fmtQuotas(somaFinal),
      SIM_T_PCTF: fmtPct(somaFinal, capital),
    },
    linhas,
    semAporte: aporte === '',
    semReserva: !a.comReserva,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// O Resumo dos tributos (Cn.2)
// ═══════════════════════════════════════════════════════════════════════════

function rotuloDoAto(p: Pessoas, a: AtoDoCapitulo): string {
  const doam = a.doadores.flatMap(assinantes);
  const recebem = a.donatarios.map((d) => d.pessoaId);
  const grupo = p.grupoDeFundadores(doam, 'de');
  const deQuem = grupo
    ? `${grupo} (${lista(doam.map((id) => p.nome(id)))})`
    : `de ${lista(doam.map((id) => p.nome(id)))}`;
  const relacao = p.relacaoDosDonatarios(recebem, new Set(doam));
  const paraQuem = relacao ? `${relacao} ${lista(recebem.map((id) => p.nome(id)))}` : lista(recebem.map((id) => p.nome(id)));
  return `Doação ${deQuem} para ${paraQuem}:`;
}

function atoDoResumo(p: Pessoas, a: AtoDoCapitulo, cadeia: boolean): AtoDoResumo {
  /* Com mais de um doador, a linha é a guia (doador → donatário): somar por donatário juntaria
     duas faixas progressivas. */
  const porGuia = new Set(a.gias.map((g) => g.doadorId)).size > 1;
  const doadorDaGuia = (id: string) => {
    const d = a.doadores.find((x) => x.pessoaId === id);
    return d ? nomeDoDoador(p, d) : p.nome(id);
  };
  const rotuloDaGuia = (g: AtoDoCapitulo['gias'][number]) => {
    if (porGuia) return `${doadorDaGuia(g.doadorId)} → ${p.nome(g.donatarioId)}`;
    const genero = p.genero(g.donatarioId);
    return genero === 'F' ? `Donatária ${p.nome(g.donatarioId)}`
      : genero === 'M' ? `Donatário ${p.nome(g.donatarioId)}` : p.nome(g.donatarioId);
  };

  const guia = (g: GuiaDoAto) => naBase(g.porBase, BASE_DA_DOACAO)?.apuracao;
  const cartao = (r: Regua): CartaoDoAto => ({
    base: fmtReais(a.gias.reduce((s, g) => s + m(guia(g)?.base[r]), ZERO)),
    guias: a.gias.map((g) => ({
      rotulo: rotuloDaGuia(g), base: fmtReais(m(guia(g)?.base[r])), itcd: fmtReais(m(guia(g)?.imposto[r])),
    })),
    itcd: fmtReais(a.gias.reduce((s, g) => s + m(guia(g)?.imposto[r]), ZERO)),
  });

  return {
    rotulo: cadeia ? rotuloDoAto(p, a) : '',
    cartoes: { CT: cartao('contabil'), IT: cartao('itr'), MC: cartao('mercado') },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// O Usufruto (Cn.3) e a Tributação da instituição (Cn.4)
// ═══════════════════════════════════════════════════════════════════════════

/** Quem usufrui: o papel no quadro, mais quem recebe concessão (o cônjuge da reserva). */
function usufrutuarios(a: AtoDoCapitulo): string[] {
  const ids = new Set(a.usufruto.filter((u) => u.papel === 'usufrui').map((u) => u.pessoaId));
  a.concessoes.forEach((c) => ids.add(c.paraId));
  return [...ids];
}

/** O voto de quem usufrui, em quotas: propriedade plena mais usufruto. */
function votoDosUsufrutuarios(a: AtoDoCapitulo): bigint {
  const ids = new Set(usufrutuarios(a));
  return a.usufruto
    .filter((u) => ids.has(u.pessoaId))
    .reduce((s, u) => s + q(u.plena) + q(u.usufruto), 0n);
}

/** As instituições agrupadas por instituinte: quem cedeu quantas quotas, na ordem. */
function instituintes(a: AtoDoCapitulo): Array<{ id: string; quotas: bigint }> {
  const soma = new Map<string, bigint>();
  instituicoesDe(a).forEach((c) => soma.set(c.deId, (soma.get(c.deId) ?? 0n) + q(c.quotas)));
  return [...soma].map(([id, quotas]) => ({ id, quotas }));
}

function aberturaDoUsufruto(p: Pessoas, a: AtoDoCapitulo): string {
  const quem = usufrutuarios(a);
  const grupo = p.grupoDeFundadores(quem, 'a') ?? `de ${lista(quem.map((id) => p.nome(id)))}`;
  const inst = instituintes(a);
  if (inst.length === 0) return `Com relação ao usufruto ${grupo}, o quadro ficará da seguinte forma:`;

  const total = inst.reduce((s, x) => s + x.quotas, 0n);
  const alvo = pctNoTexto(votoDosUsufrutuarios(a), q(a.totalDeQuotas));
  const final = 'Ao final da operação, a composição societária ficará estruturada da seguinte forma:';
  const inicio = `Com relação ao usufruto ${grupo}, para que atinja o percentual de ${alvo}, será instituído `
    + `usufruto sobre ${fmtQuotas(total)} (${extensoDeQuotas(total)}) quotas`;
  if (inst.length === 1) {
    return `${inicio} pertencentes à propriedade plena ${p.deTratamento(inst[0].id)}. ${final}`;
  }
  return `${inicio}, sendo ${lista(inst.map((x) =>
    `${fmtQuotas(x.quotas)} (${extensoDeQuotas(x.quotas)}) quotas pertencentes à propriedade plena ${p.deTratamento(x.id)}`))}. ${final}`;
}

function paginaDoUsufruto(p: Pessoas, a: AtoDoCapitulo, cenario: Tokens, titulo: string): { tokens: Tokens; linhas: Tokens[] } {
  const capital = q(a.totalDeQuotas);
  // Quem usufrui primeiro, como no deck: é a linha que o cliente procura.
  const ordem = [...a.usufruto].sort((x, y) => (x.papel === y.papel ? 0 : x.papel === 'usufrui' ? -1 : 1));
  const nomeDaLinha = (id: string) => {
    const d = a.doadores.find((x) => x.pessoaId === id);
    return d ? nomeDoDoador(p, d) : p.nome(id);
  };
  const linhas = ordem.map((u) => ({
    US_NOME: nomeDaLinha(u.pessoaId),
    US_QT: fmtQuotas(q(u.quotas)),
    US_PCT: fmtPct(q(u.quotas), capital),
    US_PLENA: quotasOuTraco(q(u.plena)),
    US_NUA: quotasOuTraco(q(u.nuaReserva) + q(u.nuaInstituicao)),
    US_USUF: quotasOuTraco(q(u.usufruto)),
    US_VOTO: fmtPct(q(u.plena) + q(u.usufruto), capital),
  }));
  const soma = (f: (u: AtoDoCapitulo['usufruto'][number]) => bigint) => a.usufruto.reduce((s, u) => s + f(u), 0n);
  const totalQt = soma((u) => q(u.quotas));
  return {
    tokens: {
      ...cenario,
      US_TIT: instituicoesDe(a).length > 0 ? 'Instituição de usufruto' : 'Simulação',
      US_INTRO: aberturaDoUsufruto(p, a),
      US_TAB_TIT: titulo,
      US_T_QT: fmtQuotas(totalQt),
      US_T_PCT: fmtPct(totalQt, capital),
      US_T_PLENA: quotasOuTraco(soma((u) => q(u.plena))),
      US_T_NUA: quotasOuTraco(soma((u) => q(u.nuaReserva) + q(u.nuaInstituicao))),
      US_T_USUF: quotasOuTraco(soma((u) => q(u.usufruto))),
      US_T_VOTO: fmtPct(soma((u) => q(u.plena) + q(u.usufruto)), capital),
    },
    linhas,
  };
}

function aberturaDaInstituicao(p: Pessoas, a: AtoDoCapitulo): string {
  const total = instituintes(a).reduce((s, x) => s + x.quotas, 0n);
  const capital = q(a.totalDeQuotas);
  const depois = votoDosUsufrutuarios(a);
  const antes = depois - total;
  const inicio = `Abaixo, detalhamos a projeção de custos tributários (ITCD) incidentes sobre a parcela de `
    + `${fmtQuotas(total)} (${extensoDeQuotas(total)}) quotas.`;
  if (!a.comReserva) {
    return `${inicio} Esta etapa de instituição de usufruto eleva o atual percentual de `
      + `${pctNoTexto(antes, capital)} para ${pctNoTexto(depois, capital)} do capital social.`;
  }
  const dosFundadores = p.grupoDeFundadores(usufrutuarios(a), 'de') ?? 'de usufruto';
  return `${inicio} Esta etapa de instituição de usufruto visa complementar a reserva ${dosFundadores}, `
    + `elevando o atual percentual de ${pctNoTexto(antes, capital)} para ${pctNoTexto(depois, capital)} do capital social.`;
}

/** A página de UMA guia de instituição: a base integral e a reduzida, faixa a faixa. */
function paginaDaInstituicao(
  p: Pessoas,
  a: AtoDoCapitulo,
  c: ConcessaoDoAto,
  cenario: Tokens,
  avisa: (detalhe: string, tipo?: ProblemaDoDeck['tipo']) => void,
): Tokens {
  const upf = m(a.upf);
  const mes = mesDa(a.competencia);

  /* Uma coluna por base, integral à esquerda e reduzida à direita, sem trocar uma pela outra:
     a página compara as duas. */
  const colunas: Record<'I' | 'R', ApuracaoDoAto | null> = {
    I: c.porBase['100'] ?? null,
    R: c.porBase['70'] ?? null,
  };
  const gravada = colunas.I ? '100' : '70';
  if (!colunas.I || !colunas.R) {
    avisa(`A guia ${p.nome(c.deId)} → ${p.nome(c.paraId)} foi gravada só em ${gravada}% (a simulação é `
      + `anterior a 24/09/2026). A coluna de ${gravada === '100' ? '70' : '100'}% saiu com "—": gere a `
      + 'simulação de novo na calculadora e aprove.');
  }

  const tokens: Tokens = {
    ...cenario,
    TI_INTRO: aberturaDaInstituicao(p, a),
    TI_DE: p.nome(c.deId),
    TI_PARA: p.nome(c.paraId),
    TI_UPF_MES: mes.extenso,
    TI_UPF_ANO: mes.ano,
    TI_UPF: fmtReais(upf),
    TI_PCT: colunas.R ? '70,00%' : '—',
  };
  FAIXAS.slice(0, 4).forEach((f, i) => { tokens[`TI_F${i + 1}_TETO`] = fmtReais(tetoDaFaixa(f, upf) ?? ZERO); });

  for (const r of REGUAS) {
    const b = SIGLA_DA_REGUA[r];
    for (const lado of ['I', 'R'] as const) {
      const col = colunas[lado];
      if (!col) {
        tokens[`TI_${b}_${lado}_BASE`] = '—';
        for (let k = 1; k <= 5; k++) tokens[`TI_${b}_${lado}_F${k}`] = '—';
        tokens[`TI_${b}_${lado}_TOT`] = '—';
        continue;
      }
      const base = m(col.base[r]);
      const abertura = aberturaDoImposto(base, upf, m(col.imposto[r]));
      if (!abertura.fecha) {
        avisa(`Na guia ${p.nome(c.deId)} → ${p.nome(c.paraId)}, o imposto gravado em ${r === 'contabil' ? 'valor contábil' : r === 'itr' ? 'ITR' : 'valor de mercado'} `
          + 'não é o que a tabela da lei dá para a base gravada: as faixas saíram pela lei e o total pelo gravado. '
          + 'É falha do gerador: avise o suporte da PSA Digital.', 'sistema');
      }
      tokens[`TI_${b}_${lado}_BASE`] = fmtReais(base);
      abertura.faixas.forEach((v, k) => { tokens[`TI_${b}_${lado}_F${k + 1}`] = reaisOuTraco(v); });
      tokens[`TI_${b}_${lado}_TOT`] = fmtReais(abertura.total);
    }
  }
  return tokens;
}

// ═══════════════════════════════════════════════════════════════════════════
// O capítulo
// ═══════════════════════════════════════════════════════════════════════════

export function montaCapitulo(entrada: EntradaDoCapitulo): CapituloSucessorio {
  if (entrada.cenarios.length === 0) throw new Error('Escolha ao menos uma simulação aprovada.');
  if (entrada.cenarios.length > MAXIMO_DE_CENARIOS) {
    throw new Error(`A Organização Sucessória compara até ${MAXIMO_DE_CENARIOS} cenários.`);
  }
  const problemas: ProblemaDoDeck[] = [];
  const p = new Pessoas(entrada);

  const cenarios: CenarioDoCapitulo[] = entrada.cenarios.map((atos, i) => {
    if (atos.length === 0) throw new Error(`O cenário ${i + 1} não tem ato.`);
    const ultimo = atos[atos.length - 1];
    const nome = ultimo.nome?.trim() || `Versão ${ultimo.versao}`;
    const cenario: Tokens = { CEN_NOME: nome };
    const cadeia = atos.length > 1;

    const simulacao = atos.map((a) => paginaDaSimulacao(p, a, cenario));
    const resumoDosAtos = atos.map((a) => atoDoResumo(p, a, cadeia));
    const resumo = planoDoResumo(atos.map((a) => a.gias.length), i === 0).map((plano) => ({
      tokens: cenario,
      plano,
      atos: plano.atos.map((x) => resumoDosAtos[x.ato]),
      primeiroCenario: i === 0,
      // A nota "base de cálculo em 100%" só vale quando a doação saiu toda nela.
      base100: atos.every(doacaoNaBaseDoDeck),
    }));

    const inst = instituicoesDe(ultimo);
    const usufruto = ultimo.comReserva || inst.length > 0
      ? paginaDoUsufruto(p, ultimo, cenario, simulacao[simulacao.length - 1].tokens.SIM_TAB_TIT)
      : null;
    const instituicoes = inst.map((c) =>
      paginaDaInstituicao(p, ultimo, c, cenario, (d, t) => anota(problemas, `${ONDE.instituicao} – "${nome}"`, d, t)));

    return { nome, simulacao, resumo, usufruto, instituicoes };
  });

  // Simulação antiga, com uma base só: usa a que existe e avisa, porque o número não é o do deck.
  entrada.cenarios.forEach((atos, i) => {
    const nome = cenarios[i].nome;
    for (const a of atos) {
      if (!doacaoNaBaseDoDeck(a)) {
        anota(problemas, `${ONDE.resumoDosTributos} – "${nome}"`,
          `A doação de "${a.nome ?? `Versão ${a.versao}`}" foi gravada só em 70% (a simulação é anterior `
          + 'a 24/09/2026): o Resumo dos tributos saiu em 70%, sem a nota de 100%. Gere a simulação de novo '
          + 'na calculadora e aprove.');
      }
    }
    const ultimo = atos[atos.length - 1];
    if (instituicoesDe(ultimo).some((c) => !c.porBase[BASE_DA_INSTITUICAO_NO_TOTAL])) {
      anota(problemas, ONDE.resumoDosCenarios,
        `O total de "${nome}" soma a instituição em 100%, porque a de 70% não foi gravada `
        + '(a simulação é anterior a 24/09/2026). Gere a simulação de novo na calculadora e aprove.');
    }
  });

  // ── Tributação atual: UMA tabela da lei, na UPF do primeiro cenário ──────────
  const primeiro = entrada.cenarios[0][entrada.cenarios[0].length - 1];
  const upf = m(primeiro.upf);
  const mes = mesDa(primeiro.competencia);
  const tributacaoAtual: Tokens = {
    TA_UPF_MES: mes.abreviado,
    TA_UPF_ANO: mes.ano,
    TA_UPF: fmtReais(upf),
  };
  let teto = ZERO;
  FAIXAS.forEach((f, i) => {
    const k = i + 1;
    if (k > 1) tributacaoAtual[`TA_F${k}_PISO`] = fmtReais(teto + 100n);
    const t = tetoDaFaixa(f, upf);
    if (t !== null) {
      tributacaoAtual[`TA_F${k}_TETO`] = fmtReais(t);
      teto = t;
    }
  });
  /* UPF de valor diferente não gera, porque a página tem uma tabela da lei só; mês diferente com a
     mesma UPF passa. A tela recusa antes (`conflitoDeUpf`); isto cobre quem chama a função direto. */
  const atos = entrada.cenarios.flat();
  const valores = new Set(atos.map((a) => fmtReais(m(a.upf))));
  if (valores.size > 1) {
    const porSimulacao = atos.map((a) => `"${a.nome?.trim() || `Versão ${a.versao}`}" (${fmtReais(m(a.upf))}, ${a.competencia})`);
    throw new Error(`As simulações escolhidas usam UPFs diferentes: ${lista(porSimulacao)}. Gere uma nova simulação `
      + 'na Calculadora de ITCMD com a mesma UPF das outras e aprove-a antes de gerar o capítulo.');
  }

  // ── Resumo dos cenários ──────────────────────────────────────────────────────
  const totais = entrada.cenarios.map((atos) =>
    Object.fromEntries(REGUAS.map((r) => [r, atos.reduce((s, a) => s + totalDoAto(a, r), ZERO)])) as PorRegua<Money>);
  const resumoDosCenarios: Tokens = {};
  cenarios.forEach((c, i) => {
    const k = i + 1;
    const maisBarato = cenarios.length > 1 && REGUAS.every((r) =>
      totais.every((t, j) => j === i || totais[i][r] < t[r]));
    resumoDosCenarios[`RC${k}_SELO`] = maisBarato ? 'mais econômico' : '';
    resumoDosCenarios[`RC${k}_NOME`] = c.nome;
    for (const r of REGUAS) {
      const b = SIGLA_DA_REGUA[r];
      resumoDosCenarios[`RC${k}_${b}`] = fmtReais(totais[i][r]);
      resumoDosCenarios[`RC${k}_${b}_VAR`] = i === 0 ? 'base' : variacao(totais[i][r], totais[0][r]);
    }
  });

  if (p.semGenero.size > 0) {
    anota(problemas, ONDE.qualificacao, `Sem gênero no cadastro: ${lista([...p.semGenero].sort())}. O texto saiu sem `
      + '"Sr./Sra.", "filhas" e "donatária" para quem falta. Complete na Qualificação das Partes.');
  }

  return { tributacaoAtual, cenarios, resumoDosCenarios, problemas };
}

/** "+8,3%" · "−7,5%" · "0,0%": a variação sobre o primeiro cenário, uma casa. */
function variacao(valor: Money, base: Money): string {
  if (base === ZERO) return '—';
  const milesimos = divArredondado((valor - base) * 1000n, base);
  const abs = milesimos < 0n ? -milesimos : milesimos;
  const sinal = milesimos > 0n ? '+' : milesimos < 0n ? '−' : '';
  return `${sinal}${abs / 10n},${abs % 10n}%`;
}
