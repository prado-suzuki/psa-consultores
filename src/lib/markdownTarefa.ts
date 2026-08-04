import type { JSONContent } from '@tiptap/core';

// Conversão de markdown colado para o documento do editor de tarefas.
// O TipTap 3.26 tem a API de spec de markdown, mas não um parser de string
// pronto no core — então convertemos aqui, cobrindo exatamente o que o editor
// suporta: parágrafos, listas, bloco de código com linguagem, negrito, itálico
// e código na linha. Cabeçalho (#) vira parágrafo em negrito, que é o mais
// próximo que o editor tem. Listas aninhadas são achatadas em um nível.

const FENCE_ABRE = /^\s*(```|~~~)\s*([a-zA-Z0-9_+#-]*)\s*$/;
const ITEM_MARCADOR = /^\s*[-*+]\s+(.*)$/;
const ITEM_NUMERADO = /^\s*\d+[.)]\s+(.*)$/;
const CABECALHO = /^\s*#{1,6}\s+(.*)$/;

/** Heurística de "isso aí é markdown": só então vale intervir na colagem. */
export function pareceMarkdown(texto: string): boolean {
  if (!texto) return false;
  return [
    /^\s*(```|~~~)/m,
    ITEM_MARCADOR,
    ITEM_NUMERADO,
    CABECALHO,
    /\*\*[^*\n]+\*\*/,
    /__[^_\n]+__/,
    /`[^`\n]+`/,
  ].some((padrao) => padrao.test(texto));
}

type MarcaInline = 'bold' | 'italic' | 'code';

interface PadraoInline {
  regex: RegExp;
  marca: MarcaInline;
  /** Conteúdo literal (não reprocessa marcas dentro). */
  literal?: boolean;
}

// Ordem importa: código na linha primeiro (o que está entre crases é literal) e
// negrito antes de itálico, senão `**x**` casaria como itálico duas vezes.
// O `_` só marca quando não está dentro de uma palavra (regra do CommonMark).
// Sem isso, `checklist_item_padrao` fora de crases viraria itálico e perderia os
// underscores — que é justamente o tipo de texto que estas descrições têm.
const PADROES_INLINE: PadraoInline[] = [
  { regex: /`([^`\n]+)`/, marca: 'code', literal: true },
  { regex: /\*\*([^*\n]+)\*\*/, marca: 'bold' },
  { regex: /(?<![\w])__([^_\n]+)__(?![\w])/, marca: 'bold' },
  { regex: /\*([^*\n]+)\*/, marca: 'italic' },
  { regex: /(?<![\w])_([^_\n]+)_(?![\w])/, marca: 'italic' },
];

function comMarca(nos: JSONContent[], marca: MarcaInline): JSONContent[] {
  return nos.map((no) => {
    // A marca `code` do TipTap tem `excludes: '_'`: não convive com nenhuma
    // outra. Texto já marcado como código fica só com ela.
    if (marca !== 'code' && no.marks?.some((existente) => existente.type === 'code')) return no;
    return { ...no, marks: [...(no.marks ?? []), { type: marca }] };
  });
}

function texto(valor: string): JSONContent[] {
  return valor.length > 0 ? [{ type: 'text', text: valor }] : [];
}

/** Quebra uma linha em nós de texto com marcas (negrito, itálico, código). */
export function parseInline(linha: string): JSONContent[] {
  let primeiro: { indice: number; padrao: PadraoInline; match: RegExpMatchArray } | null = null;
  for (const padrao of PADROES_INLINE) {
    const match = linha.match(padrao.regex);
    if (match?.index === undefined) continue;
    if (!primeiro || match.index < primeiro.indice) {
      primeiro = { indice: match.index, padrao, match };
    }
  }
  if (!primeiro) return texto(linha);

  const { indice, padrao, match } = primeiro;
  const conteudo = match[1];
  const marcado = padrao.literal
    ? comMarca(texto(conteudo), padrao.marca)
    : comMarca(parseInline(conteudo), padrao.marca);
  return [
    ...texto(linha.slice(0, indice)),
    ...marcado,
    ...parseInline(linha.slice(indice + match[0].length)),
  ];
}

function paragrafo(linha: string): JSONContent {
  const conteudo = parseInline(linha);
  return conteudo.length > 0 ? { type: 'paragraph', content: conteudo } : { type: 'paragraph' };
}

function itemDeLista(linha: string): { texto: string; ordenada: boolean } | null {
  const numerado = linha.match(ITEM_NUMERADO);
  if (numerado) return { texto: numerado[1], ordenada: true };
  const marcador = linha.match(ITEM_MARCADOR);
  if (marcador) return { texto: marcador[1], ordenada: false };
  return null;
}

/** Converte markdown em blocos prontos para `insertContent`. */
export function markdownParaConteudo(entrada: string): JSONContent[] {
  const linhas = entrada.replace(/\r\n/g, '\n').split('\n');
  const blocos: JSONContent[] = [];
  let i = 0;

  while (i < linhas.length) {
    const linha = linhas[i];

    const abertura = linha.match(FENCE_ABRE);
    if (abertura) {
      const cerca = abertura[1];
      const linguagem = abertura[2] || null;
      const corpo: string[] = [];
      i += 1;
      while (i < linhas.length && !new RegExp(`^\\s*${cerca}\\s*$`).test(linhas[i])) {
        corpo.push(linhas[i]);
        i += 1;
      }
      // Cerca sem fechamento: o resto do texto ainda vira bloco, não some.
      i += 1;
      const codigo = corpo.join('\n');
      blocos.push({
        type: 'codeBlock',
        attrs: { language: linguagem },
        ...(codigo.length > 0 ? { content: [{ type: 'text', text: codigo }] } : {}),
      });
      continue;
    }

    const item = itemDeLista(linha);
    if (item) {
      const ordenada = item.ordenada;
      const itens: JSONContent[] = [];
      while (i < linhas.length) {
        const atual = itemDeLista(linhas[i]);
        if (!atual || atual.ordenada !== ordenada) break;
        itens.push({ type: 'listItem', content: [paragrafo(atual.texto)] });
        i += 1;
      }
      blocos.push({ type: ordenada ? 'orderedList' : 'bulletList', content: itens });
      continue;
    }

    const cabecalho = linha.match(CABECALHO);
    if (cabecalho) {
      // Sem nó de heading no editor: vira parágrafo em negrito.
      blocos.push({
        type: 'paragraph',
        content: comMarca(parseInline(cabecalho[1]), 'bold'),
      });
      i += 1;
      continue;
    }

    if (linha.trim().length === 0) {
      i += 1;
      continue;
    }

    blocos.push(paragrafo(linha));
    i += 1;
  }

  return blocos;
}
