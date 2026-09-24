import { Fragment, useEffect, useRef, useState, type MutableRefObject } from 'react';
import Bold from '@tiptap/extension-bold';
import Document from '@tiptap/extension-document';
import Italic from '@tiptap/extension-italic';
import { BulletList, ListItem, ListKeymap, OrderedList } from '@tiptap/extension-list';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Underline from '@tiptap/extension-underline';
import { Placeholder, UndoRedo } from '@tiptap/extensions';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { splitBlock } from '@tiptap/pm/commands';
import { exitSuggestion, type SuggestionProps } from '@tiptap/suggestion';
import {
  AtSign,
  Users,
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
import { ehMencaoTodos, iniciaisDoNome, type MentionCandidate } from '@/lib/orgCommentMentions';
import { docDoCorpo, serializarDoc } from '@/lib/orgCommentRichText';
import { cn } from '@/lib/utils';
import { ButtonTooltip } from '@/components/ui/button-tooltip';

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
  /** Atalho de publicar (Ctrl/Cmd+Enter, e Enter quando `enviarComEnter`). */
  onPublicar?: () => void;
  /**
   * Enter ENVIA, e a quebra de linha passa para Shift+Enter, como no Slack.
   *
   * É opt-in: no painel da tarefa o Enter continua quebrando linha. Quem liga
   * isto é a caixa do feed, onde o Enter abre a escolha de destino e o gesto
   * inteiro (escrever, enviar, escolher cliente e projeto) acontece sem a mão
   * sair do teclado.
   *
   * A lista de menção tem precedência: com ela aberta o Enter escolhe a pessoa,
   * e não envia.
   */
  enviarComEnter?: boolean;
  /**
   * O que dizer quando o "@" não tem ninguém para oferecer porque a lista de
   * candidatos está vazia (e não porque a busca não casou).
   *
   * A lista de quem pode ser mencionado é derivada do projeto. Na caixa do
   * feed o projeto só é escolhido no envio, então antes da primeira fala não
   * há ninguém para oferecer, e uma lista que não abre parece defeito.
   */
  avisoSemMencoes?: string;
  /**
   * O "@" foi disparado e NÃO HÁ NINGUÉM na lista de candidatos.
   *
   * Quem passa isto se encarrega de resolver a falta (no feed, é escolher o
   * destino, que é de onde a roda de gente vem) e reabre a menção pelo
   * `reabrirMencaoRef` quando houver gente. Sem a prop, o editor só mostra o
   * aviso de lista vazia, que é o comportamento de quem já tem destino fixo.
   */
  aoMencionarSemGente?: () => void;
  /**
   * Reabre a menção: apaga o "@" que já está no texto e o digita de novo, para
   * o Suggestion recomeçar agora que a lista tem gente. Repetir a digitação é o
   * caminho porque o plugin só recalcula os itens quando o gatilho muda.
   */
  reabrirMencaoRef?: MutableRefObject<(() => void) | null>;
  ariaLabel?: string;
  /**
   * Classes da área de escrita. Existe para a caixa no formato do Slack, onde a
   * borda é do invólucro e o respiro do texto precisa vir de dentro.
   */
  classeDoTexto?: string;
  /**
   * A barra de formatação vira FAIXA colada no topo da caixa, em vez de uma
   * linha solta acima do texto. É o que dá o desenho de caixa única: fundo
   * próprio, sem margem, encostada na borda de cima.
   */
  barraEmFaixa?: boolean;
  /**
   * O "@" mora na barra de formatação (padrão) ou na barra de ações de baixo,
   * desenhada por quem chama — que é o arranjo do Slack.
   */
  botaoDeMencao?: boolean;
  /**
   * Recebe a ação de inserir o "@", para quem desenha o botão fora do editor.
   *
   * Sai por `ref`, e não por callback de montagem, porque quem chama precisa de
   * um alvo estável: o botão vive numa barra irmã, renderizada no mesmo passo.
   */
  inserirMencaoRef?: MutableRefObject<(() => void) | null>;
  /** Insere texto plano na seleção atual sem expor a instância do TipTap. */
  inserirTextoRef?: MutableRefObject<((texto: string) => void) | null>;
}

