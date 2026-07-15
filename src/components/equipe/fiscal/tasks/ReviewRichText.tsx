import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import type { JSONContent } from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import Document from '@tiptap/extension-document';
import Italic from '@tiptap/extension-italic';
import { BulletList, ListItem, ListKeymap, OrderedList } from '@tiptap/extension-list';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Underline from '@tiptap/extension-underline';
import { Placeholder, UndoRedo } from '@tiptap/extensions';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  List as BulletListIcon,
  ListOrdered,
  Underline as UnderlineIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  parseReviewRichTextDocument,
  REVIEW_RICH_TEXT_MARKER,
} from '@/components/equipe/fiscal/tasks/reviewRichTextFormat';

interface ReviewRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}

export function ReviewRichTextEditor({
  value,
  onChange,
  placeholder,
  autoFocus = false,
}: ReviewRichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const lastEmitted = useRef(value);

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Bold,
      Italic,
      Underline,
      BulletList,
      OrderedList,
      ListItem,
      ListKeymap,
      UndoRedo,
      Placeholder.configure({ placeholder }),
    ],
    content: parseReviewRichTextDocument(value),
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        class: cn(
          'min-h-36 max-h-72 overflow-y-auto px-3 py-2 text-sm leading-relaxed outline-none',
          '[&_p.is-editor-empty:first-child::before]:pointer-events-none',
          '[&_p.is-editor-empty:first-child::before]:float-left',
          '[&_p.is-editor-empty:first-child::before]:h-0',
          '[&_p.is-editor-empty:first-child::before]:text-muted-foreground',
          '[&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6',
          '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6',
        ),
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      const nextValue = JSON.stringify(updatedEditor.getJSON());
      lastEmitted.current = nextValue;
      onChangeRef.current(nextValue);
    },
  });

  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(parseReviewRichTextDocument(value), { emitUpdate: false });
  }, [editor, value]);

  const active = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      bold: currentEditor?.isActive('bold') ?? false,
      italic: currentEditor?.isActive('italic') ?? false,
      underline: currentEditor?.isActive('underline') ?? false,
      bulletList: currentEditor?.isActive('bulletList') ?? false,
      orderedList: currentEditor?.isActive('orderedList') ?? false,
    }),
  });

  const buttons = [
    {
      key: 'bold',
      label: 'Negrito',
      icon: BoldIcon,
      active: active?.bold,
      action: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      key: 'italic',
      label: 'Itálico',
      icon: ItalicIcon,
      active: active?.italic,
      action: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      key: 'underline',
      label: 'Sublinhado',
      icon: UnderlineIcon,
      active: active?.underline,
      action: () => editor?.chain().focus().toggleUnderline().run(),
    },
    {
      key: 'bulletList',
      label: 'Lista com marcadores',
      icon: BulletListIcon,
      active: active?.bulletList,
      action: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      key: 'orderedList',
      label: 'Lista numerada',
      icon: ListOrdered,
      active: active?.orderedList,
      action: () => editor?.chain().focus().toggleOrderedList().run(),
    },
  ];

  return (
    <div className="overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <div className="flex items-center gap-0.5 border-b bg-muted/30 px-2 py-1.5">
        {buttons.map(({ key, label, icon: Icon, active: isActive, action }, index) => (
          <Fragment key={key}>
            {index === 3 && <span className="mx-1 h-5 w-px bg-border" aria-hidden />}
            <button
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={isActive}
              onMouseDown={(event) => event.preventDefault()}
              onClick={action}
              className={cn(
                'rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                isActive && 'bg-muted text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          </Fragment>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function renderNode(node: JSONContent, key: string): ReactNode {
  const children = node.content?.map((child, index) => renderNode(child, `${key}-${index}`));

  if (node.type === 'text') {
    let content: ReactNode = node.text || '';
    for (const mark of node.marks || []) {
      if (mark.type === 'bold') content = <strong>{content}</strong>;
      if (mark.type === 'italic') content = <em>{content}</em>;
      if (mark.type === 'underline') content = <u>{content}</u>;
    }
    return <Fragment key={key}>{content}</Fragment>;
  }
  if (node.type === 'paragraph') return <p key={key}>{children?.length ? children : <br />}</p>;
  if (node.type === 'bulletList')
    return (
      <ul key={key} className="my-1 list-disc pl-5">
        {children}
      </ul>
    );
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

export function ReviewRichTextContent({ value }: { value: string }) {
  if (!value.startsWith(REVIEW_RICH_TEXT_MARKER)) {
    return <>{value}</>;
  }

  const document = parseReviewRichTextDocument(value.slice(REVIEW_RICH_TEXT_MARKER.length));
  return <div className="space-y-1">{renderNode(document, 'review-doc')}</div>;
}
