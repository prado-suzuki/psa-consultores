import { Fragment, type ReactNode } from 'react';
import type { JSONContent } from '@tiptap/core';
import { cn } from '@/lib/utils';
import {
  hasTicketRichTextMarker,
  parseTicketRichText,
} from '@/components/chamados/ticketRichTextFormat';

interface TicketRichTextViewProps {
  value: string | null | undefined;
  className?: string;
  /** Placeholder exibido quando não há conteúdo. */
  emptyFallback?: ReactNode;
}

function renderNode(node: JSONContent, key: string): ReactNode {
  const children = node.content?.map((child, i) => renderNode(child, `${key}-${i}`));

  if (node.type === 'text') {
    let content: ReactNode = node.text || '';
    for (const mark of node.marks || []) {
      if (mark.type === 'bold') content = <strong>{content}</strong>;
      else if (mark.type === 'italic') content = <em>{content}</em>;
      else if (mark.type === 'underline') content = <u>{content}</u>;
    }
    return <Fragment key={key}>{content}</Fragment>;
  }
  if (node.type === 'paragraph') {
    return (
      <p key={key} className="whitespace-pre-wrap break-words">
        {children?.length ? children : <br />}
      </p>
    );
  }
  if (node.type === 'bulletList') {
    return (
      <ul key={key} className="my-1 list-disc pl-5">
        {children}
      </ul>
    );
  }
  if (node.type === 'orderedList') {
    const start = typeof node.attrs?.start === 'number' ? node.attrs.start : undefined;
    return (
      <ol key={key} start={start} className="my-1 list-decimal pl-5">
        {children}
      </ol>
    );
  }
  if (node.type === 'listItem') return <li key={key}>{children}</li>;
  if (node.type === 'hardBreak') return <br key={key} />;
  if (node.type === 'doc') return <Fragment key={key}>{children}</Fragment>;
  return null;
}

// Renderer read-only. Conteúdo marcado -> árvore React (sem dangerouslySetInnerHTML).
// Conteúdo legado (texto plano) -> preserva quebras de linha com whitespace-pre-wrap.
export function TicketRichTextView({ value, className, emptyFallback = null }: TicketRichTextViewProps) {
  if (!value || value.trim() === '') return <>{emptyFallback}</>;

  if (!hasTicketRichTextMarker(value)) {
    return (
      <div className={cn('whitespace-pre-wrap break-words', className)}>{value}</div>
    );
  }

  const doc = parseTicketRichText(value);
  return (
    <div
      className={cn(
        'space-y-1 break-words',
        '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
        className,
      )}
    >
      {renderNode(doc, 'ticket-rt')}
    </div>
  );
}
