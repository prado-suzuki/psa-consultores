import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  aplicarMencao,
  detectarMencaoAtiva,
  filtrarCandidatos,
  iniciaisDoNome,
  segmentarComMencoes,
  type MencaoAtiva,
  type MentionCandidate,
} from '@/lib/orgCommentMentions';
import { cn } from '@/lib/utils';

/** Teclas que só movem o cursor: a lista precisa reavaliar o gatilho depois delas. */
const TECLAS_DE_CURSOR = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

/** O que o compositor consegue pedir ao campo de fora (o botão de arroba). */
export interface MentionTextFieldHandle {
  abrirMencao: () => void;
}

interface MentionTextFieldProps {
  /** Texto como a pessoa lê: `@Nome`, nunca o token com uuid. */
  value: string;
  /** Menções já escolhidas — é o que dá uuid ao `@Nome` na hora de publicar. */
  mencoes: MentionCandidate[];
  candidates: MentionCandidate[];
  onChange: (text: string, mencoes: MentionCandidate[]) => void;
  placeholder?: string;
  rows?: number;
  /** Muda de valor quando alguém pede o foco daqui de fora. */
  focusSignal?: number;
  /** Foca na montagem — o campo de resposta/edição nasce com o cursor dentro. */
  focarNaMontagem?: boolean;
  /** Distingue os ids do listbox quando há mais de um campo na mesma tela. */
  idPrefixo?: string;
  onPaste?: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
}

/**
 * Campo de escrita com menção.
 *
 * A pílula é desenhada num espelho atrás do `textarea`: o texto do campo fica
 * transparente e quem aparece é o espelho, que pinta os mesmos caracteres com o
 * `@Nome` em destaque. É por isso que o espelho não muda peso de fonte nem
 * espaçamento — qualquer diferença de largura desalinharia a pílula do cursor.
 *
 * O uuid não entra no texto em momento nenhum: ele vive na lista `mencoes`, e a
 * tradução para o token `@[Nome](uuid)` acontece só na fronteira com o banco
 * (ver `serializarMencoes`).
 */
