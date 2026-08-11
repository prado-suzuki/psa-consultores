// Numeração automática dos blocos compostos, a partir do tipo + ordem.
// Roda DEPOIS do filtro de flags (composition) e da expansão de repetidores
// (repetidor.ts) e ANTES do render: assim a numeração reflete os blocos que de
// fato entraram no documento — incluir ou retirar uma cláusula condicional (ou
// variar o nº de instâncias de um repetidor) nunca quebra a sequência.

import { ordinalExtenso, romano } from './extenso';
import type { Bloco } from './types';

/** "décimo quinto" → "Décimo Quinto" (rótulo de parágrafo). */
function capitalizarPalavras(texto: string): string {
  return texto.replace(/\S+/g, (p) => p[0].toUpperCase() + p.slice(1));
}

/** Posição estrutural de um bloco na composição (null para livre/sem tipo). */
type EstruturaBloco =
  | { tipo: 'capitulo' | 'clausula'; n: number }
  | { tipo: 'paragrafo'; n: number; unico: boolean }
  | null;

/**
 * A passada estrutural única que sustenta os três formatos de saída (prefixo de
 * conteúdo, chip da UI e referência textual):
 * - capitulo: contador próprio
 * - clausula: contínua — não reseta por capítulo
 * - paragrafo: posição dentro da sequência consecutiva sob a cláusula anterior
 *   (1 só → "único"; o contador reseta a cada interrupção da sequência)
 */
function estruturar(blocos: Bloco[]): EstruturaBloco[] {
  let nCapitulo = 0;
  let nClausula = 0;

  return blocos.map((bloco, i) => {
    switch (bloco.tipo) {
      case 'capitulo':
        return { tipo: 'capitulo', n: ++nCapitulo };
      case 'clausula':
        return { tipo: 'clausula', n: ++nClausula };
      case 'paragrafo': {
        let inicio = i;
        while (inicio > 0 && blocos[inicio - 1].tipo === 'paragrafo') inicio -= 1;
        let fim = i;
        while (fim < blocos.length - 1 && blocos[fim + 1].tipo === 'paragrafo') fim += 1;
        return { tipo: 'paragrafo', n: i - inicio + 1, unico: fim === inicio };
      }
      default:
        return null;
    }
  });
}

/**
 * O PREFIXO de numeração de cada bloco, exatamente como entra no conteúdo:
 * - capitulo:  "*CAPÍTULO {romano}*\n"
 * - clausula:  "*CLÁUSULA {ORDINAL FEMININO}:* "
 * - paragrafo: "*Parágrafo Único:* " ou "*Parágrafo {Ordinal Masculino}:* "
 * - livre (ou sem tipo): "" (passa intacto)
 *
 * Os rótulos saem envolvidos na marca de negrito (*…* — ver marcas.ts), então
 * ficam em negrito por padrão na prévia e no .docx, sem etapa extra.
 *
 * Existe separado de `numerarBlocos` porque a geração precisa aplicar o rótulo
 * DEPOIS do render (o descarte de blocos vazios muda a sequência), colando-o no
 * primeiro segmento em vez de na string de origem — ver index.ts.
 */
export function prefixosNumeracao(blocos: Bloco[]): string[] {
  return estruturar(blocos).map((e) => {
    switch (e?.tipo) {
      case 'capitulo':
        return `*CAPÍTULO ${romano(e.n)}*\n`;
      case 'clausula':
        return `*CLÁUSULA ${ordinalExtenso(e.n, 'f').toUpperCase()}:* `;
      case 'paragrafo': {
        const rotulo = e.unico ? 'Parágrafo Único' : `Parágrafo ${capitalizarPalavras(ordinalExtenso(e.n, 'm'))}`;
        return `*${rotulo}:* `;
      }
      default:
        return '';
    }
  });
}

/** Prefixa cada bloco com seu rótulo de numeração (ver prefixosNumeracao). */
export function numerarBlocos(blocos: Bloco[]): Bloco[] {
  return prefixosNumeracao(blocos).map((prefixo, i) =>
    prefixo ? { ...blocos[i], conteudo: `${prefixo}${blocos[i].conteudo}` } : blocos[i],
  );
}

/**
 * Calcula apenas o RÓTULO de numeração de cada bloco (sem mexer no conteúdo),
 * seguindo a mesma regra de `numerarBlocos`. Usado pela UI da Montagem para
 * exibir o chip "CAPÍTULO I" / "CLÁUSULA 1ª" / "Parágrafo Único" em cada bloco
 * sem duplicar a lógica. Blocos livres (ou sem tipo) devolvem `null`.
 */
export function rotulosNumeracao(blocos: Bloco[]): (string | null)[] {
  return estruturar(blocos).map((e) => {
    switch (e?.tipo) {
      case 'capitulo':
        return `CAPÍTULO ${romano(e.n)}`;
      case 'clausula':
        return `CLÁUSULA ${ordinalExtenso(e.n, 'f').toUpperCase()}`;
      case 'paragrafo':
        return e.unico ? 'Parágrafo Único' : `Parágrafo ${capitalizarPalavras(ordinalExtenso(e.n, 'm'))}`;
      default:
        return null;
    }
  });
}

/**
 * A forma TEXTUAL de referência a cada bloco, como aparece no meio da prosa
 * jurídica ("arrolados no parágrafo segundo desta cláusula", "observado o
 * disposto na Cláusula Quinta"). É o que a composição publica em {{ refs.* }}
 * e carimba como {{ ref }} nos itens de bloco repetidor (ver index.ts) — a
 * numeração citada num texto sai da MESMA passada que numera o documento,
 * nunca de cálculo paralelo no mapeador de dados.
 */
export function refsNumeracao(blocos: Bloco[]): (string | null)[] {
  return estruturar(blocos).map((e) => {
    switch (e?.tipo) {
      case 'capitulo':
        return `Capítulo ${romano(e.n)}`;
      case 'clausula':
        return `Cláusula ${capitalizarPalavras(ordinalExtenso(e.n, 'f'))}`;
      case 'paragrafo':
        return e.unico ? 'parágrafo único' : `parágrafo ${ordinalExtenso(e.n, 'm')}`;
      default:
        return null;
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
