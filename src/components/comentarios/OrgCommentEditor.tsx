import { Fragment, useEffect, useRef, useState } from 'react';
import Bold from '@tiptap/extension-bold';
import Document from '@tiptap/extension-document';
import Italic from '@tiptap/extension-italic';
import { BulletList, ListItem, ListKeymap, OrderedList } from '@tiptap/extension-list';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Underline from '@tiptap/extension-underline';
import { Placeholder, UndoRedo } from '@tiptap/extensions';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { exitSuggestion, type SuggestionProps } from '@tiptap/suggestion';
import {
  AtSign,
  Bold as BoldIcon,
  Italic as ItalicIcon,
  List as BulletListIcon,
  ListOrdered,
  Underline as UnderlineIcon,
} from 'lucide-react';

import {
  MENCAO_PLUGIN_KEY,
  MencaoUsuario,
} from '@/components/comentarios/extensions/MencaoUsuario';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { iniciaisDoNome, type MentionCandidate } from '@/lib/orgCommentMentions';
import { docDoCorpo, serializarDoc } from '@/lib/orgCommentRichText';
import { cn } from '@/lib/utils';

interface EstadoSugestao {
  items: MentionCandidate[];
  command: (item: MentionCandidate) => void;
  x: number;
  y: number;
}

interface OrgCommentEditorProps {
  /** Corpo serializado (marcador + JSON) ou texto legado, que o editor sabe abrir. */
  value: string;
  onChange: (value: string) => void;
  candidates: MentionCandidate[];
  placeholder?: string;
  /** Classe de altura mínima da área de escrita. */
  minHeight?: string;
  /** Muda de valor quando alguém pede o foco daqui de fora. */
  focusSignal?: number;
  /** Foca na montagem — o campo de resposta/edição nasce com o cursor dentro. */
  focarNaMontagem?: boolean;
  /** Arquivo colado ou arrastado sobre o texto continua virando anexo. */
  onArquivos?: (files: File[]) => void;
  /** Atalho de publicar (Ctrl/Cmd+Enter). Enter continua quebrando linha. */
  onPublicar?: () => void;
  ariaLabel?: string;
}

/**
 * Editor rico do comentário.
 *
 * Mesma anatomia dos outros dois editores do sistema (revisão e chamados):
 * extensões mínimas, `value` string controlada e documento persistido como
 * marcador + JSON. O que ele acrescenta é a menção, que aqui é um nó do
 * documento em vez de texto — ver `MencaoUsuario`.
 *
 * Enter quebra linha e continua a lista; publicar é o botão (ou Ctrl/Cmd+Enter).
 * Trocar Enter por "publica" brigaria com lista e parágrafo, que são justamente
 * o que o editor rico traz.
 */
