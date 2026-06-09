import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import { Placeholder, UndoRedo } from '@tiptap/extensions';
import { exitSuggestion, type SuggestionProps } from '@tiptap/suggestion';
import { Bold as BoldIcon, Italic as ItalicIcon, Table as TableIcon, Underline as UnderlineIcon } from 'lucide-react';
import type { JSONContent } from '@tiptap/core';
import { cn } from '@/lib/utils';
import type { PlaceholderSugerido } from '@/lib/templates/binding';
import { docParaString, stringParaDoc } from '@/lib/templates/editorDoc';
import { PlaceholderChip } from './extensions/PlaceholderChip';
import { SUGESTAO_PLUGIN_KEY, SugestaoPlaceholders } from './extensions/sugestaoPlaceholders';

// Editor de conteúdo de modelos (TipTap): WYSIWYG de verdade — negrito/itálico/
// sublinhado renderizados (sem delimitadores visíveis) e placeholders {{ }}
// como chips atômicos.
//
// O modelo de dados continua sendo a STRING de origem (prop `value`): cada
// edição serializa o doc de volta via docParaString (marcas *_~ + tokens), e o
// pipeline downstream (prévia, .docx, extrairCampos) não muda.
//
// Comportamentos-chave (implementados nas extensions):
// - Backspace/Delete encostado num chip degrada para texto literal menos um
//   caractere ({{ nome }} → "{{ nome }"), editável; completar o token reconverte.
// - Digitar {{ abre o autocomplete de variáveis (dropdown abaixo).

interface EstadoSugestao {
  items: PlaceholderSugerido[];
  command: (item: PlaceholderSugerido) => void;
  x: number;
  y: number;
}

export interface EditorConteudoModeloProps {
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  /** Altura mínima da área de edição (qualquer unidade CSS). */
  minHeight?: string;
  maxHeight?: string;
  className?: string;
}

