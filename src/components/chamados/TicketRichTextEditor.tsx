import { Fragment, useEffect, useRef } from 'react';
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
  parseTicketRichText,
  serializeTicketRichText,
} from '@/components/chamados/ticketRichTextFormat';

interface TicketRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  disabled?: boolean;
  className?: string;
  invalid?: boolean;
  ariaLabel?: string;
}

// Editor rico compartilhado da plataforma de chamados. Persiste sempre um
// payload marcado (mesmo quando digitado como texto puro), para que o renderer
// tenha um sinal claro entre "veio do editor" e "chamado antigo texto plano".
export function TicketRichTextEditor({
  value,
  onChange,
  placeholder = 'Escreva sua mensagem...',
  minHeight = 'min-h-24',
  maxHeight = 'max-h-72',
  disabled = false,
  className,
  invalid = false,
  ariaLabel,
}: TicketRichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const lastEmitted = useRef(value);

  const editor = useEditor({
    editable: !disabled,
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
    content: parseTicketRichText(value),
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
        class: cn(
          minHeight,
          maxHeight,
          'overflow-y-auto px-3 py-2 text-sm leading-relaxed outline-none',
          '[&_p.is-editor-empty:first-child::before]:pointer-events-none',
          '[&_p.is-editor-empty:first-child::before]:float-left',
          '[&_p.is-editor-empty:first-child::before]:h-0',
          '[&_p.is-editor-empty:first-child::before]:text-muted-foreground',
          '[&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6',
          '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6',
          '[&_p+p]:mt-2',
        ),
      },
    },
    onUpdate: ({ editor: updated }) => {
      const next = serializeTicketRichText(updated.getJSON());
      lastEmitted.current = next;
      onChangeRef.current(next);
    },
  });

  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(parseTicketRichText(value), { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive('bold') ?? false,
      italic: e?.isActive('italic') ?? false,
      underline: e?.isActive('underline') ?? false,
      bulletList: e?.isActive('bulletList') ?? false,
      orderedList: e?.isActive('orderedList') ?? false,
    }),
  });

  const buttons = [
    { key: 'bold', label: 'Negrito (Ctrl+B)', icon: BoldIcon, active: active?.bold, action: () => editor?.chain().focus().toggleBold().run() },
    { key: 'italic', label: 'Itálico (Ctrl+I)', icon: ItalicIcon, active: active?.italic, action: () => editor?.chain().focus().toggleItalic().run() },
    { key: 'underline', label: 'Sublinhado (Ctrl+U)', icon: UnderlineIcon, active: active?.underline, action: () => editor?.chain().focus().toggleUnderline().run() },
    { key: 'bulletList', label: 'Lista com marcadores', icon: BulletListIcon, active: active?.bulletList, action: () => editor?.chain().focus().toggleBulletList().run() },
    { key: 'orderedList', label: 'Lista numerada', icon: ListOrdered, active: active?.orderedList, action: () => editor?.chain().focus().toggleOrderedList().run() },
  ];

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        invalid ? 'border-destructive' : 'border-input',
        disabled && 'opacity-60',
        className,
      )}
    >
      <div className="flex items-center gap-0.5 border-b bg-muted/30 px-2 py-1.5">
        {buttons.map(({ key, label, icon: Icon, active: isActive, action }, index) => (
          <Fragment key={key}>
            {index === 3 && <span className="mx-1 h-5 w-px bg-border" aria-hidden />}
            <button
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={isActive}
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
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
