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
 *
 * ## Este arquivo tambem e importado pelo FRONT
 *
 * `useContagemDeSlides` usa a `paginasDoQuadro` para dizer na tela quantos slides
 * o deck vai ter. Por isso ele nao pode ganhar import de nada — nem de modulo
 * OOXML, nem de API so do Deno: e o unico arquivo de Edge Function que entra no
 * bundle do Vite. Conta pura, sem dependencia, de proposito.
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
