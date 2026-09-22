import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FeedItemComentario } from '@/components/comentarios/feed/FeedItemComentario';
import { comentarioDoFeed } from '@/test/feedComentario';

vi.mock('@/hooks/useDomainOrgComments', () => ({
  useDownloadOrgCommentAttachment: () => ({ mutateAsync: vi.fn() }),
  abrirAnexoEmNovaAba: vi.fn(),
}));

function falaDe(id: string) {
  const alvo = document.querySelector(`[data-comentario="${id}"]`);
  if (!alvo) throw new Error(`fala ${id} não está na tela`);
  return alvo as HTMLElement;
}

describe('FeedItemComentario: comentário humano', () => {
  it('mostra autor, data e hora por extenso na linha e o corpo', () => {
    render(<FeedItemComentario comentario={comentarioDoFeed()} onResponder={vi.fn()} />);

    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('Mandei o balancete para o cliente.')).toBeInTheDocument();
    const hora = screen.getByText(/22\/09\/2026 \d{2}:30/);
    expect(hora.tagName).toBe('TIME');
    expect(hora).toHaveAttribute('dateTime', '2026-09-22T14:30:00.000Z');
  });

  it('oferece Responder e chama o callback', () => {
    const onResponder = vi.fn();
    render(<FeedItemComentario comentario={comentarioDoFeed()} onResponder={onResponder} />);

    fireEvent.click(screen.getByRole('button', { name: 'Responder' }));
    expect(onResponder).toHaveBeenCalledTimes(1);
  });

  it('sem callback não desenha Responder (thread com campo de resposta aberto)', () => {
    render(<FeedItemComentario comentario={comentarioDoFeed()} />);
    expect(screen.queryByRole('button', { name: 'Responder' })).not.toBeInTheDocument();
  });

  it('autor removido vira "Usuário removido"', () => {
    render(<FeedItemComentario comentario={comentarioDoFeed({ author_name: null })} />);
    expect(screen.getByText('Usuário removido')).toBeInTheDocument();
  });

  it('marca edição', () => {
    render(
      <FeedItemComentario
        comentario={comentarioDoFeed({ editado_em: '2026-09-22T15:00:00.000Z' })}
      />,
    );
    expect(screen.getByText('editado')).toBeInTheDocument();
  });

  it('continuação da mesma pessoa não repete nome, mas guarda a hora', () => {
    render(<FeedItemComentario comentario={comentarioDoFeed()} continuaBloco />);

    expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument();
    expect(screen.queryByText('AS')).not.toBeInTheDocument();
    expect(screen.getByText(/^\d{2}:30$/).tagName).toBe('TIME');
  });

  it('resposta solta (raiz fora da leva) ganha a etiqueta "resposta"; dentro da thread não', () => {
    const resposta = comentarioDoFeed({ id: 'r1', parent_id: 'c0' });
    const { rerender } = render(<FeedItemComentario comentario={resposta} />);
    expect(screen.getByText('resposta')).toBeInTheDocument();

    rerender(<FeedItemComentario comentario={resposta} nested />);
    expect(screen.queryByText('resposta')).not.toBeInTheDocument();
  });

  it('resposta dentro da thread desenha o cotovelo do fio', () => {
    render(<FeedItemComentario comentario={comentarioDoFeed({ parent_id: 'c0' })} nested />);
    expect(document.querySelectorAll('[data-thread-connector]')).toHaveLength(1);
  });

  it('não lida e realce ficam marcados na âncora da fala', () => {
    const { rerender } = render(<FeedItemComentario comentario={comentarioDoFeed()} naoLida />);
    expect(falaDe('c1')).toHaveAttribute('data-nao-lida');
    expect(falaDe('c1')).not.toHaveAttribute('data-realce');

    rerender(<FeedItemComentario comentario={comentarioDoFeed()} naoLida realce />);
    expect(falaDe('c1')).toHaveAttribute('data-realce');

    rerender(<FeedItemComentario comentario={comentarioDoFeed()} />);
    expect(falaDe('c1')).not.toHaveAttribute('data-nao-lida');
  });

  it('anexos viram botões com o nome do arquivo', () => {
    render(
      <FeedItemComentario
        comentario={comentarioDoFeed({
          attachments: [
            {
              id: 'a1',
              comment_id: 'c1',
              file_path: 'x/balancete.pdf',
              file_name: 'balancete.pdf',
              file_size: 2048,
              file_type: 'application/pdf',
            } as FeedComentarioAnexo,
          ],
        })}
      />,
    );
    expect(screen.getByRole('button', { name: /balancete\.pdf/ })).toBeInTheDocument();
  });
});

type FeedComentarioAnexo = ReturnType<typeof comentarioDoFeed>['attachments'][number];

describe('FeedItemComentario: evento de sistema', () => {
  const evento = comentarioDoFeed({
    id: 'e1',
    kind: 'review_submitted',
    body: 'Enviado para revisão de Bruno Lima: confere o anexo',
    author_name: 'Ana Souza',
  });

  it('título do evento no lugar do nome, com quem agiu e para quem', () => {
    render(<FeedItemComentario comentario={evento} onResponder={vi.fn()} />);

    expect(screen.getByText('Enviado para revisão')).toBeInTheDocument();
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
    expect(screen.getByText('confere o anexo')).toBeInTheDocument();
  });

  it('nunca oferece Responder', () => {
    render(<FeedItemComentario comentario={evento} onResponder={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Responder' })).not.toBeInTheDocument();
  });

  it('evento sem corpo próprio não desenha corpo', () => {
    render(
      <FeedItemComentario
        comentario={comentarioDoFeed({ kind: 'review_approved', body: 'Tarefa aprovada' })}
      />,
    );
    expect(screen.getByText('Revisão aprovada')).toBeInTheDocument();
    expect(screen.queryByText('Tarefa aprovada')).not.toBeInTheDocument();
  });
});
