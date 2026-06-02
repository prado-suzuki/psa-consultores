import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { listarPlaceholders, type PlaceholderSugerido } from '@/lib/templates/vocabulario';

// Editor de conteúdo de modelos: um contentEditable que (1) renderiza variáveis
// fechadas {{ nome }} como "chips" — só o nome, numa caixinha destacada — e
// (2) abre um autocomplete ao digitar {{, filtrando conforme se digita.
//
// O modelo de dados é a STRING de origem (prop `value`). O DOM é só uma vista:
// a cada edição reserializamos o DOM de volta para a string, e só repintamos
// (re-tokenizando em chips) quando o conjunto de variáveis fechadas muda — o
// que evita resetar o cursor a cada tecla em texto comum.

const TOKEN_COMPLETO = /\{\{\s*([\w.]+)\s*\}\}/g;
const ZERO_WIDTH = /[\uFEFF\u200B]/g;
const ehZeroWidth = (c: string) => c === '\uFEFF' || c === '\u200B';

type Segmento =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'chip'; nome: string; source: string };

function tokenizar(source: string): Segmento[] {
  const segs: Segmento[] = [];
  let ultimo = 0;
  const re = new RegExp(TOKEN_COMPLETO.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    if (m.index > ultimo) segs.push({ tipo: 'texto', texto: source.slice(ultimo, m.index) });
    segs.push({ tipo: 'chip', nome: m[1], source: m[0] });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < source.length) segs.push({ tipo: 'texto', texto: source.slice(ultimo) });
  return segs;
}

/** Assinatura do conjunto de chips — só repintamos o DOM quando ela muda. */
function assinaturaChips(source: string): string {
  return tokenizar(source)
    .map((s) => (s.tipo === 'chip' ? s.source : ''))
    .join('');
}

const CHIP_CLASS =
  'osg-var-chip inline-flex items-center align-baseline rounded px-1.5 py-px mx-[1px] ' +
  'text-[0.85em] font-medium leading-snug bg-osg-100 text-osg-700 ring-1 ring-osg-200/70 ' +
  'select-none whitespace-nowrap cursor-default';

function pintar(editor: HTMLElement, source: string) {
  editor.replaceChildren();
  for (const seg of tokenizar(source)) {
    if (seg.tipo === 'texto') {
      editor.appendChild(document.createTextNode(seg.texto));
    } else {
      const chip = document.createElement('span');
      chip.contentEditable = 'false';
      chip.dataset.chip = 'true';
      chip.dataset.source = seg.source;
      chip.className = CHIP_CLASS;
      chip.title = seg.source;
      chip.textContent = seg.nome;
      editor.appendChild(chip);
    }
  }
}

function tamanhoOrigem(node: ChildNode): number {
  const el = node as HTMLElement;
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').replace(ZERO_WIDTH, '').length;
  if (el.dataset?.chip) return (el.dataset.source ?? '').length;
  return (node.textContent ?? '').length;
}

/** Offset do cursor em coordenadas da string de origem (chips contam o tamanho do source). */
function lerOffset(editor: HTMLElement): number | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const sc = range.startContainer;
  const so = range.startOffset;
  if (sc !== editor && !editor.contains(sc)) return null;

  let offset = 0;
  if (sc === editor) {
    for (let i = 0; i < so; i++) offset += tamanhoOrigem(editor.childNodes[i]);
    return offset;
  }
  for (const node of Array.from(editor.childNodes)) {
    if (node === sc) {
      offset += (node.textContent ?? '').slice(0, so).replace(ZERO_WIDTH, '').length;
      return offset;
    }
    if (node.contains(sc)) {
      offset += tamanhoOrigem(node);
      return offset;
    }
    offset += tamanhoOrigem(node);
  }
  return offset;
}