/**
 * Editor rico do comentário.
 *
 * Mesma anatomia dos outros dois editores do sistema (revisão e chamados):
 * extensões mínimas, `value` string controlada e documento persistido como
 * marcador + JSON. O que ele acrescenta é a menção, que aqui é um nó do
 * documento em vez de texto — ver `MencaoUsuario`.
 *
 * Por padrão Enter quebra linha e continua a lista; publicar é o botão (ou
 * Ctrl/Cmd+Enter), porque trocar Enter por "publica" briga com lista e
 * parágrafo, que são justamente o que o editor rico traz. `enviarComEnter`
 * inverte isso para quem quer o gesto do Slack (a caixa do feed), e aí a quebra
 * de linha é Shift+Enter.
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
  enviarComEnter,
  avisoSemMencoes,
  ariaLabel,
  classeDoTexto,
  barraEmFaixa,
  botaoDeMencao = true,
  inserirMencaoRef,
  inserirTextoRef,
  aoMencionarSemGente,
  reabrirMencaoRef,
}: OrgCommentEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onPublicarRef = useRef(onPublicar);
  onPublicarRef.current = onPublicar;
  const onArquivosRef = useRef(onArquivos);
  onArquivosRef.current = onArquivos;
  const enviarComEnterRef = useRef(enviarComEnter);
  enviarComEnterRef.current = enviarComEnter;
  const aoMencionarSemGenteRef = useRef(aoMencionarSemGente);
  aoMencionarSemGenteRef.current = aoMencionarSemGente;
  /** Lista viva para a extensão ler sem recriar o editor a cada chegada do hook. */
  const candidatesRef = useRef(candidates);
  candidatesRef.current = candidates;
  const ultimoEmitido = useRef(value);

  const [sugestao, setSugestao] = useState<EstadoSugestao | null>(null);
  const [destacado, setDestacado] = useState(0);
  const sugestaoRef = useRef<EstadoSugestao | null>(null);
  const destacadoRef = useRef(0);

  const atualizarSugestao = (
    props: SuggestionProps<MentionCandidate, MentionCandidate>,
    inicio = false,
  ) => {
    /*
      "@" apertado sem NINGUÉM na lista: quem passou `aoMencionarSemGente`
      assume daqui (no feed, abre a escolha de destino, que é de onde a roda de
      gente vem). Só na ABERTURA: nas atualizações seguintes a lista vazia quer
      dizer que a busca não casou, e aí o aviso já responde.

      A saída é adiada por `queueMicrotask` porque isto roda dentro do `update`
      da view do ProseMirror, e despachar transação lá dentro é pedir
      transação descasada.
    */
    if (inicio && candidatesRef.current.length === 0 && aoMencionarSemGenteRef.current) {
      const aoMencionar = aoMencionarSemGenteRef.current;
      fecharSugestao();
      queueMicrotask(() => {
        exitSuggestion(props.editor.view, MENCAO_PLUGIN_KEY);
        aoMencionar();
      });
      return;
    }

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
          onStart: (props) => atualizarSugestao(props, true),
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
          classeDoTexto,
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
      handleKeyDown: (view, event) => {
        if (event.key !== 'Enter') return false;
        /*
          Com a lista de menção aberta E COM GENTE NELA o Enter é DELA. As props
          diretas da view correm antes das dos plugins no ProseMirror, então sem
          esta saída o envio atropelaria a escolha da pessoa que se acabou de
          digitar.

          A conferência do tamanho não é detalhe: o "@" fica ativo enquanto se
          digita o nome, mesmo sem nenhum casamento, e o tratador da sugestão
          devolve o Enter quando a lista está vazia. Sem ela, o Enter num "@abc"
          sem resultado não enviava nem escolhia: caía no ProseMirror e abria
          parágrafo novo (visto na tela).
        */
        if (sugestaoRef.current && sugestaoRef.current.items.length > 0) return false;
        if (event.metaKey || event.ctrlKey) {
          onPublicarRef.current?.();
          return true;
        }
        if (!enviarComEnterRef.current) return false;
        /*
          Shift+Enter é a quebra de linha quando o Enter virou enviar, e ela
          precisa ser feita à mão: o editor não carrega extensão de quebra
          rígida, então sem isto a tecla não fazia NADA (medido na tela, com o
          texto saindo todo numa linha só). O `splitBlock` é exatamente o que o
          Enter fazia antes daqui: parágrafo novo, e item novo dentro de lista.
        */
        if (event.shiftKey) return splitBlock(view.state, view.dispatch);
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

  /**
   * Recomeça a menção depois que a lista de gente chegou.
   *
   * O Suggestion só recalcula os itens quando o gatilho MUDA: com a lista
   * vazia no momento do "@", nenhuma chegada posterior de candidatos reabre a
   * lista sozinha. Então o "@" que a pessoa digitou é apagado e digitado de
   * novo, o que dispara tudo outra vez, agora com gente para oferecer.
   */
  const reabrirMencao = () => {
    if (!editor) return;
    const { from } = editor.state.selection;
    const antes = editor.state.doc.textBetween(Math.max(0, from - 1), from, ' ');
    const acao = editor.chain().focus();
    if (antes === '@') acao.deleteRange({ from: from - 1, to: from });
    acao.insertContent('@').run();
  };

  const inserirTexto = (texto: string) => {
    if (!editor || !texto) return;
    editor
      .chain()
      .focus(undefined, { scrollIntoView: false })
      .command(({ tr }) => {
        tr.insertText(texto);
        return true;
      })
      .run();
  };

  // As duas ações, à disposição de quem desenha o botão (ou o modal) fora daqui.
  if (inserirMencaoRef) inserirMencaoRef.current = inserirGatilhoDeMencao;
  if (reabrirMencaoRef) reabrirMencaoRef.current = reabrirMencao;
  if (inserirTextoRef) inserirTextoRef.current = inserirTexto;

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
      <div
        className={cn(
          'flex items-center gap-0.5 border-b',
          barraEmFaixa ? 'border-border/60 px-2 py-1' : 'mb-2 pb-1.5',
        )}
      >
        {botoes.map(({ key, label, icon: Icon, ativo, acao }, index) => (
          <Fragment key={key}>
            {index === 3 && <span className="mx-1 h-4 w-px bg-border" aria-hidden />}
            <ButtonTooltip text={label}>
              <button
                type="button"
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
            </ButtonTooltip>
          </Fragment>
        ))}
        {botaoDeMencao && (
          <ButtonTooltip text="Mencionar pessoa">
            <button
              type="button"
              aria-label="Mencionar pessoa"
              onMouseDown={(event) => event.preventDefault()}
              onClick={inserirGatilhoDeMencao}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <AtSign className="h-3.5 w-3.5" />
            </button>
          </ButtonTooltip>
        )}
      </div>

      <EditorContent editor={editor} />

      {sugestao && sugestao.items.length === 0 && (
        <p
          style={{ left: sugestao.x, top: sugestao.y }}
          className="absolute z-30 w-64 -translate-y-full rounded-md border bg-popover p-2 text-xs text-muted-foreground shadow-md"
        >
          {candidates.length === 0
            ? (avisoSemMencoes ?? 'Ninguém para mencionar por aqui.')
            : 'Ninguém com esse nome.'}
        </p>
      )}

      {sugestao && sugestao.items.length > 0 && (
        <ul
          role="listbox"
          aria-label="Mencionar pessoa"
          style={{ left: sugestao.x, top: sugestao.y }}
          className="absolute z-30 max-h-56 w-64 -translate-y-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md"
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
                {/*
                  O `@todos` não é gente, e a linha diz isso: ícone de grupo no
                  lugar das iniciais, e a legenda de quem vai ser avisado. Com
                  avatar de pessoa ele passaria por mais um colega da lista, e
                  ninguém descobriria que avisa o projeto inteiro sem usar.
                */}
                {ehMencaoTodos(candidate.id) ? (
                  <span
                    aria-hidden
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
                  >
                    <Users className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px]">
                      {iniciaisDoNome(candidate.name)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span className="truncate">{candidate.name}</span>
                {ehMencaoTodos(candidate.id) && (
                  <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                    avisa o projeto
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
