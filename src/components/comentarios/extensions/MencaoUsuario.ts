import { Node, mergeAttributes, type Editor, type Range } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';

import { NO_DE_MENCAO } from '@/lib/orgCommentRichText';
import { filtrarCandidatos, type MentionCandidate } from '@/lib/orgCommentMentions';

/**
 * Menção de pessoa no comentário: nó inline ATÔMICO.
 *
 * Ser átomo é o ponto — a menção não tem miolo editável, então Backspace apaga o
 * nome inteiro e ninguém consegue quebrar "@Ana Souza" pelo meio deixando um
 * uuid órfão. O uuid vive no atributo `id`, nunca no texto visível.
 *
 * O gatilho é o `@` via `@tiptap/suggestion`, com a mesma divisão do editor de
 * modelos do OSG: a extensão cuida do gatilho e da inserção, e a UI do dropdown
 * fica no componente React, entregue por `render`.
 */

export const MENCAO_PLUGIN_KEY = new PluginKey('mencaoUsuario');

export const MENCAO_CLASS =
  'rounded bg-primary/10 px-1 font-medium text-primary whitespace-nowrap cursor-default';

export interface MencaoUsuarioOptions {
  /**
   * Lista viva de quem pode ser mencionado. É função, e não array, para o editor
   * não precisar ser recriado quando a lista do projeto chega do hook.
   */
  candidatos: () => MentionCandidate[];
  /** Bridge de renderização do dropdown (fornecida pelo componente React). */
  render: SuggestionOptions<MentionCandidate, MentionCandidate>['render'];
}

/** Insere o chip no lugar do gatilho, com um espaço depois para seguir a frase. */
export function inserirMencao(editor: Editor, range: Range, candidate: MentionCandidate) {
  editor
    .chain()
    .focus()
    .insertContentAt(range, [
      { type: NO_DE_MENCAO, attrs: { id: candidate.id, label: candidate.name } },
      { type: 'text', text: ' ' },
    ])
    .run();
}

export const MencaoUsuario = Node.create<MencaoUsuarioOptions>({
  name: NO_DE_MENCAO,
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,
  draggable: false,

  addOptions() {
    return { candidatos: () => [], render: undefined };
  },

  addAttributes() {
    return {
      /** Uuid do perfil mencionado — o que vai para `org_comment_mentions`. */
      id: { default: '' },
      /** Nome exibido no chip. */
      label: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-mencao]',
        getAttrs: (element) => ({
          id: (element as HTMLElement).dataset.mencao ?? '',
          label: ((element as HTMLElement).textContent ?? '').replace(/^@/, ''),
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-mencao': node.attrs.id,
        class: MENCAO_CLASS,
        contenteditable: 'false',
      }),
      `@${node.attrs.label}`,
    ];
  },

  /** Copiar/colar e leitura fora do editor levam o token, que é o formato legado. */
  renderText({ node }) {
    return `@[${node.attrs.label}](${node.attrs.id})`;
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<MentionCandidate, MentionCandidate>({
        editor: this.editor,
        pluginKey: MENCAO_PLUGIN_KEY,
        char: '@',
        // Nome composto ("Ana S") precisa do espaço no termo. O prefixo padrão do
        // Suggestion (começo de linha ou espaço) é o que impede um e-mail como
        // `bi@psa` de abrir a lista.
        allowSpaces: true,
        items: ({ query }) => filtrarCandidatos(this.options.candidatos(), query),
        command: ({ editor, range, props }) => inserirMencao(editor, range, props),
        render: this.options.render,
      }),
    ];
  },
});

export default MencaoUsuario;