/** Posiciona o cursor no offset de origem dado (não entra dentro de chips). */
function gravarOffset(editor: HTMLElement, alvo: number) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  let resto = alvo;
  for (const node of Array.from(editor.childNodes)) {
    const len = tamanhoOrigem(node);
    if (node.nodeType === Node.TEXT_NODE) {
      if (resto <= len) {
        const texto = node.textContent ?? '';
        let idx = 0;
        let contados = 0;
        while (idx < texto.length && contados < resto) {
          if (!ehZeroWidth(texto[idx])) contados++;
          idx++;
        }
        range.setStart(node, idx);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      resto -= len;
    } else {
      if (resto <= 0) {
        range.setStartBefore(node);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      if (resto < len) {
        range.setStartAfter(node);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      resto -= len;
    }
  }
  range.selectNodeContents(editor);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

function serializar(editor: HTMLElement): string {
  let s = '';
  for (const node of Array.from(editor.childNodes)) {
    const el = node as HTMLElement;
    if (node.nodeType === Node.TEXT_NODE) s += node.textContent ?? '';
    else if (el.dataset?.chip) s += el.dataset.source ?? '';
    else if (el.tagName === 'BR') s += '\n';
    else s += node.textContent ?? '';
  }
  return s.replace(ZERO_WIDTH, '');
}

interface EstadoDropdown {
  query: string;
  inicioToken: number;
  caret: number;
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

const MAX_SUGESTOES = 8;

export function EditorConteudoModelo({
  value,
  onChange,
  placeholder,
  minHeight = '11rem',
  maxHeight,
  className,
}: EditorConteudoModeloProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef(value);
  const assinaturaRef = useRef(assinaturaChips(value));
  const composingRef = useRef(false);

  const [drop, setDrop] = useState<EstadoDropdown | null>(null);
  const [sel, setSel] = useState(0);
  const itemSelRef = useRef<HTMLButtonElement>(null);

  const TODOS = useMemo(() => listarPlaceholders(), []);

  const sugestoes = useMemo<PlaceholderSugerido[]>(() => {
    if (!drop) return [];
    const q = drop.query.trim().toLowerCase();
    const lista = !q
      ? TODOS
      : TODOS.filter(
          (s) => s.placeholder.toLowerCase().includes(q) || s.label.toLowerCase().includes(q),
        );
    // Quem começa com a query vem primeiro.
    const ordenada = [...lista].sort((a, b) => {
      const ai = a.placeholder.toLowerCase().startsWith(q) ? 0 : 1;
      const bi = b.placeholder.toLowerCase().startsWith(q) ? 0 : 1;
      return ai - bi;
    });
    return ordenada.slice(0, MAX_SUGESTOES);
  }, [drop, TODOS]);

  // Pintura inicial.
  useLayoutEffect(() => {
    if (editorRef.current) pintar(editorRef.current, value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mudança externa de `value` (abrir/editar bloco, reset do form).
  useLayoutEffect(() => {
    if (value === sourceRef.current) return;
    sourceRef.current = value;
    assinaturaRef.current = assinaturaChips(value);
    if (editorRef.current) pintar(editorRef.current, value);
    setDrop(null);
  }, [value]);

  // Scroll do item selecionado para dentro da vista.
  useLayoutEffect(() => {
    itemSelRef.current?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  const rectCursor = (): DOMRect | null => {
    const selObj = window.getSelection();
    if (!selObj || selObj.rangeCount === 0) return null;
    const range = selObj.getRangeAt(0).cloneRange();
    let rect = range.getBoundingClientRect();
    if (!rect || (rect.x === 0 && rect.y === 0 && rect.width === 0 && rect.height === 0)) {
      const node = range.startContainer;
      const alvo = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
      rect = alvo?.getBoundingClientRect() ?? rect;
    }
    return rect;
  };

  const atualizarDropdown = (source: string, caret: number | null) => {
    if (caret == null) {
      setDrop(null);
      return;
    }
    const m = source.slice(0, caret).match(/\{\{\s*([\w.]*)$/);
    if (!m) {
      setDrop(null);
      return;
    }
    const rect = rectCursor();
    const cont = containerRef.current?.getBoundingClientRect();
    const x = rect && cont ? rect.left - cont.left : 8;
    const y = rect && cont ? rect.bottom - cont.top + 4 : 8;
    setDrop({ query: m[1], inicioToken: caret - m[0].length, caret, x, y });
    setSel(0);
  };

  const sincronizar = () => {
    const ed = editorRef.current;
    if (!ed || composingRef.current) return;

    const novo = serializar(ed);
    const caret = lerOffset(ed);
    sourceRef.current = novo;

    const assinatura = assinaturaChips(novo);
    if (assinatura !== assinaturaRef.current) {
      assinaturaRef.current = assinatura;
      pintar(ed, novo);
      if (caret != null) gravarOffset(ed, caret);
    }

    onChange(novo);
    atualizarDropdown(novo, caret);
  };

  const inserirTexto = (texto: string) => {
    document.execCommand('insertText', false, texto);
  };

  const aceitarSugestao = (ph: string) => {
    const ed = editorRef.current;
    if (!ed || !drop) return;
    const source = sourceRef.current;
    const insercao = `{{ ${ph} }}`;
    const novo = source.slice(0, drop.inicioToken) + insercao + source.slice(drop.caret);
    const novoCaret = drop.inicioToken + insercao.length;

    sourceRef.current = novo;
    assinaturaRef.current = assinaturaChips(novo);
    pintar(ed, novo);
    ed.focus();
    gravarOffset(ed, novoCaret);

    setDrop(null);
    onChange(novo);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (drop && sugestoes.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSel((s) => (s + 1) % sugestoes.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSel((s) => (s - 1 + sugestoes.length) % sugestoes.length);
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        aceitarSugestao(sugestoes[sel].placeholder);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setDrop(null);
        return;
      }
    }

    // Sem dropdown: Enter insere quebra de linha como texto (evita <div>/<br>).
    if (e.key === 'Enter') {
      e.preventDefault();
      inserirTexto('\n');
    }
  };

  const onKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      const ed = editorRef.current;
      if (ed) atualizarDropdown(sourceRef.current, lerOffset(ed));
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const texto = e.clipboardData.getData('text/plain');
    inserirTexto(texto);
  };

  const onInput = () => {
    if (composingRef.current) {
      const ed = editorRef.current;
      if (ed) {
        sourceRef.current = serializar(ed);
        onChange(sourceRef.current);
      }
      return;
    }
    sincronizar();
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        data-placeholder={placeholder}
        onInput={onInput}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onMouseUp={() => {
          const ed = editorRef.current;
          if (ed) atualizarDropdown(sourceRef.current, lerOffset(ed));
        }}
        onPaste={onPaste}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={() => {
          composingRef.current = false;
          sincronizar();
        }}
        onBlur={() => {
          // Atraso curto: deixa o clique numa sugestão acontecer antes de fechar.
          window.setTimeout(() => setDrop(null), 120);
        }}
        style={{ minHeight, maxHeight, overflowY: maxHeight ? 'auto' : undefined }}
        className={cn(
          'w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono leading-relaxed',
          'whitespace-pre-wrap break-words outline-none ring-offset-background',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none',
          className,
        )}
      />

      {drop && sugestoes.length > 0 && (
        <div
          className="absolute z-50 w-72 max-w-[min(20rem,90vw)] overflow-hidden rounded-md border border-border bg-popover shadow-md animate-in fade-in-0 zoom-in-95"
          style={{ top: drop.y, left: Math.max(0, drop.x) }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="flex items-center justify-between border-b border-border/60 px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            <span>Variáveis</span>
            <span className="font-mono normal-case">↹ Tab insere</span>
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {sugestoes.map((s, i) => (
              <button
                key={s.placeholder}
                ref={i === sel ? itemSelRef : undefined}
                type="button"
                onMouseEnter={() => setSel(i)}
                onClick={() => aceitarSugestao(s.placeholder)}
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default EditorConteudoModelo;
