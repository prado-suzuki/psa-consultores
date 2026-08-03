import { describe, expect, it } from 'vitest';
import {
  TAREFA_RICH_TEXT_MARKER,
  hasTarefaRichTextMarker,
  isTarefaRichTextEmpty,
  parseTarefaRichText,
  serializeTarefaRichText,
  tarefaRichTextToPlain,
} from '@/lib/tarefaRichText';

const doc = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Rodar a query de conferência:' }] },
    {
      type: 'codeBlock',
      attrs: { language: 'sql' },
      content: [{ type: 'text', text: 'select * from cliente\nwhere excluido = false;' }],
    },
  ],
};

describe('tarefaRichText', () => {
  it('serializa com marcador e volta no parse', () => {
    const value = serializeTarefaRichText(doc);
    expect(value.startsWith(TAREFA_RICH_TEXT_MARKER)).toBe(true);
    expect(hasTarefaRichTextMarker(value)).toBe(true);
    expect(parseTarefaRichText(value)).toEqual(doc);
  });

  it('converte descrição antiga em texto plano para parágrafos, preservando linhas', () => {
    expect(parseTarefaRichText('linha 1\n\nlinha 3')).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'linha 1' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'linha 3' }] },
      ],
    });
  });

  it('documento sem texto vira string vazia, para gravar null na coluna', () => {
    expect(serializeTarefaRichText({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe('');
    expect(isTarefaRichTextEmpty('')).toBe(true);
    expect(isTarefaRichTextEmpty(serializeTarefaRichText(doc))).toBe(false);
  });

  it('projeta em texto plano incluindo o conteúdo do bloco de código', () => {
    expect(tarefaRichTextToPlain(serializeTarefaRichText(doc))).toBe(
      'Rodar a query de conferência:\nselect * from cliente\nwhere excluido = false;',
    );
  });

  it('texto antigo sem marcador atravessa intacto na projeção', () => {
    expect(tarefaRichTextToPlain('descrição legada')).toBe('descrição legada');
    expect(tarefaRichTextToPlain(null)).toBe('');
  });

  it('marcador com JSON corrompido mostra o resto como texto em vez de sumir', () => {
    const corrompido = `${TAREFA_RICH_TEXT_MARKER}{não é json`;
    expect(parseTarefaRichText(corrompido)).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '{não é json' }] }],
    });
  });
});
