import { Fragment, type ReactNode } from 'react';
import type { JSONContent } from '@tiptap/core';
import { cn } from '@/lib/utils';
import { hasTarefaRichTextDoc, parseTarefaRichText } from '@/lib/tarefaRichText';

interface TarefaRichTextViewProps {
  value: string | null | undefined;
  className?: string;
}

function renderNode(node: JSONContent, key: string): ReactNode {
  const children = node.content?.map((child, index) => renderNode(child, `${key}-${index}`));

  if (node.type === 'text') {
    let content: ReactNode = node.text || '';
    for (const mark of node.marks || []) {
      if (mark.type === 'bold') content = <strong>{content}</strong>;
      else if (mark.type === 'italic') content = <em>{content}</em>;
      else if (mark.type === 'underline') content = <u>{content}</u>;
      else if (mark.type === 'code') {
        content = <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{content}</code>;
      }
    }
    return <Fragment key={key}>{content}</Fragment>;
  }
  if (node.type === 'paragraph') {
    return <p key={key} className="whitespace-pre-wrap break-words">{children?.length ? children : <br />}</p>;
  }
  if (node.type === 'bulletList') return <ul key={key} className="my-1 list-disc pl-5">{children}</ul>;
  if (node.type === 'orderedList') {
    const start = typeof node.attrs?.start === 'number' ? node.attrs.start : undefined;
    return <ol key={key} start={start} className="my-1 list-decimal pl-5">{children}</ol>;
  }
  if (node.type === 'listItem') return <li key={key}>{children}</li>;
  if (node.type === 'codeBlock') {
    // Sem realce de sintaxe na leitura: o texto do bloco basta e evita carregar o lowlight.
    return (
      <pre key={key} className="my-2 overflow-x-auto rounded-md bg-gray-900 p-3 text-xs text-gray-50">
        <code>{children}</code>
      </pre>
    );
  }
  if (node.type === 'hardBreak') return <br key={key} />;
  if (node.type === 'dailyTaskReference') {
    return (
      <a
        key={key}
        href={String(node.attrs?.href ?? '')}
        title={`Abrir tarefa: ${String(node.attrs?.title ?? '')}`}
        className="daily-task-reference"
      >
        [{String(node.attrs?.code ?? '')}]
      </a>
    );
  }
  if (node.type === 'doc') return <Fragment key={key}>{children}</Fragment>;
  return null;
}

/**
 * Leitura do rich text de tarefa/daily: documento marcado vira árvore React (sem
 * dangerouslySetInnerHTML). Valor sem marcador é texto plano, com as quebras preservadas.
 * Descrição de tarefa nascida de chamado delegado chega com o marcador de chamado
 * e cai no mesmo caminho, porque `parseTarefaRichText` abre os dois.
 */
export function TarefaRichTextView({ value, className }: TarefaRichTextViewProps) {
  if (!value || value.trim() === '') return null;
  if (!hasTarefaRichTextDoc(value)) {
    return <div className={cn('whitespace-pre-wrap break-words', className)}>{value}</div>;
  }
  return (
    <div className={cn('break-words', className)}>{renderNode(parseTarefaRichText(value), 'tarefa-rt')}</div>
  );
}