export function EditorConteudoModelo({
  value,
  onChange,
  placeholder,
  minHeight = '11rem',
  maxHeight,
  className,
}: EditorConteudoModeloProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const ultimoEmitido = useRef(value);

  const [sug, setSug] = useState<EstadoSugestao | null>(null);
  const [sel, setSel] = useState(0);
  const sugRef = useRef<EstadoSugestao | null>(null);
  const selRef = useRef(0);
  const itemSelRef = useRef<HTMLButtonElement>(null);

  const atualizarSugestao = (props: SuggestionProps<PlaceholderSugerido, PlaceholderSugerido>) => {
    const rect = props.clientRect?.();
    const cont = containerRef.current?.getBoundingClientRect();
    const estado: EstadoSugestao = {
      items: props.items,
      command: props.command,
      x: rect && cont ? rect.left - cont.left : 8,
      y: rect && cont ? rect.bottom - cont.top + 4 : 8,
    };
    sugRef.current = estado;
    selRef.current = 0;
    setSug(estado);
    setSel(0);
  };

  const fecharSugestao = () => {
    sugRef.current = null;
    setSug(null);
  };

  const moverSel = (delta: number) => {
    const n = sugRef.current?.items.length ?? 0;
    if (n === 0) return;
    selRef.current = (selRef.current + delta + n) % n;
    setSel(selRef.current);
  };

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Bold,
      Italic,
      Underline,
      UndoRedo,
      Placeholder.configure({ placeholder: placeholder ?? '' }),
      PlaceholderChip,
      SugestaoPlaceholders.configure({
        render: () => ({
          onStart: atualizarSugestao,
          onUpdate: atualizarSugestao,
          onExit: fecharSugestao,
          onKeyDown: ({ view, event }) => {
            const estado = sugRef.current;
            if (!estado || estado.items.length === 0) return false;
            if (event.key === 'ArrowDown') {
              moverSel(1);
              return true;
            }
            if (event.key === 'ArrowUp') {
              moverSel(-1);
              return true;
            }
            if (event.key === 'Tab' || event.key === 'Enter') {
              estado.command(estado.items[selRef.current]);
              return true;
            }
            if (event.key === 'Escape') {
              fecharSugestao();
              exitSuggestion(view, SUGESTAO_PLUGIN_KEY);
              return true;
            }
            return false;
          },
        }),
      }),
    ],
    content: stringParaDoc(value),
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        spellcheck: 'false',
        class: cn(
          'w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed',
          'whitespace-pre-wrap break-words outline-none ring-offset-background',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className,
        ),
      },
      // Cola como texto puro parseado pelo nosso formato: tokens viram chips e
      // marcas *_~ viram formatação de verdade.
      handlePaste: (_view, event) => {
        const texto = event.clipboardData?.getData('text/plain');
        if (!texto || !editorRef.current) return false;
        event.preventDefault();
        const paragrafos = stringParaDoc(texto).content ?? [];
        const conteudo = paragrafos.length === 1 ? (paragrafos[0].content ?? []) : paragrafos;
        if (conteudo.length > 0) {
          // insertContent substitui a seleção e aproveita o parse de JSON do TipTap.
          editorRef.current.chain().focus().insertContent(conteudo).run();
        }
        return true;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const s = docParaString(ed.getJSON());
      ultimoEmitido.current = s;
      onChangeRef.current(s);
    },
    onBlur: () => {
      // Atraso curto: deixa o clique numa sugestão acontecer antes de fechar.
      window.setTimeout(fecharSugestao, 120);
    },
  });

  const editorRef = useRef(editor);
  editorRef.current = editor;

  // Mudança externa de `value` (abrir/editar bloco, reset do form).
  useEffect(() => {
    if (!editor || value === ultimoEmitido.current) return;
    ultimoEmitido.current = value;
    editor.commands.setContent(stringParaDoc(value), { emitUpdate: false });
    fecharSugestao();
  }, [value, editor]);

  // Scroll do item selecionado para dentro da vista.
  useLayoutEffect(() => {
    itemSelRef.current?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  const ativo = useEditorState({
    editor,
    selector: ({ editor: ed }) =>
      ed
        ? {
            bold: ed.isActive('bold'),
            italic: ed.isActive('italic'),
            underline: ed.isActive('underline'),
          }
        : null,
  });

  const BOTOES: Array<{
    mark: 'bold' | 'italic' | 'underline';
    titulo: string;
    Icone: typeof BoldIcon;
    aplicar: () => void;
  }> = [
    {
      mark: 'bold',
      titulo: 'Negrito (Ctrl+B)',
      Icone: BoldIcon,
      aplicar: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      mark: 'italic',
      titulo: 'Itálico (Ctrl+I)',
      Icone: ItalicIcon,
      aplicar: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      mark: 'underline',
      titulo: 'Sublinhado (Ctrl+U)',
      Icone: UnderlineIcon,
      aplicar: () => editor?.chain().focus().toggleUnderline().run(),
    },
  ];

  // Insere o esqueleto de uma tabela como linhas de texto na convenção do engine
  // (cabeçalho + separadora + 1 linha de corpo). A linha em branco na frente
  // garante que a tabela comece em parágrafo próprio mesmo com o cursor no meio
  // de um texto; o pipeline (segmentar) cuida do resto na prévia e no .docx.
  const inserirTabela = () => {
    if (!editor) return;
    const linhas = ['| Coluna 1 | Coluna 2 |', '| --- | --- |', '| Célula | Célula |'];
    const conteudo: JSONContent[] = [
      { type: 'paragraph' },
      ...linhas.map((texto) => ({ type: 'paragraph', content: [{ type: 'text', text: texto }] })),
    ];
    editor.chain().focus().insertContent(conteudo).run();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="mb-1.5 flex items-center gap-0.5">
        {BOTOES.map(({ mark, titulo, Icone, aplicar }) => (
          <button
            key={mark}
            type="button"
            title={titulo}
            // preventDefault no mousedown: não rouba o foco nem desfaz a seleção do editor.
            onMouseDown={(e) => e.preventDefault()}
            onClick={aplicar}
            className={cn(
              'rounded p-1.5 transition-colors',
              ativo?.[mark]
                ? 'bg-osg-100 text-osg-700'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icone className="h-3.5 w-3.5" />
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        <button
          type="button"
          title="Inserir tabela"
          onMouseDown={(e) => e.preventDefault()}
          onClick={inserirTabela}
          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <TableIcon className="h-3.5 w-3.5" />
        </button>
        <span className="ml-1.5 text-[10px] text-muted-foreground/70">
          a formatação sai igual na prévia e no .docx
        </span>
      </div>

      <EditorContent
        editor={editor}
        className="editor-modelo"
        style={
          {
            '--editor-min-h': minHeight,
            '--editor-max-h': maxHeight ?? 'none',
          } as CSSProperties
        }
      />

      {sug && sug.items.length > 0 && (
        <div
          className="absolute z-50 w-72 max-w-[min(20rem,90vw)] overflow-hidden rounded-md border border-border bg-popover shadow-md animate-in fade-in-0 zoom-in-95"
          style={{ top: sug.y, left: Math.max(0, sug.x) }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="flex items-center justify-between border-b border-border/60 px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            <span>Variáveis</span>
            <span className="font-mono normal-case">↹ Tab insere</span>
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {sug.items.map((s, i) => {
              const cabecalho = i === 0 || sug.items[i - 1].grupo !== s.grupo;
              return (
                <div key={s.placeholder}>
                  {cabecalho && (
                    <div className="px-2.5 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                      {s.grupo}
                    </div>
                  )}
                  <button
                    ref={i === sel ? itemSelRef : undefined}
                    type="button"
                    onMouseEnter={() => {
                      selRef.current = i;
                      setSel(i);
                    }}
                    onClick={() => sug.command(s)}
                    className={cn(
                      'flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm',
                      i === sel ? 'bg-osg-50 text-osg-700' : 'hover:bg-muted',
                    )}
                  >
                    <code
                      className={cn(
                        'shrink-0 rounded px-1 py-px text-xs font-medium',
                        i === sel ? 'bg-osg-100 text-osg-700' : 'bg-muted text-foreground',
                      )}
                    >
                      {s.placeholder}
                    </code>
                    <span className="truncate text-xs text-muted-foreground">{s.label}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default EditorConteudoModelo;
