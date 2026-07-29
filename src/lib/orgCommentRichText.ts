import type { JSONContent } from '@tiptap/core';

/**
 * Formato do corpo dos comentários de tarefa/projeto.
 *
 * `org_comments.body` é uma coluna `text` e continua sendo: o comentário rico
 * entra como marcador + JSON do documento TipTap, seguindo a convenção já usada
 * em revisão de tarefa e em chamados. Nada muda no banco — nem coluna, nem RPC.
 *
 * A thread lê três formas de corpo:
 *
 * 1. **rico** — `[[org-comment-rich-text:v1]]{"type":"doc",...}`, o que o editor grava hoje;
 * 2. **revisão** — `[[review-rich-text:v1]]{...}`, gravado pelo fluxo de revisão
 *    da tarefa (com um prefixo em texto antes, tratado por quem monta o evento);
 * 3. **texto** — todo comentário anterior a este editor, em texto plano, com a
 *    menção no formato de token `@[Nome](uuid)`.
 *
 * A menção continua sendo um nó do documento, e o uuid continua indo à parte no
 * `_mentions` da RPC: o token só sobrevive como forma de leitura do legado e
 * como texto de cópia do chip (`renderText`).
 */

export const MARCADOR_RICH_TEXT = '[[org-comment-rich-text:v1]]';

/**
 * Marcador do fluxo de revisão. Duplicado de propósito: quem grava é
 * `src/components/equipe/fiscal/tasks/reviewRichTextFormat.ts`, e esta camada
 * (lib, sem React) não deve depender de uma pasta de componente para conseguir
 * ler o corpo que chega na thread.
 */
export const MARCADOR_REVISAO = '[[review-rich-text:v1]]';

/** Nome do nó de menção no schema do editor. Fica aqui para a extensão e o formato concordarem. */
export const NO_DE_MENCAO = 'mencaoUsuario';

export const DOC_VAZIO: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };

const TOKEN_DE_MENCAO = /@\[([^\]]+)\]\(([^)]+)\)/g;

export type CorpoDeComentario =
  | { formato: 'rich'; doc: JSONContent }
  | { formato: 'texto'; texto: string };

function parseDoc(payload: string): JSONContent | null {
  try {
    const parsed: unknown = JSON.parse(payload);
    if (parsed && typeof parsed === 'object' && (parsed as JSONContent).type === 'doc') {
      return parsed as JSONContent;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Descobre em qual das três formas o corpo está.
 *
 * Marcador com JSON quebrado cai para texto em vez de estourar: comentário
 * antigo ou corrompido continua legível na thread.
 */
export function lerCorpo(body: string): CorpoDeComentario {
  for (const marcador of [MARCADOR_RICH_TEXT, MARCADOR_REVISAO]) {
    if (!body.startsWith(marcador)) continue;
    const payload = body.slice(marcador.length);
    const doc = parseDoc(payload);
    return doc ? { formato: 'rich', doc } : { formato: 'texto', texto: payload };
  }
  return { formato: 'texto', texto: body };
}

/** Documento → corpo gravado. */
export function serializarDoc(doc: JSONContent): string {
  return `${MARCADOR_RICH_TEXT}${JSON.stringify(doc)}`;
}

function percorrer(node: JSONContent, visitar: (node: JSONContent) => void) {
  visitar(node);
  for (const filho of node.content ?? []) percorrer(filho, visitar);
}

/** Uuids mencionados no documento, sem repetir, na ordem de leitura. */
export function mencoesDoDoc(doc: JSONContent): string[] {
  const ids: string[] = [];
  percorrer(doc, (node) => {
    if (node.type !== NO_DE_MENCAO) return;
    const id = typeof node.attrs?.id === 'string' ? node.attrs.id : '';
    if (id && !ids.includes(id)) ids.push(id);
  });
  return ids;
}

/**
 * Texto plano do documento — é o que alimenta resumo de auditoria e qualquer
 * lugar que precise do comentário sem marcação. A menção volta como `@Nome`.
 */
export function textoPlanoDoDoc(doc: JSONContent): string {
  const blocos: string[] = [];
  let linha = '';

  const fecharLinha = () => {
    if (linha.trim()) blocos.push(linha.trim());
    linha = '';
  };

  const visitar = (node: JSONContent) => {
    if (node.type === 'text') {
      linha += node.text ?? '';
      return;
    }
    if (node.type === NO_DE_MENCAO) {
      linha += `@${node.attrs?.label ?? ''}`;
      return;
    }
    if (node.type === 'hardBreak') {
      fecharLinha();
      return;
    }
    const ehBloco = node.type === 'paragraph' || node.type === 'listItem';
    for (const filho of node.content ?? []) visitar(filho);
    if (ehBloco) fecharLinha();
  };

  visitar(doc);
  fecharLinha();
  return blocos.join('\n');
}

/** Texto plano de qualquer uma das formas de corpo (rico, revisão ou legado). */
export function textoPlanoDoCorpo(body: string): string {
  const corpo = lerCorpo(body);
  return corpo.formato === 'rich'
    ? textoPlanoDoDoc(corpo.doc)
    : corpo.texto.replace(TOKEN_DE_MENCAO, (_token, label: string) => `@${label}`);
}

/** Documento vazio é o que desabilita o Publicar (parágrafo sem texto conta como vazio). */
export function docEstaVazio(doc: JSONContent): boolean {
  if (mencoesDoDoc(doc).length > 0) return false;
  return !textoPlanoDoDoc(doc).trim();
}

/**
 * Texto legado → documento, com os tokens `@[Nome](uuid)` virando nós de menção.
 * É o que permite reabrir um comentário antigo no editor sem perder as menções
 * nem expor uuid na tela.
 */
export function docDeTextoLegado(texto: string): JSONContent {
  const paragrafos = texto.split('\n').map<JSONContent>((linha) => {
    const inline: JSONContent[] = [];
    let cursor = 0;

    for (const match of linha.matchAll(TOKEN_DE_MENCAO)) {
      const inicio = match.index ?? 0;
      if (inicio > cursor) inline.push({ type: 'text', text: linha.slice(cursor, inicio) });
      inline.push({ type: NO_DE_MENCAO, attrs: { id: match[2], label: match[1] } });
      cursor = inicio + match[0].length;
    }
    if (cursor < linha.length) inline.push({ type: 'text', text: linha.slice(cursor) });

    return inline.length > 0 ? { type: 'paragraph', content: inline } : { type: 'paragraph' };
  });

  return { type: 'doc', content: paragrafos.length > 0 ? paragrafos : DOC_VAZIO.content };
}

/** Documento de partida do editor para um corpo gravado em qualquer das formas. */
export function docDoCorpo(body: string): JSONContent {
  if (!body) return DOC_VAZIO;
  const corpo = lerCorpo(body);
  return corpo.formato === 'rich' ? corpo.doc : docDeTextoLegado(corpo.texto);
}
