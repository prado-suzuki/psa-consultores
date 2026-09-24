/**
 * A aritmetica das paginas (quadro societario, capitulo 04, outros bens), em EMU do molde e com folga
 * para nunca sobrepor. O front importa este arquivo, entao ele nao pode ter import nenhum.
 */

/** Onde a primeira tabela comeca, medido do topo do slide. 1,55". */
export const QUADRO_TOP_0 = 1417320;
/** Ate onde pode ir sem invadir o rodape. 7,1". */
export const QUADRO_TOP_MAX = 6492240;
/** Altura de uma linha. ~0,32", super-estimada para nao sobrepor. */
export const QUADRO_ROW_H = 292608;
/** Respiro entre tabelas empilhadas. ~0,40". */
export const QUADRO_PAD_H = 365760;

/**
 * Altura de uma tabela com `rowCount` socios.
 *
 * As tres linhas fixas sao o cabecalho da empresa, o cabecalho das colunas e o
 * TOTAL. Elas entram mesmo quando a tabela e um pedaco de empresa partida: o
 * TOTAL some so no pedaco intermediario, e quem calcula espaco nao pode contar
 * com isso — reservar a mais e seguro, reservar a menos sobrepoe.
 */
export function estimarAltura(rowCount: number): number {
  return (3 + rowCount) * QUADRO_ROW_H + QUADRO_PAD_H;
}

/**
 * Quantas linhas de socio cabem numa coluna que comeca em `top`.
 *
 * E a inversa da `estimarAltura`, e existe para a tabela poder ser PARTIDA. Antes
 * o gerador so sabia responder "cabe inteira ou nao cabe", e "nao cabe" virava
 * adiamento eterno.
 *
 * Zero significa que nem os tres cabecalhos cabem — a pagina esta cheia, e o que
 * falta vai inteiro para a proxima.
 */
export function cabemQuantasLinhas(top: number): number {
  const disponivel = QUADRO_TOP_MAX - top - QUADRO_PAD_H;
  return Math.max(0, Math.floor(disponivel / QUADRO_ROW_H) - 3);
}

/**
 * Reparte as linhas de uma empresa entre a pagina atual e o que sobra.
 *
 * `resto` vazio quer dizer que coube inteira — e e o caso em que o pedaco leva a
 * linha de TOTAL. Quando sobra, o pedaco desenhado e intermediario e sai sem
 * total, senao cada pagina exibiria o total da empresa inteira e um "100%" fixo,
 * e nenhuma fecharia com as proprias linhas.
 */
export function repartirLinhas<T>(
  linhas: readonly T[], top: number,
): { aqui: T[]; resto: T[] } {
  if (top + estimarAltura(linhas.length) <= QUADRO_TOP_MAX) {
    return { aqui: [...linhas], resto: [] };
  }
  const cabem = cabemQuantasLinhas(top);
  if (cabem <= 0) return { aqui: [], resto: [...linhas] };
  return { aqui: linhas.slice(0, cabem), resto: linhas.slice(cabem) };
}

/**
 * O que sobra depois de encher UMA pagina de quadro.
 *
 * Espelha o `renderQuadroSlide` do gerador contando linhas em vez de desenhar
 * tabela: uma empresa sozinha ocupa a coluna central; duas ou mais empilham em
 * duas colunas, e a primeira que nao couber e partida — o pedaco que sobra volta
 * para a frente da fila, com as empresas seguintes atras, preservando a ordem.
 */
function encherUmaPagina(socios: readonly number[]): number[] {
  const validas = socios.filter((n) => n > 0);
  if (validas.length === 0) return [];

  const sobraDe = (n: number, top: number): number[] => {
    const { aqui, resto } = repartirLinhas(Array.from({ length: n }), top);
    if (aqui.length === 0) return [n]; // nem os cabecalhos cabem: vai inteira
    return resto.length === 0 ? [] : [resto.length];
  };

  if (validas.length === 1) return sobraDe(validas[0], QUADRO_TOP_0);

  const tops = [QUADRO_TOP_0, QUADRO_TOP_0];
  for (let i = 0; i < validas.length; i++) {
    const col = i % 2;
    const h = estimarAltura(validas[i]);
    if (tops[col] + h <= QUADRO_TOP_MAX) {
      tops[col] += h;
      continue;
    }
    return [...sobraDe(validas[i], tops[col]), ...validas.slice(i + 1)];
  }
  return [];
}

