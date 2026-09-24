import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SugestaoEnriquecimento } from '@/lib/enriquecimentoTexto';

const mocks = vi.hoisted(() => ({
  data: null as SugestaoEnriquecimento | null,
  next: null as SugestaoEnriquecimento | null,
  mutateAsync: vi.fn(),
  reset: vi.fn(),
}));

vi.mock('@/hooks/useEnriquecerTexto', () => ({
  useEnriquecerTexto: () => ({
    data: mocks.data,
    isPending: false,
    mutateAsync: async (texto: string) => {
      mocks.mutateAsync(texto);
      mocks.data = mocks.next;
      return mocks.next;
    },
    reset: () => {
      mocks.reset();
      mocks.data = null;
    },
  }),
}));

vi.mock('@/components/comentarios/OrgCommentEditor', async () => {
  const { useEffect, useRef, useState } = await import('react');
  const richText = await vi.importActual<typeof import('@/lib/orgCommentRichText')>(
    '@/lib/orgCommentRichText',
  );
  return {
    OrgCommentEditor: ({
      value,
      onChange,
      ariaLabel,
    }: {
      value: string;
      onChange: (value: string) => void;
      ariaLabel?: string;
    }) => {
      const [texto, setTexto] = useState(() => richText.textoPlanoDoCorpo(value));
      const ultimoEmitido = useRef(value);
      useEffect(() => {
        if (value === ultimoEmitido.current) return;
        ultimoEmitido.current = value;
        setTexto(richText.textoPlanoDoCorpo(value));
      }, [value]);
      return (
        <textarea
          aria-label={ariaLabel}
          value={texto}
          onChange={(event) => {
            setTexto(event.target.value);
            const proximo = richText.serializarDoc(richText.docDeTextoLegado(event.target.value));
            ultimoEmitido.current = proximo;
            onChange(proximo);
          }}
        />
      );
    },
  };
});

import { CommentComposer } from '@/components/comentarios/CommentComposer';

const props = {
  caixa: true,
  isPending: false,
  mentionCandidates: [],
  onSubmit: vi.fn(async () => undefined),
};

function sugestao(texto: string): SugestaoEnriquecimento {
  return {
    estruturado: true,
    origem: texto,
    campos: {
      titulo: { destino: 'simples', texto: 'Título', conteudo: 'Título' },
      descricao: {
        destino: 'rico',
        texto,
        conteudo: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: texto }] }],
        },
      },
    },
  };
}

describe('CommentComposer com formatação por IA', () => {
  beforeEach(() => {
    mocks.data = null;
    mocks.next = null;
    mocks.mutateAsync.mockClear();
    mocks.reset.mockClear();
  });

  it('gera uma sugestão e só troca o texto depois da confirmação', async () => {
    const user = userEvent.setup();
    mocks.next = sugestao('Texto limpo.');
    const { rerender } = render(<CommentComposer {...props} />);
    const editor = screen.getByRole('textbox', { name: 'Escrever comentário' });

    await user.type(editor, 'Então, é, texto limpo.');
    await user.click(screen.getByRole('button', { name: 'Formatar com IA' }));

    expect(mocks.mutateAsync).toHaveBeenCalledWith('Então, é, texto limpo.');
    expect(editor).toHaveValue('Então, é, texto limpo.');

    rerender(<CommentComposer {...props} />);
    expect(screen.getByText('Sugestão da IA')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Usar sugestão' }));

    expect(editor).toHaveValue('Texto limpo.');
    expect(screen.queryByText('Sugestão da IA')).not.toBeInTheDocument();
  });

  it('não deixa uma resposta antiga sobrescrever texto editado durante a chamada', async () => {
    const user = userEvent.setup();
    mocks.next = sugestao('Texto limpo.');
    const { rerender } = render(<CommentComposer {...props} />);
    const editor = screen.getByRole('textbox', { name: 'Escrever comentário' });

    await user.type(editor, 'Texto original.');
    await user.click(screen.getByRole('button', { name: 'Formatar com IA' }));
    await user.type(editor, ' Alterado.');
    rerender(<CommentComposer {...props} />);

    expect(screen.getByText(/O texto mudou depois da solicitação/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Usar sugestão' })).toBeDisabled();
  });
});
