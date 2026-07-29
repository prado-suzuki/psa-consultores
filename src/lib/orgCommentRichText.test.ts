import type { JSONContent } from '@tiptap/core';
import { describe, expect, it } from 'vitest';

import {
  docDeTextoLegado,
  docDoCorpo,
  docEstaVazio,
  DOC_VAZIO,
  lerCorpo,
  MARCADOR_REVISAO,
  mencoesDoDoc,
  NO_DE_MENCAO,
  serializarDoc,
  textoPlanoDoCorpo,
  textoPlanoDoDoc,
} from '@/lib/orgCommentRichText';

const DOC: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Confira com ' },
        { type: NO_DE_MENCAO, attrs: { id: 'U2', label: 'Ana Souza' } },
        { type: 'text', text: ' hoje', marks: [{ type: 'bold' }] },
      ],
    },
  ],
};

describe('lerCorpo', () => {
  it('reconhece o documento do editor', () => {
    expect(lerCorpo(serializarDoc(DOC))).toEqual({ formato: 'rich', doc: DOC });
  });

  it('reconhece o documento do fluxo de revisão', () => {
    const corpo = `${MARCADOR_REVISAO}${JSON.stringify(DOC)}`;
    expect(lerCorpo(corpo)).toEqual({ formato: 'rich', doc: DOC });
  });

  it('trata comentário legado como texto', () => {
    expect(lerCorpo('Comentário antigo @[Ana Souza](U2)')).toEqual({
      formato: 'texto',
      texto: 'Comentário antigo @[Ana Souza](U2)',
    });
  });

  it('marcador com JSON quebrado cai para texto em vez de estourar', () => {
    expect(lerCorpo(`${MARCADOR_REVISAO}{"type":`)).toEqual({
      formato: 'texto',
      texto: '{"type":',
    });
  });
});

describe('mencoesDoDoc', () => {
  it('junta os uuids dos nós de menção, sem repetir', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: NO_DE_MENCAO, attrs: { id: 'U1', label: 'Bernardo' } },
            { type: 'text', text: ' e ' },
            { type: NO_DE_MENCAO, attrs: { id: 'U2', label: 'Ana' } },
          ],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: NO_DE_MENCAO, attrs: { id: 'U1', label: 'Bernardo' } }],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(mencoesDoDoc(doc)).toEqual(['U1', 'U2']);
  });

  it('documento sem menção devolve vazio', () => {
    expect(mencoesDoDoc(DOC_VAZIO)).toEqual([]);
  });
});

describe('textoPlano', () => {
  it('devolve a menção como @Nome e uma linha por bloco', () => {
    expect(textoPlanoDoDoc(DOC)).toBe('Confira com @Ana Souza hoje');
  });

  it('serve para qualquer forma de corpo, inclusive o token legado', () => {
    expect(textoPlanoDoCorpo(serializarDoc(DOC))).toBe('Confira com @Ana Souza hoje');
    expect(textoPlanoDoCorpo('Veja com @[Ana Souza](U2)')).toBe('Veja com @Ana Souza');
  });

  it('separa parágrafos e itens de lista por linha', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Pendências:' }] },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'CFOP' }] }],
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Base' }] }],
            },
          ],
        },
      ],
    };

    expect(textoPlanoDoDoc(doc)).toBe('Pendências:\nCFOP\nBase');
  });
});

describe('docEstaVazio', () => {
  it('parágrafo sem texto é vazio', () => {
    expect(docEstaVazio(DOC_VAZIO)).toBe(true);
    expect(docEstaVazio({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe(true);
  });

  it('só menção, sem texto, não é vazio', () => {
    expect(
      docEstaVazio({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: NO_DE_MENCAO, attrs: { id: 'U2', label: 'Ana Souza' } }],
          },
        ],
      }),
    ).toBe(false);
  });
});

describe('docDeTextoLegado', () => {
  it('transforma os tokens em nós de menção', () => {
    expect(docDeTextoLegado('Confira com @[Ana Souza](U2) hoje')).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Confira com ' },
            { type: NO_DE_MENCAO, attrs: { id: 'U2', label: 'Ana Souza' } },
            { type: 'text', text: ' hoje' },
          ],
        },
      ],
    });
  });

  it('cada linha vira um parágrafo', () => {
    expect(docDeTextoLegado('primeira\n\nterceira')).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'primeira' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'terceira' }] },
      ],
    });
  });
});

describe('docDoCorpo', () => {
  it('abre documento rico, texto legado e corpo vazio', () => {
    expect(docDoCorpo(serializarDoc(DOC))).toEqual(DOC);
    expect(docDoCorpo('texto antigo')).toEqual(docDeTextoLegado('texto antigo'));
    expect(docDoCorpo('')).toEqual(DOC_VAZIO);
  });

  it('ida e volta preserva o documento', () => {
    expect(docDoCorpo(serializarDoc(docDoCorpo('Veja com @[Ana Souza](U2)')))).toEqual(
      docDeTextoLegado('Veja com @[Ana Souza](U2)'),
    );
  });
});