/**
 * Quantas paginas o quadro societario vai ocupar, dado o numero de socios de
 * cada empresa.
 *
 * ## Por que a tela precisa disto
 *
 * A Biblioteca promete ao consultor quantos slides o deck vai ter, e prometia
 * **2** para a societaria: organograma + quadro, como se o quadro fosse sempre uma
 * pagina. Um cliente de teste com 41 socios recebia 7 slides. O numero era o piso
 * apresentado como exato, e quem lia decidia sem saber.
 *
 * Reproduzir a conta aqui, no modulo que o gerador ja usa, e o unico jeito de a
 * tela nao voltar a mentir: uma copia no front divergiria no primeiro ajuste de
 * molde, e divergiria em silencio.
 *
 * A guarda de progresso e a mesma do gerador — para quando uma volta deixa de
 * reduzir o que falta, em vez de confiar num teto de paginas. O gerador, nesse
 * caso, emite aviso e entrega o deck; aqui o numero fica no que foi possivel
 * paginar, que e exatamente o que vai sair.
 */
export function paginasDoQuadro(socios: readonly number[]): number {
  let restantes = socios.filter((n) => n > 0);
  if (restantes.length === 0) return 0;

  const soma = (ns: readonly number[]) => ns.reduce((t, n) => t + n, 0);
  let paginas = 0;
  let antes = Infinity;
  while (restantes.length > 0) {
    paginas++;
    restantes = encherUmaPagina(restantes);
    const agora = soma(restantes);
    if (agora >= antes) break; // nao avancou
    antes = agora;
  }
  return paginas;
}

// ---------------------------------------------------------------------------
// Capitulo 04 — Organizacao sucessoria
// ---------------------------------------------------------------------------
// So estrutura (atos, guias, instituicoes), nunca texto. As medidas sao as do molde, em polegadas,
// tiradas do montar-cap04.ts: mudou o molde, muda aqui.

/** O Resumo dos cenarios tem tres vagas; o capitulo aceita ate tres cenarios. */
export const MAXIMO_DE_CENARIOS = 3;

/** As paginas fixas: capa, aspectos legais, testamento x doacao e as duas de tributacao. */
const PAGINAS_DA_FRENTE = 5;
/** Resumo dos cenarios e reforma tributaria. */
const PAGINAS_DO_FIM = 2;

/** O Resumo dos tributos (slide 7 do molde). */
const RESUMO = {
  /** Onde a introducao comeca. */
  topo: 1.55,
  /** A introducao longa (primeiro cenario) ocupa quatro linhas; a curta, uma. */
  introLonga: 0.85,
  introCurta: 0.30,
  /** O rotulo "Doacao de Regina para a Cristina:", so quando o cenario e cadeia. */
  rotulo: 0.30,
  /** Cartao: cabecalho 0,28 + total, aliquota e subtitulo 0,25 cada + TOTAL 0,28. */
  cartaoFixo: 0.28 + 0.25 * 3 + 0.28,
  /** Duas linhas por guia: a base e o ITCD. */
  cartaoPorGuia: 0.5,
  vao: 0.15,
  /** O painel ATENCAO nasce em 5,60": acima dele, 5,50. */
  limiteComNotas: 5.5,
  /** O rodape comeca em 7,0": 6,85 deixa a margem. */
  limite: 6.85,
} as const;

export interface PosicaoDoAto {
  /** Indice do ato na cadeia. */
  ato: number;
  /** Topo do rotulo; `null` quando o cenario tem um ato so e nao ha rotulo. */
  yRotulo: number | null;
  /** Topo dos tres cartoes. */
  yCartoes: number;
}

export interface PaginaDoResumoPlano {
  /** So a primeira pagina do cenario tem a introducao. */
  comIntro: boolean;
  /** So a primeira pagina do PRIMEIRO cenario tem o painel ATENCAO. */
  comNotas: boolean;
  atos: PosicaoDoAto[];
}

/**
 * Distribui os atos de um cenario pelas paginas do Resumo dos tributos; o que nao cabe vai para uma
 * continuacao sem introducao. Se nem o primeiro cabe, a primeira pagina fica so com a introducao.
 */
