import type { JSONContent } from '@tiptap/core';

export const REVIEW_RICH_TEXT_MARKER = '[[review-rich-text:v1]]';

const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };

export function parseReviewRichTextDocument(value: string): JSONContent {
  if (!value) return EMPTY_DOC;
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && 'type' in parsed && parsed.type === 'doc') {
      return parsed as JSONContent;
    }
  } catch {
    return {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }],
    };
  }
  return EMPTY_DOC;
}

export function serializeReviewRichText(value: string): string {
  return `${REVIEW_RICH_TEXT_MARKER}${value}`;
}

export function isReviewRichTextEmpty(value: string): boolean {
  const collectText = (node: JSONContent): string => {
    if (node.type === 'text') return node.text || '';
    return node.content?.map(collectText).join(' ') || '';
  };
  return !collectText(parseReviewRichTextDocument(value)).trim();
}
