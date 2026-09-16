// Numeração automática dos blocos compostos, a partir do tipo + ordem.
// Roda DEPOIS do filtro de flags (composition) e da expansão de repetidores
// (repetidor.ts) e ANTES do render: assim a numeração reflete os blocos que de
// fato entraram no documento — incluir ou retirar uma cláusula condicional (ou
// variar o nº de instâncias de um repetidor) nunca quebra a sequência.

import { letraAlinea, ordinalExtenso, romano } from './extenso';
import type { Bloco } from './types';

/** "décimo quinto" → "Décimo Quinto" (rótulo de parágrafo). */
function capitalizarPalavras(texto: string): string {
  return texto.replace(/\S+/g, (p) => p[0].toUpperCase() + p.slice(1));
}

/** Posição estrutural de um bloco na composição (null para livre/sem tipo). */
type EstruturaBloco =
  | { tipo: 'capitulo'; n: number }
  | { tipo: 'clausula'; n: number; titulo?: string }
  /** `nClausula` entra porque o item se escreve "2.1": cláusula ponto ordem. */
  | { tipo: 'item'; n: number; nClausula: number }
  /** "1.1.1": cláusula, item e ordem. */
  | { tipo: 'subitem'; n: number; nClausula: number; nItem: number }
  | { tipo: 'alinea' | 'inciso'; n: number }
  | { tipo: 'paragrafo'; n: number; unico: boolean }
  | null;

/**
 * A passada estrutural única que sustenta os três formatos de saída (prefixo de
 * conteúdo, chip da UI e referência textual):
 * - capitulo: contador próprio
 * - clausula: contínua — não reseta por capítulo
 * - paragrafo: posição dentro da sequência consecutiva sob a cláusula anterior
 *   (1 só → "único"; o contador reseta a cada interrupção da sequência)
 * - item: posição sob a CLÁUSULA corrente, reiniciando em 1 a cada cláusula
 *   nova. Diferente do parágrafo de propósito: a numeração decimal do Acordo
 *   continua contando mesmo que outro tipo se intrometa no meio, porque "2.7"
 *   depende da cláusula, e não de a sequência ter sido ininterrupta.
 * - subitem: um nível abaixo, "1.1.1"; reinicia a cada item novo
 * - alinea/inciso: listas rotuladas dentro de um item ou de uma cláusula;
 *   reiniciam quando qualquer um dos dois começa. São dois tipos e não um
 *   porque o modelo usa os dois com sentidos diferentes: os Considerandos e as
 *   faixas de dívida saem em letra, e as hipóteses de aumento de capital saem
 *   em romano, "(I) Se aprovado em REUNIÃO DE SÓCIOS…".
 */
function estruturar(blocos: Bloco[]): EstruturaBloco[] {
  let nCapitulo = 0;
  let nClausula = 0;
  let nItem = 0;
  let nSubitem = 0;
  let nRotulada = 0;

  return blocos.map((bloco, i) => {
    if (bloco.reiniciaNumeracao) {
      nCapitulo = 0;
      nClausula = 0;
      nItem = 0;
      nSubitem = 0;
      nRotulada = 0;
    }

    switch (bloco.tipo) {
      case 'capitulo':
        return { tipo: 'capitulo', n: ++nCapitulo };
      case 'clausula':
        nItem = 0;
        nSubitem = 0;
        nRotulada = 0;
        return { tipo: 'clausula', n: ++nClausula, titulo: bloco.tituloDocumento };
      case 'item':
        nSubitem = 0;
        nRotulada = 0;
        return { tipo: 'item', n: ++nItem, nClausula };
      case 'subitem':
        return { tipo: 'subitem', n: ++nSubitem, nClausula, nItem };
      case 'alinea':
        return { tipo: 'alinea', n: ++nRotulada };
      case 'inciso':
        return { tipo: 'inciso', n: ++nRotulada };
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
        /*
         * COM TÍTULO, O SEPARADOR É TRAVESSÃO; SEM, DOIS-PONTOS.
         *
         * "CLÁUSULA PRIMEIRA – Definições das expressões utilizadas neste
         * ACORDO." é o Acordo; "CLÁUSULA PRIMEIRA:" é o contrato social. Os dois
         * saem daqui, e quem escolhe é a existência do título, não uma opção do
         * modelo: bloco sem título continua com o comportamento de sempre.
         */
        return e.titulo
          ? `*CLÁUSULA ${ordinalExtenso(e.n, 'f').toUpperCase()} – ${e.titulo}*\n`
          : `*CLÁUSULA ${ordinalExtenso(e.n, 'f').toUpperCase()}:* `;
      case 'item':
        return `${e.nClausula}.${e.n} `;
      case 'subitem':
        return `${e.nClausula}.${e.nItem}.${e.n} `;
      case 'alinea':
        return `${letraAlinea(e.n)}) `;
      case 'inciso':
        return `(${romano(e.n)}) `;
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
      case 'item':
        return `${e.nClausula}.${e.n}`;
      case 'subitem':
        return `${e.nClausula}.${e.nItem}.${e.n}`;
      case 'alinea':
        return `${letraAlinea(e.n)})`;
      case 'inciso':
        return `(${romano(e.n)})`;
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
      /*
       * "item 5.5", que é como o Acordo se cita: sete ocorrências no modelo. O
       * parágrafo se cita por extenso e o item por número, porque é assim que
       * cada documento faz.
       */
      case 'item':
        return `item ${e.nClausula}.${e.n}`;
      case 'subitem':
        return `item ${e.nClausula}.${e.nItem}.${e.n}`;
      case 'alinea':
        return `alínea "${letraAlinea(e.n)}"`;
      case 'inciso':
        return `inciso (${romano(e.n)})`;
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
