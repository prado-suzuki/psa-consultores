import { describe, expect, it } from 'vitest';
import {
  TICKET_RICH_TEXT_MARKER,
  serializeTicketRichText,
} from '@/components/chamados/ticketRichTextFormat';
import {
  TAREFA_RICH_TEXT_MARKER,
  hasTarefaRichTextDoc,
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

  it('projeta lista com uma linha por item, sem linha em branco entre eles', () => {
    const comLista = serializeTarefaRichText({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Feito:' }] },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item um' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item dois' }] }] },
          ],
        },
      ],
    });
    expect(tarefaRichTextToPlain(comLista)).toBe('Feito:\nitem um\nitem dois');
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

// A tarefa aberta por chamado delegado recebe `tickets.description` copiada tal
// e qual pelo trigger `delegar_chamado_gera_tarefa()`: o valor chega com o
// marcador de chamado e precisa abrir como documento, não como texto cru.
describe('tarefaRichText: descrição vinda de chamado delegado', () => {
  const doChamado = serializeTicketRichText({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Preciso do ' },
          { type: 'text', text: 'balancete', marks: [{ type: 'bold' }] },
        ],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'março' }] }],
          },
        ],
      },
    ],
  });

  it('reconhece o marcador de chamado como documento, sem virar rich text de tarefa', () => {
    expect(hasTarefaRichTextDoc(doChamado)).toBe(true);
    expect(hasTarefaRichTextMarker(doChamado)).toBe(false);
    expect(hasTarefaRichTextDoc('Conferir o XML')).toBe(false);
  });

  it('abre o documento inteiro, com marcas e listas', () => {
    expect(parseTarefaRichText(doChamado)).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Preciso do ' },
            { type: 'text', text: 'balancete', marks: [{ type: 'bold' }] },
          ],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'março' }] }],
            },
          ],
        },
      ],
    });
  });

  it('projeta em texto plano para prévias e busca, sem marcador nem JSON', () => {
    const plano = tarefaRichTextToPlain(doChamado);
    expect(plano).toBe('Preciso do balancete\nmarço');
    expect(plano).not.toContain(TICKET_RICH_TEXT_MARKER);
  });

  it('volta gravada com o marcador de tarefa depois de editada', () => {
    const reserializado = serializeTarefaRichText(parseTarefaRichText(doChamado));
    expect(reserializado.startsWith(TAREFA_RICH_TEXT_MARKER)).toBe(true);
    expect(parseTarefaRichText(reserializado)).toEqual(parseTarefaRichText(doChamado));
  });

  it('marcador de chamado com JSON corrompido mostra o texto cru em vez de sumir', () => {
    expect(parseTarefaRichText(`${TICKET_RICH_TEXT_MARKER}{não é json`).content).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: '{não é json' }] },
    ]);
  });
});