export const MentionTextField = forwardRef<MentionTextFieldHandle, MentionTextFieldProps>(
  function MentionTextField(
    {
      value,
      mencoes,
      candidates,
      onChange,
      placeholder,
      rows = 3,
      focusSignal,
      focarNaMontagem,
      idPrefixo = 'mencoes',
      onPaste,
    },
    ref,
  ) {
    /** Menção em construção na posição do cursor — é o que abre a lista. */
    const [mencaoAtiva, setMencaoAtiva] = useState<MencaoAtiva | null>(null);
    const [destacado, setDestacado] = useState(0);
    /**
     * Índice do `@` que a pessoa fechou com Esc: enquanto o cursor continuar
     * naquela menção, a lista não volta sozinha a cada tecla.
     */
    const [dispensado, setDispensado] = useState<number | null>(null);
    /**
     * Onde o cursor deve parar depois de uma inserção nossa. Vai num efeito, e não
     * num `requestAnimationFrame`: o frame chegaria depois das próximas teclas e
     * jogaria o cursor de volta no meio da frase que já estava sendo escrita.
     */
    const [caretDesejado, setCaretDesejado] = useState<number | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const espelhoRef = useRef<HTMLDivElement>(null);
    const listboxId = `${idPrefixo}-listbox`;

    const segmentos = segmentarComMencoes(value, mencoes);
    const sugestoes =
      mencaoAtiva && mencaoAtiva.inicio !== dispensado
        ? filtrarCandidatos(candidates, mencaoAtiva.termo)
        : [];
    const listaAberta = sugestoes.length > 0;

    useEffect(() => {
      if (!focusSignal) return;
      textareaRef.current?.focus();
    }, [focusSignal]);

    useEffect(() => {
      if (focarNaMontagem) textareaRef.current?.focus();
    }, [focarNaMontagem]);

    useEffect(() => {
      if (caretDesejado === null) return;
      setCaretDesejado(null);
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(caretDesejado, caretDesejado);
    }, [caretDesejado]);

    // O campo cresce com o texto em vez de rolar por dentro: com barra de rolagem,
    // a largura útil do textarea encolheria e a linha quebraria num ponto diferente
    // do espelho. O piso continua sendo a altura de `rows`, para o compositor não
    // encolher para uma linha quando está vazio.
    useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.style.height = 'auto';
      if (textarea.scrollHeight <= 0) return;
      const linha = parseFloat(getComputedStyle(textarea).lineHeight) || 20;
      textarea.style.height = `${Math.max(textarea.scrollHeight, rows * linha)}px`;
    }, [rows, value]);

    /** Reavalia o gatilho a cada mudança de texto ou de cursor. */
    const sincronizarMencao = (text: string, caret: number | null) => {
      const proxima = detectarMencaoAtiva(text, caret ?? text.length, mencoes);
      setMencaoAtiva(proxima);
      setDestacado(0);
      // Sair da menção dispensada libera o gatilho para a próxima.
      if (!proxima || proxima.inicio !== dispensado) setDispensado(null);
    };

    const escolherMencao = (candidate: MentionCandidate) => {
      if (!mencaoAtiva) return;
      const resultado = aplicarMencao(value, mencaoAtiva, candidate);
      onChange(
        resultado.text,
        mencoes.some((mencao) => mencao.id === candidate.id) ? mencoes : [...mencoes, candidate],
      );
      setMencaoAtiva(null);
      setDispensado(null);
      // O cursor volta para depois do nome, senão ele salta para o fim do texto.
      setCaretDesejado(resultado.caret);
    };

    /** O botão de arroba faz o mesmo caminho da digitação: insere o `@` e a lista abre. */
    const abrirMencao = () => {
      const textarea = textareaRef.current;
      const caret = textarea?.selectionStart ?? value.length;
      const precisaEspaco = caret > 0 && !/[\s(]$/.test(value.slice(0, caret));
      const prefixo = `${value.slice(0, caret)}${precisaEspaco ? ' ' : ''}@`;
      const texto = `${prefixo}${value.slice(caret)}`;
      onChange(texto, mencoes);
      sincronizarMencao(texto, prefixo.length);
      setCaretDesejado(prefixo.length);
    };

    useImperativeHandle(ref, () => ({ abrirMencao }));

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!listaAberta) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setDestacado((atual) => (atual + 1) % sugestoes.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setDestacado((atual) => (atual - 1 + sugestoes.length) % sugestoes.length);
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        escolherMencao(sugestoes[destacado]);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setDispensado(mencaoAtiva?.inicio ?? null);
        setMencaoAtiva(null);
      }
    };

    return (
      <div className="relative">
        {/*
        Espelho: mesmos caracteres, mesma métrica, com a menção em destaque. Fica
        atrás do campo e não recebe eventos.
      */}
        <div
          ref={espelhoRef}
          aria-hidden
          // Em alto contraste o navegador força a cor do texto do campo: aí o
          // espelho sai de cena para o texto não aparecer duplicado.
          className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words text-sm text-foreground/90 forced-colors:hidden"
        >
          {segmentos.map((segmento, index) =>
            segmento.mention ? (
              <span
                key={`${segmento.text}-${index}`}
                data-mention-chip={segmento.mention.id}
                className="rounded bg-primary/10 text-primary"
              >
                {segmento.text}
              </span>
            ) : (
              <span key={`texto-${index}`}>{segmento.text}</span>
            ),
          )}
          {/* Segura a última linha vazia, que o `pre-wrap` sozinho colapsaria. */}
          {'\u200b'}
        </div>

        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => {
            onChange(event.target.value, mencoes);
            sincronizarMencao(event.target.value, event.target.selectionStart);
          }}
          onKeyDown={handleKeyDown}
          // Cursor levado para longe do `@` fecha a lista; com a lista aberta, as
          // setas verticais são dela (percorrem os nomes) e não mexem no cursor.
          onKeyUp={(event) => {
            if (listaAberta && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) return;
            if (!TECLAS_DE_CURSOR.has(event.key)) return;
            sincronizarMencao(event.currentTarget.value, event.currentTarget.selectionStart);
          }}
          onClick={(event) => sincronizarMencao(value, event.currentTarget.selectionStart)}
          onBlur={() => setMencaoAtiva(null)}
          onScroll={() => {
            if (espelhoRef.current && textareaRef.current) {
              espelhoRef.current.scrollTop = textareaRef.current.scrollTop;
            }
          }}
          onPaste={onPaste}
          placeholder={placeholder}
          rows={rows}
          // Texto transparente com cursor visível: quem se lê é o espelho acima.
          // A seleção fica translúcida para o texto continuar legível por baixo.
          className="relative min-h-0 resize-none overflow-hidden border-0 bg-transparent p-0 text-transparent caret-foreground shadow-none selection:bg-primary/25 focus-visible:ring-0"
          aria-expanded={listaAberta}
          aria-controls={listaAberta ? listboxId : undefined}
          aria-activedescendant={listaAberta ? `${listboxId}-${destacado}` : undefined}
        />

        {/*
        A lista abre para cima: o compositor mora no rodapé do painel, e para
        baixo ela cairia fora do modal.
      */}
        {listaAberta && (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Mencionar pessoa"
            className="absolute bottom-full left-0 z-30 mb-2 max-h-56 w-64 overflow-y-auto rounded-lg border bg-popover p-1 shadow-md"
          >
            {sugestoes.map((candidate, index) => (
              <li key={candidate.id}>
                <button
                  type="button"
                  id={`${listboxId}-${index}`}
                  role="option"
                  aria-selected={index === destacado}
                  // `onMouseDown` em vez de `onClick`: o blur do textarea fecharia
                  // a lista antes do clique completar.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    escolherMencao(candidate);
                  }}
                  onMouseEnter={() => setDestacado(index)}
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
  },
);
