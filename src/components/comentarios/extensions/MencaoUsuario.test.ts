/**
 * Contrato da menção como nó do documento, num editor TipTap de verdade (sem
 * React): o que a lista insere, o que o documento guarda e o que sai como texto.
 *
 * O gatilho `@` em si não é testado aqui — depende de digitação real no
 * contenteditable, que jsdom não reproduz de forma confiável. O que ele chama
 * (`filtrarCandidatos` e `inserirMencao`) está coberto.
 */
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { afterEach, describe, expect, it } from 'vitest';

import { MencaoUsuario, inserirMencao } from '@/components/comentarios/extensions/MencaoUsuario';
import { mencoesDoDoc, NO_DE_MENCAO } from '@/lib/orgCommentRichText';

let editor: Editor | null = null;

function criarEditor(texto: string) {
  editor = new Editor({
    element: document.createElement('div'),
    extensions: [Document, Paragraph, Text, MencaoUsuario],
    content: {
      type: 'doc',
      content: [{ type: 'paragraph', content: texto ? [{ type: 'text', text: texto }] : [] }],
    },
  });
  return editor;
}

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe('MencaoUsuario', () => {
  it('insere a menção como nó atômico, com uuid no atributo e espaço depois', () => {
    const instancia = criarEditor('Confira com @an');
    // O range do gatilho: do `@` até o fim do que foi digitado.
    const inicioDoGatilho = 'Confira com '.length + 1;
    const fim = instancia.state.doc.content.size - 1;

    inserirMencao(instancia, { from: inicioDoGatilho, to: fim }, { id: 'U2', name: 'Ana Souza' });

    const paragrafo = instancia.getJSON().content?.[0].content ?? [];
    expect(paragrafo).toEqual([
      { type: 'text', text: 'Confira com ' },
      { type: NO_DE_MENCAO, attrs: { id: 'U2', label: 'Ana Souza' } },
      { type: 'text', text: ' ' },
    ]);
    expect(mencoesDoDoc(instancia.getJSON())).toEqual(['U2']);
  });

  it('sai como token no texto, que é o formato legado de cópia', () => {
    const instancia = criarEditor('');
    inserirMencao(instancia, { from: 1, to: 1 }, { id: 'U2', name: 'Ana Souza' });

    expect(instancia.getText()).toBe('@[Ana Souza](U2) ');
  });

  it('o chip não tem miolo editável: apagar tira a menção inteira', () => {
    const instancia = criarEditor('');
    inserirMencao(instancia, { from: 1, to: 1 }, { id: 'U2', name: 'Ana Souza' });
    // Cursor logo depois do chip (o espaço final ocupa 1 posição).
    const depoisDoChip = 2;
    instancia.commands.setTextSelection(depoisDoChip);
    instancia.commands.deleteRange({ from: depoisDoChip - 1, to: depoisDoChip });

    expect(mencoesDoDoc(instancia.getJSON())).toEqual([]);
    expect(instancia.getText()).toBe(' ');
  });
});
