import { Node, mergeAttributes } from '@tiptap/core';
import type { Mark } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { TOKEN_COMPLETO, nomeDoToken } from '@/lib/templates/editorDoc';

// Chip de placeholder: nó inline ATÔMICO que representa um token {{ }} completo
// (variável, abertura ou fechamento de seção). O source exato fica no attr; o
// rótulo curto é o que aparece no chip.
//
// Dois comportamentos moram aqui:
// 1. Autoconversão: qualquer token completo que apareça em TEXTO (digitado à
//    mão, recolado, ou recompletado após uma degradação) vira chip via
//    appendTransaction.
// 2. Exclusão PARCIAL (Backspace/Delete encostado no chip): o chip degrada para
//    o texto literal do token menos um caractere ({{ nome }} → "{{ nome }"),
//    editável — redigitar o caractere que falta reconverte em chip (regra 1).

export const CHIP_CLASS =
  'osg-var-chip inline-flex items-center align-baseline rounded px-1.5 py-px mx-[1px] ' +
  'text-[0.85em] font-medium leading-snug bg-osg-100 text-osg-700 ring-1 ring-osg-200/70 ' +
  'select-none whitespace-nowrap cursor-default';

export const PlaceholderChip = Node.create({
  name: 'placeholderChip',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      /** Texto exato do token na string de origem (ex.: '{{#socios sep="; "}}'). */
      source: { default: '' },
      /** Rótulo do chip: "nome", "#secao" ou "/secao". */
      nome: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-chip="true"]',
        getAttrs: (el) => ({
          source: (el as HTMLElement).dataset.source ?? '',
          nome: (el as HTMLElement).textContent ?? '',
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-chip': 'true',
        'data-source': node.attrs.source,
        title: node.attrs.source,
        class: CHIP_CLASS,
        contenteditable: 'false',
      }),
      node.attrs.nome,
    ];
  },

  /** Copiar/recortar leva o token literal, não o rótulo. */
  renderText({ node }) {
    return node.attrs.source as string;
  },

  addKeyboardShortcuts() {
    /**
     * Degrada o chip encostado no cursor para texto literal menos um caractere.
     * Backspace após o chip: {{ nome }} → "{{ nome }"; Delete antes: "{ nome }}".
     * O cursor é remapeado pelo próprio replace (fim/início do texto inserido).
     */
    const degradar = (lado: 'antes' | 'depois') =>
      this.editor.commands.command(({ state, tr, dispatch }) => {
        const { empty, $from } = state.selection;
        if (!empty) return false;
        const no = lado === 'antes' ? $from.nodeBefore : $from.nodeAfter;
        if (!no || no.type.name !== this.name) return false;
        const source = no.attrs.source as string;
        const texto = lado === 'antes' ? source.slice(0, -1) : source.slice(1);
        const de = lado === 'antes' ? $from.pos - no.nodeSize : $from.pos;
        if (dispatch) {
          if (texto) tr.replaceWith(de, de + no.nodeSize, state.schema.text(texto, no.marks));
          else tr.delete(de, de + no.nodeSize);
        }
        return true;
      });

    return {
      Backspace: () => degradar('antes'),
      Delete: () => degradar('depois'),
    };
  },

  addProseMirrorPlugins() {
    const tipo = this.type;
    return [
      new Plugin({
        key: new PluginKey('placeholderChipAutoconversao'),
        // Converte tokens completos que existam como TEXTO em chips. Roda após
        // qualquer mudança no doc; os replaces são aplicados de trás para frente
        // para não invalidar as posições coletadas.
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) return null;

          const achados: Array<{ de: number; ate: number; source: string; nome: string; marks: readonly Mark[] }> = [];
          newState.doc.descendants((node, pos) => {
            if (!node.isText || !node.text) return;
            const re = new RegExp(TOKEN_COMPLETO.source, 'g');
            for (const m of node.text.matchAll(re)) {
              achados.push({
                de: pos + m.index!,
                ate: pos + m.index! + m[0].length,
                source: m[0],
                nome: nomeDoToken(m[1]),
                marks: node.marks,
              });
            }
          });
          if (achados.length === 0) return null;

          const tr = newState.tr;
          for (const a of achados.reverse()) {
            tr.replaceWith(a.de, a.ate, tipo.create({ source: a.source, nome: a.nome }, null, [...a.marks]));
          }
          return tr;
        },
      }),
    ];
  },
});

export default PlaceholderChip;
