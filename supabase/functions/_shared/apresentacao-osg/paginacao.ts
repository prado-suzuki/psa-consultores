/**
 * A aritmetica que decide quantas linhas do quadro societario cabem numa pagina.
 *
 * ## Por que mora aqui e nao no gerador
 *
 * Isto e conta pura, e era o unico pedaco da montagem sem teste possivel: vivia
 * dentro do `gerar-apresentacao/index.ts`, que importa os modulos OOXML e por isso
 * nem o `deno check` alcanca sozinho. Em `_shared` o vitest roda em cima.
 *
 * E precisa de teste porque foi onde o deck perdeu dado. Ate 21/09/2026 a
 * paginacao nao sabia PARTIR uma empresa: quem nao coubesse numa pagina era adiado
 * para a proxima, do mesmo tamanho, onde tambem nao cabia. Uma holding com 42
 * socios era adiada para sempre, e um teto de 20 voltas no laco escondia o
 * sintoma produzindo slides vazios. O deck saia com 17 de 41 socios.
 *
 * ## O molde
 *
 * As medidas sao EMU (914.400 por polegada) e vem do template `.pptx`. A altura
 * por linha e super-estimada de proposito, para nunca sobrepor: e melhor sobrar
 * espaco em branco do que uma tabela invadir a de baixo.
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
