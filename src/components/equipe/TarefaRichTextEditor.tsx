import { Fragment, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import Code from '@tiptap/extension-code';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
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
  Braces,
  Code as CodeIcon,
  Italic as ItalicIcon,
  List as BulletListIcon,
  ListOrdered,
  Underline as UnderlineIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { markdownParaConteudo, pareceMarkdown } from '@/lib/markdownTarefa';
import { LINGUAGENS_CODIGO, lowlight } from '@/lib/tarefaLowlight';
import { parseTarefaRichText, serializeTarefaRichText } from '@/lib/tarefaRichText';

interface TarefaRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Cresce para ocupar a altura do container (usado no modo tela cheia do modal). */
  fillHeight?: boolean;
  minHeight?: string;
  maxHeight?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

// Editor rico da descrição de tarefa/entregável. Além do básico (negrito, listas),
// tem bloco de código com realce por linguagem: digitar ```sql (ou ```json etc.)
// seguido de espaço/Enter já abre o bloco na linguagem certa.
export function TarefaRichTextEditor({
  value,
  onChange,
  placeholder = 'Contexto, critérios de aceite, links... Use ```sql para um bloco de código.',
  fillHeight = false,
  minHeight = 'min-h-[120px]',
  maxHeight,
  disabled = false,
  className,
  ariaLabel,
}: TarefaRichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const lastEmitted = useRef(value);
  // handlePaste é montado uma vez com o editor; a ref dá acesso a ele lá dentro.
  const editorRef = useRef<Editor | null>(null);

  const editor = useEditor({
    editable: !disabled,
    extensions: [
      Document,
      Paragraph,
      Text,
      Bold,
      Italic,
      Underline,
      Code,
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: 'plaintext' }),
      BulletList,
      OrderedList,
      ListItem,
      ListKeymap,
      UndoRedo,
      Placeholder.configure({ placeholder }),
    ],
    content: parseTarefaRichText(value),
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
        class: cn('px-3 py-2 text-sm leading-relaxed outline-none', fillHeight && 'min-h-full'),
      },
      // Markdown colado (```sql, listas, **negrito**) vira formatação de verdade.
      // Só intervém em texto puro que parece markdown: colagem de conteúdo já
      // formatado (text/html) e colagem dentro de bloco de código seguem o padrão.
      handlePaste: (view, event) => {
        const clipboard = event.clipboardData;
        if (!clipboard || clipboard.types.includes('text/html')) return false;
        if (view.state.selection.$from.parent.type.name === 'codeBlock') return false;
        const texto = clipboard.getData('text/plain');
        if (!texto || !pareceMarkdown(texto)) return false;
        const conteudo = markdownParaConteudo(texto);
        if (conteudo.length === 0) return false;
        editorRef.current?.commands.insertContent(conteudo);
        return true;
      },
    },
    onUpdate: ({ editor: updated }) => {
      const next = serializeTarefaRichText(updated.getJSON());
      lastEmitted.current = next;
      onChangeRef.current(next);
    },
  });

  editorRef.current = editor;

  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(parseTarefaRichText(value), { emitUpdate: false });
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
      code: e?.isActive('code') ?? false,
      codeBlock: e?.isActive('codeBlock') ?? false,
      language: (e?.getAttributes('codeBlock').language as string | null) ?? 'plaintext',
    }),
  });

  const buttons = [
    {
      key: 'bold',
      label: 'Negrito (Ctrl+B)',
      icon: BoldIcon,
      active: active?.bold,
      action: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      key: 'italic',
      label: 'Itálico (Ctrl+I)',
      icon: ItalicIcon,
      active: active?.italic,
      action: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      key: 'underline',
      label: 'Sublinhado (Ctrl+U)',
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
    {
      key: 'code',
      label: 'Código na linha (Ctrl+E)',
      icon: CodeIcon,
      active: active?.code,
      action: () => editor?.chain().focus().toggleCode().run(),
    },
    {
      key: 'codeBlock',
      label: 'Bloco de código (```sql, ```json…)',
      icon: Braces,
      active: active?.codeBlock,
      action: () => editor?.chain().focus().toggleCodeBlock().run(),
    },
  ];

  return (
    <div
      className={cn(
        'tarefa-richtext flex flex-col overflow-hidden rounded-md border border-input bg-background',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        disabled && 'opacity-60',
        fillHeight && 'min-h-0 flex-1',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 px-2 py-1.5">
        {buttons.map(({ key, label, icon: Icon, active: isActive, action }, index) => (
          <Fragment key={key}>
            {(index === 3 || index === 5) && <span className="mx-1 h-5 w-px bg-border" aria-hidden />}
            <button
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={isActive}
              disabled={disabled}
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

        {active?.codeBlock && (
          <>
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            {/* <select> nativo de propósito: dentro do modal ele não rouba o foco
                do editor como um popover faria. */}
            <select
              aria-label="Linguagem do bloco de código"
              value={active.language ?? 'plaintext'}
              disabled={disabled}
              onChange={(event) =>
                editor
                  ?.chain()
                  .focus()
                  .updateAttributes('codeBlock', { language: event.target.value })
                  .run()
              }
              className="h-7 rounded border border-input bg-background px-1.5 text-xs text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
            >
              {LINGUAGENS_CODIGO.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <div
        className={cn(
          'overflow-y-auto',
          fillHeight ? 'min-h-0 flex-1' : cn(minHeight, maxHeight),
        )}
      >
        <EditorContent editor={editor} className={fillHeight ? 'h-full' : undefined} />
      </div>
    </div>
  );
}
