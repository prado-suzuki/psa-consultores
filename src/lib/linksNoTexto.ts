/**
 * Links colados no corpo de um comentário.
 *
 * O link é achado na LEITURA, e não gravado como marca pelo editor: assim vale
 * também para toda fala escrita antes disto, e o corpo gravado continua sendo o
 * texto que a pessoa colou.
 */

export type ParteDoTexto =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'link'; href: string; rotulo: string; original: string };

const URL_NO_TEXTO = /\b(?:https?:\/\/|www\.)[^\s<>"]+/gi;

/** Pontuação que fecha a frase, e não a URL: "veja https://x.com." */
const PONTUACAO_FINAL = /[.,;:!?'"]+$/;

/** Maior rótulo antes de encurtar. A URL inteira continua no `title`. */
const ROTULO_MAXIMO = 48;

/**
 * Tira do fim o que é da frase. O `)` só sai quando não abre dentro da URL:
 * "(ver https://x.com/a)" perde o parêntese, e o link da Wikipédia que termina
 * em `_(desambiguação)` fica inteiro.
 */
function aparar(candidato: string): string {
  let url = candidato;
  for (;;) {
    const semPontuacao = url.replace(PONTUACAO_FINAL, '');
    const abre = (semPontuacao.match(/\(/g) ?? []).length;
    const fecha = (semPontuacao.match(/\)/g) ?? []).length;
    const semParentese =
      semPontuacao.endsWith(')') && fecha > abre ? semPontuacao.slice(0, -1) : semPontuacao;
    if (semParentese === url) return url;
    url = semParentese;
  }
}

/** O que se lê no link: sem protocolo, sem `www.` e sem a barra solta do fim. */
export function rotuloDoLink(url: string): string {
  const limpo = url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
  return limpo.length > ROTULO_MAXIMO ? `${limpo.slice(0, ROTULO_MAXIMO - 1)}…` : limpo;
}

/** O texto em pedaços, com cada URL virando uma parte `link`. */
export function partesDoTexto(texto: string): ParteDoTexto[] {
  const partes: ParteDoTexto[] = [];
  let cursor = 0;

  for (const achado of texto.matchAll(URL_NO_TEXTO)) {
    const inicio = achado.index ?? 0;
    const original = aparar(achado[0]);
    if (!original.includes('.')) continue;

    if (inicio > cursor) partes.push({ tipo: 'texto', texto: texto.slice(cursor, inicio) });
    const href = /^https?:\/\//i.test(original) ? original : `https://${original}`;
    partes.push({ tipo: 'link', href, rotulo: rotuloDoLink(original), original });
    cursor = inicio + original.length;
  }

  if (cursor < texto.length) partes.push({ tipo: 'texto', texto: texto.slice(cursor) });
  return partes;
}
