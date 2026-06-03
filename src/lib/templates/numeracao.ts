// Numeração automática dos blocos compostos, a partir do tipo + ordem.
// Roda DEPOIS do filtro de flags (composition) e ANTES do render: assim a
// numeração reflete os blocos que de fato entraram no documento — incluir ou
// retirar uma cláusula condicional nunca quebra a sequência.

import { ordinalExtenso, romano } from './extenso';
import type { Bloco } from './types';

/** "décimo quinto" → "Décimo Quinto" (rótulo de parágrafo). */
function capitalizarPalavras(texto: string): string {
  return texto.replace(/\S+/g, (p) => p[0].toUpperCase() + p.slice(1));
}

/**
 * Prefixa cada bloco com seu rótulo de numeração, conforme o tipo:
 * - capitulo:  "CAPÍTULO {romano}" + título na linha seguinte (contador próprio)
 * - clausula:  "CLÁUSULA {ORDINAL FEMININO}:" (contínua — não reseta por capítulo)
 * - paragrafo: agrupa a sequência consecutiva sob a cláusula anterior;
 *              1 só → "Parágrafo Único:"; 2+ → "Parágrafo {Ordinal Masculino}:"
 * - livre (ou sem tipo): passa intacto
 */
export function numerarBlocos(blocos: Bloco[]): Bloco[] {
  let nCapitulo = 0;
  let nClausula = 0;

  return blocos.map((bloco, i) => {
    switch (bloco.tipo) {
      case 'capitulo': {
        nCapitulo += 1;
        return { ...bloco, conteudo: `CAPÍTULO ${romano(nCapitulo)}\n${bloco.conteudo}` };
      }
      case 'clausula': {
        nClausula += 1;
        return { ...bloco, conteudo: `CLÁUSULA ${ordinalExtenso(nClausula, 'f').toUpperCase()}: ${bloco.conteudo}` };
      }
      case 'paragrafo': {
        // Posição dentro da sequência consecutiva de parágrafos e tamanho dela.
        let inicio = i;
        while (inicio > 0 && blocos[inicio - 1].tipo === 'paragrafo') inicio -= 1;
        let fim = i;
        while (fim < blocos.length - 1 && blocos[fim + 1].tipo === 'paragrafo') fim += 1;

        const rotulo =
          fim === inicio
            ? 'Parágrafo Único'
            : `Parágrafo ${capitalizarPalavras(ordinalExtenso(i - inicio + 1, 'm'))}`;
        return { ...bloco, conteudo: `${rotulo}: ${bloco.conteudo}` };
      }
      default:
        return bloco;
    }
  });
}

/**
 * Une os conteúdos em texto final: parágrafo cola na cláusula anterior com
 * quebra simples; os demais blocos separam-se com linha em branco.
 */
export function unirBlocos(blocos: Bloco[]): string {
  return blocos
    .map((bloco, i) => {
      const conteudo = bloco.conteudo.trim();
      if (i === 0) return conteudo;
      return (bloco.tipo === 'paragrafo' ? '\n' : '\n\n') + conteudo;
    })
    .join('');
}
