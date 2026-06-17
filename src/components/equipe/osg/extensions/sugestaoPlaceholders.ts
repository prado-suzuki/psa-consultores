import { Extension, type Editor, type Range } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';
import { listarPlaceholders, type PlaceholderSugerido } from '@/lib/templates/binding';
import { stringParaDoc } from '@/lib/templates/editorDoc';

// Autocomplete de placeholders: digitar {{ abre o dropdown (a UI fica no
// componente, via `render`). A filtragem/ordenação é a mesma do editor antigo:
// grupos contíguos na ordem do catálogo e, dentro do grupo, quem começa com a
// query primeiro.

export const SUGESTAO_PLUGIN_KEY = new PluginKey('sugestaoPlaceholders');

export const MAX_SUGESTOES = 50;

let TODOS: PlaceholderSugerido[] | null = null;
let ORDEM_GRUPO: Map<string, number> | null = null;

function catalogo(): PlaceholderSugerido[] {
  if (!TODOS) {
    TODOS = listarPlaceholders();
    ORDEM_GRUPO = new Map();
    for (const s of TODOS) {
      if (!ORDEM_GRUPO.has(s.grupo)) ORDEM_GRUPO.set(s.grupo, ORDEM_GRUPO.size);
    }
  }
  return TODOS;
}

export function filtrarSugestoes(query: string): PlaceholderSugerido[] {
  const todos = catalogo();
  const q = query.replace(/^#/, '').trim().toLowerCase();
  const lista = !q
    ? todos
    : todos.filter(
        (s) => s.placeholder.toLowerCase().includes(q) || s.label.toLowerCase().includes(q),
      );
  const ordenada = [...lista].sort((a, b) => {
    const ga = ORDEM_GRUPO!.get(a.grupo) ?? Infinity;
    const gb = ORDEM_GRUPO!.get(b.grupo) ?? Infinity;
    if (ga !== gb) return ga - gb;
    const ai = a.placeholder.toLowerCase().startsWith(q) ? 0 : 1;
    const bi = b.placeholder.toLowerCase().startsWith(q) ? 0 : 1;
    return ai - bi;
  });
  return ordenada.slice(0, MAX_SUGESTOES);
}

/**
 * Insere a sugestão escolhida no lugar do gatilho. Variável vira um chip;
 * seção vira o par de chips (e o que houver entre eles) com o cursor entrando
 * no corpo — logo antes do chip de fechamento (equivalente ao idxCorpo antigo).
 */
export function inserirSugestao(editor: Editor, range: Range, s: PlaceholderSugerido) {
  const insercao = s.insercao ?? `{{ ${s.placeholder} }}`;
  const inline = stringParaDoc(insercao).content?.[0]?.content ?? [];
  if (inline.length === 0) return;

  const chain = editor.chain().focus().deleteRange(range).insertContentAt(range.from, inline);
  if (s.insercao && inline.length >= 2) {
    // Tamanho de tudo menos o último nó (chips atômicos ocupam 1 posição).
    let tamanho = 0;
    for (let i = 0; i < inline.length - 1; i++) {
      tamanho += inline[i].type === 'text' ? (inline[i].text?.length ?? 0) : 1;
    }
    chain.setTextSelection(range.from + tamanho);
  }
  chain.run();
}

export interface SugestaoPlaceholdersOptions {
  /** Bridge de renderização do dropdown (fornecido pelo componente React). */
  render: SuggestionOptions<PlaceholderSugerido, PlaceholderSugerido>['render'];
}

export const SugestaoPlaceholders = Extension.create<SugestaoPlaceholdersOptions>({
  name: 'sugestaoPlaceholders',

  addOptions() {
    return { render: undefined };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<PlaceholderSugerido, PlaceholderSugerido>({
        editor: this.editor,
        pluginKey: SUGESTAO_PLUGIN_KEY,
        char: '{{',
        allowSpaces: true,
        allowedPrefixes: null,
        items: ({ query }) => filtrarSugestoes(query),
        command: ({ editor, range, props }) => inserirSugestao(editor, range, props),
        render: this.options.render,
      }),
    ];
  },
});

export default SugestaoPlaceholders;
