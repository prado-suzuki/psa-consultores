import type { JSONContent } from '@tiptap/core';
import type { Marcas } from './marcas';

// Serialização entre a STRING de origem dos modelos (placeholders {{ }} +
// marcas *negrito*/_itálico_/~sublinhado~ de marcas.ts) e o documento JSON do
// editor TipTap (parágrafo = linha; inline = text com marks + chips atômicos).
//
// Funções PURAS, sem DOM: o contrato de round-trip é testado em editorDoc.test.ts.
// A string continua sendo o modelo persistido — o editor é só uma vista.
//
// Limitação herdada (igual ao pipeline): a gramática não tem escape, então um
// delimitador literal isolado digitado pelo usuário pode parear com outro na
// mesma linha e virar formatação no próximo parse.

/** Variável {{ nome }}, abertura de seção {{#nome attr="v"}} ou fechamento {{/nome}}. */
export const TOKEN_COMPLETO =
  /\{\{\s*((?:#[\w.]+(?:\s+\w+="(?:[^"\\]|\\.)*")*)|\/[\w.]+|[\w.]+)\s*\}\}/g;

/** Delimitador isolado — mesma regra de marcas.ts (TOKEN_MARCA não é exportado de lá). */
const DELIM_ISOLADO = /(?<!\*)\*(?!\*)|(?<!_)_(?!_)|(?<!~)~(?!~)/g;

// Sentinela (Private Use Area) usado para mascarar os spans dos tokens antes da
// extração de marcas: nunca é delimitador nem '\n', e mantém os índices 1:1.
const SENTINELA = '\uE000';

type Delimitador = '*' | '_' | '~';

const ESTILO_DO_DELIM: Record<Delimitador, keyof Marcas> = {
  '*': 'negrito',
  '_': 'italico',
  '~': 'sublinhado',
};

/** Ordem canônica de emissão dos delimitadores (estável para o round-trip). */
const ORDEM_MARKS: Array<{ estilo: keyof Marcas; delim: Delimitador; mark: string }> = [
  { estilo: 'negrito', delim: '*', mark: 'bold' },
  { estilo: 'italico', delim: '_', mark: 'italic' },
  { estilo: 'sublinhado', delim: '~', mark: 'underline' },
];

interface TokenSpan {
  inicio: number;
  fim: number;
  source: string;
  nome: string;
}

/** Rótulo do chip: "nome", "#secao" ou "/secao" (atributos ficam só no source). */
export function nomeDoToken(miolo: string): string {
  return miolo.split(/\s/)[0];
}

function tokensDaLinha(linha: string): TokenSpan[] {
  const out: TokenSpan[] = [];
  const re = new RegExp(TOKEN_COMPLETO.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(linha)) !== null) {
    out.push({ inicio: m.index, fim: m.index + m[0].length, source: m[0], nome: nomeDoToken(m[1]) });
  }
  return out;
}

function mascarar(linha: string, tokens: TokenSpan[]): string {
  if (tokens.length === 0) return linha;
  let out = '';
  let cursor = 0;
  for (const t of tokens) {
    out += linha.slice(cursor, t.inicio) + SENTINELA.repeat(t.fim - t.inicio);
    cursor = t.fim;
  }
  return out + linha.slice(cursor);
}

interface SegmentoMarcado extends Marcas {
  inicio: number;
  fim: number;
}

/**
 * Variante de extrairRunsLinha (marcas.ts) que preserva os ÍNDICES originais de
 * cada trecho entre delimitadores pareados — necessária para intercalar os chips
 * de volta na posição certa. A paridade com marcas.ts é garantida por teste.
 */
export function segmentosLinha(linha: string): SegmentoMarcado[] {
  // Pareamento por delimitador: ímpar → o último vira literal (regra de marcas.ts).
  const todos: Array<{ delim: Delimitador; indice: number }> = [];
  for (const m of linha.matchAll(DELIM_ISOLADO)) {
    todos.push({ delim: m[0] as Delimitador, indice: m.index! });
  }
  const porDelim = new Map<Delimitador, number[]>();
  for (const t of todos) {
    if (!porDelim.has(t.delim)) porDelim.set(t.delim, []);
    porDelim.get(t.delim)!.push(t.indice);
  }
  const validos = new Set<number>();
  for (const indices of porDelim.values()) {
    const pares = indices.length % 2 === 0 ? indices : indices.slice(0, -1);
    for (const i of pares) validos.add(i);
  }
  const tokens = todos.filter((t) => validos.has(t.indice));

  const segs: SegmentoMarcado[] = [];
  const estado: Marcas = { negrito: false, italico: false, sublinhado: false };
  let cursor = 0;
  for (const t of tokens) {
    if (t.indice > cursor) segs.push({ inicio: cursor, fim: t.indice, ...estado });
    cursor = t.indice + 1;
    estado[ESTILO_DO_DELIM[t.delim]] = !estado[ESTILO_DO_DELIM[t.delim]];
  }
  if (cursor < linha.length) segs.push({ inicio: cursor, fim: linha.length, ...estado });
  return segs;
}

function marksDe(seg: Marcas): JSONContent['marks'] | undefined {
  const marks = ORDEM_MARKS.filter(({ estilo }) => seg[estilo]).map(({ mark }) => ({ type: mark }));
  return marks.length > 0 ? marks : undefined;
}

export function chipJSON(source: string, nome: string, marks?: JSONContent['marks']): JSONContent {
  return { type: 'placeholderChip', attrs: { source, nome }, ...(marks ? { marks } : {}) };
}

function linhaParaInline(linha: string): JSONContent[] {
  const tokens = tokensDaLinha(linha);
  // Extrai as marcas com os tokens MASCARADOS: a semântica de pares continua
  // por linha inteira (um * antes de um chip pareia com o * depois dele) e
  // delimitadores dentro de token (ex.: sep="a_b") nunca viram formatação.
  const mascarada = mascarar(linha, tokens);
  const inline: JSONContent[] = [];

  for (const seg of segmentosLinha(mascarada)) {
    const marks = marksDe(seg);
    let pos = seg.inicio;
    // Tokens nunca cruzam fronteira de segmento (delimitadores pareados não
    // existem dentro do span mascarado), então cada um cai inteiro num segmento.
    for (const t of tokens) {
      if (t.fim <= seg.inicio || t.inicio >= seg.fim) continue;
      if (t.inicio > pos) {
        inline.push({ type: 'text', text: linha.slice(pos, t.inicio), ...(marks ? { marks } : {}) });
      }
      inline.push(chipJSON(t.source, t.nome, marks));
      pos = t.fim;
    }
    if (pos < seg.fim) {
      inline.push({ type: 'text', text: linha.slice(pos, seg.fim), ...(marks ? { marks } : {}) });
    }
  }
  return inline;
}

/** String de origem → documento TipTap (1 linha = 1 parágrafo). */
export function stringParaDoc(source: string): JSONContent {
  const paragrafos = source.split('\n').map((linha) => {
    const inline = linhaParaInline(linha);
    return inline.length > 0 ? { type: 'paragraph', content: inline } : { type: 'paragraph' };
  });
  return { type: 'doc', content: paragrafos };
}

function nomesDeMarks(no: JSONContent): Set<string> {
  return new Set((no.marks ?? []).map((m) => (typeof m === 'string' ? m : m.type)));
}

/**
 * Documento TipTap → string de origem. Emite delimitadores só no DELTA de marks
 * em cada fronteira (ordem canônica) e fecha os abertos no fim da linha — par
 * sempre balanceado por linha, como marcas.ts exige. Chips emitem o source
 * verbatim e participam do estado de marks (chip em negrito → *{{ x }}*).
 */
export function docParaString(doc: JSONContent): string {
  const linhas = (doc.content ?? []).map((par) => {
    let out = '';
    const estado: Record<string, boolean> = { bold: false, italic: false, underline: false };
    for (const no of par.content ?? []) {
      const desejado = nomesDeMarks(no);
      for (const { delim, mark } of ORDEM_MARKS) {
        if (desejado.has(mark) !== estado[mark]) {
          out += delim;
          estado[mark] = !estado[mark];
        }
      }
      if (no.type === 'placeholderChip') out += (no.attrs?.source as string) ?? '';
      else if (no.type === 'text') out += no.text ?? '';
    }
    for (const { delim, mark } of ORDEM_MARKS) {
      if (estado[mark]) out += delim;
    }
    return out;
  });
  return linhas.join('\n');
}
