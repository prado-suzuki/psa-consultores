import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReviewRichTextContent } from '@/components/equipe/fiscal/tasks/ReviewRichText';
import {
  isReviewRichTextEmpty,
  serializeReviewRichText,
} from '@/components/equipe/fiscal/tasks/reviewRichTextFormat';

describe('ReviewRichText', () => {
  it('mantém compatibilidade com comentários em texto simples', () => {
    render(<ReviewRichTextContent value="Comentário antigo" />);

    expect(screen.getByText('Comentário antigo')).toBeInTheDocument();
  });

  it('renderiza marcas e listas do documento TipTap', () => {
    const document = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Importante', marks: [{ type: 'bold' }] }],
        },
        {
          type: 'orderedList',
          attrs: { start: 1 },
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Primeiro item' }] }],
            },
          ],
        },
      ],
    });

    const { container } = render(
      <ReviewRichTextContent value={serializeReviewRichText(document)} />,
    );

    expect(screen.getByText('Importante').tagName).toBe('STRONG');
    expect(screen.getByText('Primeiro item')).toBeInTheDocument();
    expect(container.querySelector('ol')).toBeInTheDocument();
  });

  it('diferencia documentos vazios de conteúdo preenchido', () => {
    const emptyDocument = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });
    const filledDocument = JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ajustar cálculo' }] }],
    });

    expect(isReviewRichTextEmpty(emptyDocument)).toBe(true);
    expect(isReviewRichTextEmpty(filledDocument)).toBe(false);
  });
});
