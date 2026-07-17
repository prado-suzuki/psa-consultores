import type { JSONContent } from '@tiptap/core';

// Formato seguro de rich text para chamados (descrição de ticket e mensagens).
// A coluna continua sendo `text`; quando o conteúdo vem do editor, a string é
// prefixada por TICKET_RICH_TEXT_MARKER + JSON serializado do documento TipTap.
// Conteúdos antigos (sem marcador) permanecem como texto plano — o renderer
// detecta e cai no fallback `whitespace-pre-wrap`.

export const TICKET_RICH_TEXT_MARKER = '[[ticket-rich-text:v1]]';

const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };

export function hasTicketRichTextMarker(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(TICKET_RICH_TEXT_MARKER);
}

/** Extrai o documento TipTap embutido; se `value` não tem marcador, devolve doc vazio. */
export function parseTicketRichText(value: string | null | undefined): JSONContent {
  if (!hasTicketRichTextMarker(value)) return EMPTY_DOC;
  try {
    const raw = (value as string).slice(TICKET_RICH_TEXT_MARKER.length);
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && (parsed as { type?: string }).type === 'doc') {
      return parsed as JSONContent;
    }
  } catch {
    // fallthrough
  }
  return EMPTY_DOC;
}

/** Converte um documento TipTap (JSON) em string persistível. */
export function serializeTicketRichText(doc: JSONContent): string {
  return `${TICKET_RICH_TEXT_MARKER}${JSON.stringify(doc)}`;
}

function collectText(node: JSONContent): string {
  if (node.type === 'text') return node.text || '';
  const children = node.content?.map(collectText).join(node.type === 'paragraph' ? '' : ' ') || '';
  // Adiciona quebra ao fim de blocos de nível parágrafo para previews legíveis.
  if (node.type === 'paragraph' || node.type === 'listItem') return `${children}\n`;
  return children;
}

/** Texto plano do valor — funciona tanto para valor marcado quanto para texto antigo. */
export function ticketRichTextToPlain(value: string | null | undefined): string {
  if (!value) return '';
  if (!hasTicketRichTextMarker(value)) return value;
  return collectText(parseTicketRichText(value)).replace(/\n+$/g, '').trim();
}

export function isTicketRichTextEmpty(value: string | null | undefined): boolean {
  return ticketRichTextToPlain(value).trim().length === 0;
}
