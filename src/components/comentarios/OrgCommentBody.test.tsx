import type { JSONContent } from '@tiptap/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OrgCommentBody } from '@/components/comentarios/OrgCommentBody';
import { MARCADOR_REVISAO, NO_DE_MENCAO, serializarDoc } from '@/lib/orgCommentRichText';

describe('OrgCommentBody', () => {
  it('renderiza marcas, listas e a menção como chip', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Importante', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' para ' },
            { type: NO_DE_MENCAO, attrs: { id: 'U2', label: 'Ana Souza' } },
          ],
        },
        {
          type: 'orderedList',
          attrs: { start: 1 },
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Revisar CFOP' }] }],
            },
          ],
        },
      ],
    };

    const { container } = render(<OrgCommentBody body={serializarDoc(doc)} />);

    expect(screen.getByText('Importante').tagName).toBe('STRONG');
    expect(screen.getByText('Ana Souza', { exact: false })).toBeInTheDocument();
    expect(container.querySelector('ol')).toBeInTheDocument();
    expect(screen.getByText('Revisar CFOP')).toBeInTheDocument();
    // O uuid nunca aparece como texto.
    expect(container.textContent).not.toContain('U2');
  });

  it('mantém o comentário legado em texto plano, com a menção em pílula', () => {
    const { container } = render(<OrgCommentBody body={'Confira com @[Ana Souza](U2) hoje'} />);

    expect(screen.getByText('Ana Souza', { exact: false })).toBeInTheDocument();
    expect(container.textContent).toBe('Confira com @Ana Souza hoje');
  });

  it('lê o corpo do fluxo de revisão em vez de mostrar o JSON cru', () => {
    // Regressão: a thread recebe o payload do editor de revisão. Antes deste
    // renderer, o JSON aparecia como texto no meio da conversa.
    const doc = JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Faltou o CFOP' }] }],
    });

    const { container } = render(<OrgCommentBody body={`${MARCADOR_REVISAO}${doc}`} />);

    expect(screen.getByText('Faltou o CFOP')).toBeInTheDocument();
    expect(container.textContent).not.toContain('"type"');
  });

  it('não estoura com marcador de JSON quebrado', () => {
    const { container } = render(<OrgCommentBody body={`${MARCADOR_REVISAO}{"type":`} />);

    expect(container.textContent).toBe('{"type":');
  });
});