export function OrgCommentEditor({
  value,
  onChange,
  candidates,
  placeholder,
  minHeight = 'min-h-16',
  focusSignal,
  focarNaMontagem,
  onArquivos,
  onPublicar,
  ariaLabel,
}: OrgCommentEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onPublicarRef = useRef(onPublicar);
  onPublicarRef.current = onPublicar;
  const onArquivosRef = useRef(onArquivos);
  onArquivosRef.current = onArquivos;
  /** Lista viva para a extensão ler sem recriar o editor a cada chegada do hook. */
  const candidatesRef = useRef(candidates);
  candidatesRef.current = candidates;
  const ultimoEmitido = useRef(value);

  const [sugestao, setSugestao] = useState<EstadoSugestao | null>(null);
  const [destacado, setDestacado] = useState(0);
  const sugestaoRef = useRef<EstadoSugestao | null>(null);
  const destacadoRef = useRef(0);

  const atualizarSugestao = (props: SuggestionProps<MentionCandidate, MentionCandidate>) => {
    const rect = props.clientRect?.();
    const container = containerRef.current?.getBoundingClientRect();
    const estado: EstadoSugestao = {
      items: props.items,
      command: props.command,
      x: rect && container ? rect.left - container.left : 8,
      // Ancorado no topo da linha do cursor: a lista sobe (ver `-translate-y-full`),
      // porque o compositor mora no rodapé do painel.
      y: rect && container ? rect.top - container.top - 4 : 0,
    };
    sugestaoRef.current = estado;
    destacadoRef.current = 0;
    setSugestao(estado);
    setDestacado(0);
  };

  const fecharSugestao = () => {
    sugestaoRef.current = null;
    setSugestao(null);
  };

  const moverDestaque = (delta: number) => {
    const total = sugestaoRef.current?.items.length ?? 0;
    if (total === 0) return;
    destacadoRef.current = (destacadoRef.current + delta + total) % total;
    setDestacado(destacadoRef.current);
  };

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
      Placeholder.configure({ placeholder: placeholder ?? '' }),
      MencaoUsuario.configure({
        candidatos: () => candidatesRef.current,
        render: () => ({
          onStart: atualizarSugestao,
          onUpdate: atualizarSugestao,
          onExit: fecharSugestao,
          onKeyDown: ({ view, event }) => {
            const estado = sugestaoRef.current;
            if (!estado || estado.items.length === 0) return false;
            if (event.key === 'ArrowDown') {
              moverDestaque(1);
              return true;
            }
            if (event.key === 'ArrowUp') {
              moverDestaque(-1);
              return true;
            }
            if (event.key === 'Enter' || event.key === 'Tab') {
              estado.command(estado.items[destacadoRef.current]);
              return true;
            }
            if (event.key === 'Escape') {
              fecharSugestao();
              exitSuggestion(view, MENCAO_PLUGIN_KEY);
              return true;
            }
            return false;
          },
        }),
      }),
    ],
    content: docDoCorpo(value),
    autofocus: focarNaMontagem ? 'end' : false,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
        class: cn(
          minHeight,
          'max-h-64 overflow-y-auto text-sm leading-6 outline-none',
          '[&_p.is-editor-empty:first-child::before]:pointer-events-none',
          '[&_p.is-editor-empty:first-child::before]:float-left',
          '[&_p.is-editor-empty:first-child::before]:h-0',
          '[&_p.is-editor-empty:first-child::before]:text-muted-foreground',
          '[&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5',
          '[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5',
        ),
      },
      // Arquivo colado/arrastado é anexo, não conteúdo do documento.
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (files.length === 0) return false;
        onArquivosRef.current?.(files);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = Array.from((event as DragEvent).dataTransfer?.files ?? []);
        if (files.length === 0) return false;
        onArquivosRef.current?.(files);
        return true;
      },
      handleKeyDown: (_view, event) => {
        if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return false;
        onPublicarRef.current?.();
        return true;
      },
    },
    onUpdate: ({ editor: atualizado }) => {
      const proximo = serializarDoc(atualizado.getJSON());
      ultimoEmitido.current = proximo;
      onChangeRef.current(proximo);
    },
  });

  useEffect(() => {
    if (!editor || value === ultimoEmitido.current) return;
    ultimoEmitido.current = value;
    editor.commands.setContent(docDoCorpo(value), { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    if (!focusSignal) return;
    editor?.commands.focus('end');
  }, [editor, focusSignal]);

  /**
   * Botão de arroba: faz o mesmo caminho da digitação — insere o `@` e deixa o
   * Suggestion abrir a lista. Um espaço antes, se o cursor estiver colado numa
   * palavra, porque é o prefixo que o gatilho exige.
   */
  const inserirGatilhoDeMencao = () => {
    if (!editor) return;
    const antes = editor.state.doc.textBetween(
      Math.max(0, editor.state.selection.from - 1),
      editor.state.selection.from,
      ' ',
    );
    editor
      .chain()
      .focus()
      .insertContent(antes && !/\s/.test(antes) ? ' @' : '@')
      .run();
  };

  const marcas = useEditorState({
    editor,
    selector: ({ editor: atual }) => ({
      bold: atual?.isActive('bold') ?? false,
      italic: atual?.isActive('italic') ?? false,
      underline: atual?.isActive('underline') ?? false,
      bulletList: atual?.isActive('bulletList') ?? false,
      orderedList: atual?.isActive('orderedList') ?? false,
    }),
  });

  const botoes = [
    {
      key: 'bold',
      label: 'Negrito',
      icon: BoldIcon,
      ativo: marcas?.bold,
      acao: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      key: 'italic',
      label: 'Itálico',
      icon: ItalicIcon,
      ativo: marcas?.italic,
      acao: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      key: 'underline',
      label: 'Sublinhado',
      icon: UnderlineIcon,
      ativo: marcas?.underline,
      acao: () => editor?.chain().focus().toggleUnderline().run(),
    },
    {
      key: 'bulletList',
      label: 'Lista com marcadores',
      icon: BulletListIcon,
      ativo: marcas?.bulletList,
      acao: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      key: 'orderedList',
      label: 'Lista numerada',
      icon: ListOrdered,
      ativo: marcas?.orderedList,
      acao: () => editor?.chain().focus().toggleOrderedList().run(),
    },
  ];

  return (
    <div ref={containerRef} className="relative">
      <div className="mb-2 flex items-center gap-0.5 border-b pb-1.5">
        {botoes.map(({ key, label, icon: Icon, ativo, acao }, index) => (
          <Fragment key={key}>
            {index === 3 && <span className="mx-1 h-4 w-px bg-border" aria-hidden />}
            <button
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={ativo}
              onMouseDown={(event) => event.preventDefault()}
              onClick={acao}
              className={cn(
                'rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                ativo && 'bg-muted text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          </Fragment>
        ))}
        <button
          type="button"
          title="Mencionar pessoa"
          aria-label="Mencionar pessoa"
          onMouseDown={(event) => event.preventDefault()}
          onClick={inserirGatilhoDeMencao}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <AtSign className="h-3.5 w-3.5" />
        </button>
      </div>

      <EditorContent editor={editor} />

      {sugestao && sugestao.items.length > 0 && (
        <ul
          role="listbox"
          aria-label="Mencionar pessoa"
          style={{ left: sugestao.x, top: sugestao.y }}
          className="absolute z-30 max-h-56 w-64 -translate-y-full overflow-y-auto rounded-lg border bg-popover p-1 shadow-md"
        >
          {sugestao.items.map((candidate, index) => (
            <li key={candidate.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === destacado}
                // `onMouseDown` com preventDefault: o clique não pode roubar o
                // foco do editor antes da inserção acontecer.
                onMouseDown={(event) => {
                  event.preventDefault();
                  sugestao.command(candidate);
                }}
                onMouseEnter={() => {
                  destacadoRef.current = index;
                  setDestacado(index);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm',
                  index === destacado && 'bg-muted',
                )}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">
                    {iniciaisDoNome(candidate.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{candidate.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