export function planoDoResumo(guiasPorAto: readonly number[], primeiroCenario: boolean): PaginaDoResumoPlano[] {
  const cadeia = guiasPorAto.length > 1;
  const paginas: PaginaDoResumoPlano[] = [];

  let pagina: PaginaDoResumoPlano = { comIntro: true, comNotas: primeiroCenario, atos: [] };
  let y = RESUMO.topo + (primeiroCenario ? RESUMO.introLonga : RESUMO.introCurta) + 0.1;
  let limite = primeiroCenario ? RESUMO.limiteComNotas : RESUMO.limite;

  const novaPagina = () => {
    paginas.push(pagina);
    pagina = { comIntro: false, comNotas: false, atos: [] };
    y = RESUMO.topo;
    limite = RESUMO.limite;
  };

  guiasPorAto.forEach((guias, ato) => {
    const altura = (cadeia ? RESUMO.rotulo : 0) + RESUMO.cartaoFixo + RESUMO.cartaoPorGuia * guias;
    if (y + altura > limite && (pagina.atos.length > 0 || pagina.comIntro)) novaPagina();
    pagina.atos.push({
      ato,
      yRotulo: cadeia ? y : null,
      yCartoes: y + (cadeia ? RESUMO.rotulo : 0),
    });
    y += altura + RESUMO.vao;
  });
  paginas.push(pagina);
  return paginas;
}

/** O que a paginacao le de um ato: o ato do servidor e a `SimulacaoSalva` da tela tem esta forma. */
export interface AtoParaPaginar {
  comReserva: boolean;
  gias: readonly unknown[];
  concessoes: readonly { origem: string }[];
}

/** O que a paginacao precisa saber de um cenario — estrutura, e nada de texto. */
interface EstruturaDoCenario {
  /** Quantas guias de doacao cada ato tem, na ordem da cadeia. */
  guiasPorAto: number[];
  /** O ultimo ato tem reserva ou instituicao: ha pagina de usufruto. */
  temUsufruto: boolean;
  /** Guias de instituicao do ultimo ato: uma pagina de tributacao cada. */
  instituicoes: number;
}

function estruturaDoCenario(atos: readonly AtoParaPaginar[]): EstruturaDoCenario {
  const ultimo = atos[atos.length - 1];
  const instituicoes = ultimo ? ultimo.concessoes.filter((c) => c.origem === 'instituicao').length : 0;
  return {
    guiasPorAto: atos.map((a) => a.gias.length),
    temUsufruto: !!ultimo && (ultimo.comReserva || instituicoes > 0),
    instituicoes,
  };
}

/** As paginas de um cenario: uma Simulacao por ato, o Resumo, o Usufruto e uma Tributacao por instituicao. */
function paginasDoCenario(estrutura: EstruturaDoCenario, primeiroCenario: boolean): number {
  return estrutura.guiasPorAto.length
    + planoDoResumo(estrutura.guiasPorAto, primeiroCenario).length
    + (estrutura.temUsufruto ? 1 : 0)
    + estrutura.instituicoes;
}

/** Quantos slides o capitulo 04 inteiro tem, com os cenarios escolhidos. Zero sem cenario. */
export function slidesDoCapitulo04(cenarios: readonly (readonly AtoParaPaginar[])[]): number {
  if (cenarios.length === 0) return 0;
  return PAGINAS_DA_FRENTE
    + cenarios.reduce((s, atos, i) => s + paginasDoCenario(estruturaDoCenario(atos), i === 0), 0)
    + PAGINAS_DO_FIM;
}

// ═══════════════════════════════════════════════════════════════════════════
// Capitulo 01 · Outros bens integralizados
// ═══════════════════════════════════════════════════════════════════════════

/** Linhas por pagina da tabela de outros bens, uma por bem, como o teto da de imoveis; o TOTAL vai na ultima. */
export const LINHAS_POR_PAGINA_DE_OUTROS_BENS = 9;

/** Quantas paginas a tabela de outros bens ocupa. Zero bem, zero pagina: ela sai do deck. */
export function paginasDeOutrosBens(bens: number): number {
  return Math.ceil(Math.max(0, bens) / LINHAS_POR_PAGINA_DE_OUTROS_BENS);
}
