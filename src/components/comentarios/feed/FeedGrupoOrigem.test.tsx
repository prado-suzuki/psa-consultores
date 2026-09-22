import type { ComponentProps } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { FeedGrupoOrigem } from '@/components/comentarios/feed/FeedGrupoOrigem';
import type { FeedComentario } from '@/hooks/useDomainFeedComentarios';
import { comentarioDoFeed } from '@/test/feedComentario';

vi.mock('@/hooks/useDomainOrgComments', () => ({
  useDownloadOrgCommentAttachment: () => ({ mutateAsync: vi.fn() }),
  abrirAnexoEmNovaAba: vi.fn(),
}));

vi.mock('@/components/comentarios/feed/FeedRespostaInline', () => ({
  FeedRespostaInline: ({ comentario }: { comentario: FeedComentario }) => (
    <div data-testid="resposta-inline">respondendo a {comentario.id}</div>
  ),
}));

type Props = ComponentProps<typeof FeedGrupoOrigem>;

function renderizar(itens: FeedComentario[], extra: Partial<Props> = {}) {
  const props: Props = {
    itens,
    chaveDoBloco: 'dia/bloco#0',
    cliente: 'Frigorífico Vale',
    area: 'tax',
    respondendoA: null,
    idEmRealce: null,
    onResponder: vi.fn(),
    onFecharResposta: vi.fn(),
    onRespondeu: vi.fn(),
    onAbrirOrigem: vi.fn(),
    ...extra,
  };
  render(
    <MemoryRouter>
      <FeedGrupoOrigem {...props} />
    </MemoryRouter>,
  );
  return props;
}

/** Itens do bloco vêm do mais novo ao mais antigo, como o feed entrega. */
const raiz = comentarioDoFeed({ id: 'c1', created_at: '2026-09-22T12:00:00.000Z' });
const resposta = comentarioDoFeed({
  id: 'r1',
  parent_id: 'c1',
  author_id: 'U3',
  author_name: 'Bruno Lima',
  body: 'Recebido, obrigado.',
  created_at: '2026-09-22T13:00:00.000Z',
});

describe('FeedGrupoOrigem: cabeçalho', () => {
  it('abre a tarefa no próprio feed, com tipo, cliente, projeto e título', () => {
    const props = renderizar([resposta, raiz]);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    const cabecalho = screen.getByRole('button', { name: /Conferir balancete de agosto/ });
    fireEvent.click(cabecalho);
    expect(props.onAbrirOrigem).toHaveBeenCalledWith({ tipo: 'org_task', id: 'T1' });
    expect(within(cabecalho).getByText('Tarefa')).toBeInTheDocument();
    expect(within(cabecalho).getByText('Frigorífico Vale')).toBeInTheDocument();
    expect(within(cabecalho).getByText('Fechamento mensal')).toBeInTheDocument();
    expect(within(cabecalho).getByText('Conferir balancete de agosto')).toBeInTheDocument();
  });

  it('conversa de projeto abre o projeto e não repete o projeto no caminho', () => {
    const props = renderizar([
      comentarioDoFeed({
        entity_type: 'org_project',
        entity_id: 'P1',
        entity_title: 'Fechamento mensal',
      }),
    ]);

    const cabecalho = screen.getByRole('button', { name: /Fechamento mensal/ });
    fireEvent.click(cabecalho);
    expect(props.onAbrirOrigem).toHaveBeenCalledWith({ tipo: 'org_project', id: 'P1' });
    expect(within(cabecalho).getByText('Projeto')).toBeInTheDocument();
    expect(within(cabecalho).getAllByText('Fechamento mensal')).toHaveLength(1);
  });

  it('conta as falas do bloco', () => {
    renderizar([resposta, raiz]);
    const cabecalho = screen.getByRole('button', { name: /Conferir balancete de agosto/ });
    expect(within(cabecalho).getByText('2')).toBeInTheDocument();
  });

  it('etiqueta de novas conta só o que chegou depois do carimbo e não é meu', () => {
    const minha = comentarioDoFeed({
      id: 'm1',
      author_id: 'EU',
      author_name: 'Eu Mesmo',
      created_at: '2026-09-22T14:00:00.000Z',
    });
    renderizar([minha, resposta, raiz], {
      vistoAte: '2026-09-22T11:00:00.000Z',
      meuId: 'EU',
    });
    expect(screen.getByText('2 novas')).toBeInTheDocument();
  });

  it('sem carimbo não há etiqueta de novas', () => {
    renderizar([resposta, raiz]);
    expect(screen.queryByText(/novas?$/)).not.toBeInTheDocument();
  });

  it('carimba a leitura até a fala mais nova do bloco', () => {
    const registrarLeitura = vi.fn();
    renderizar([resposta, raiz], { registrarLeitura });

    const bloco = screen.getByRole('article');
    expect(bloco).toHaveAttribute('data-leitura', 'P1|2026-09-22T13:00:00.000Z');
    expect(registrarLeitura).toHaveBeenCalledWith(bloco);
  });
});

describe('FeedGrupoOrigem: threads', () => {
  it('raiz antes da resposta, com o cotovelo na resposta', () => {
    renderizar([resposta, raiz]);

    const falas = [...document.querySelectorAll('[data-comentario]')].map((fala) =>
      fala.getAttribute('data-comentario'),
    );
    expect(falas).toEqual(['c1', 'r1']);
    expect(document.querySelectorAll('[data-thread-connector]')).toHaveLength(1);
  });

  it('Responder na raiz manda a chave do bloco com o id da raiz', () => {
    const props = renderizar([resposta, raiz]);
    fireEvent.click(screen.getByRole('button', { name: 'Responder' }));
    expect(props.onResponder).toHaveBeenCalledWith('dia/bloco#0:c1');
  });

  it('respondendo, o campo aparece dentro da thread e o botão sai dela', () => {
    renderizar([resposta, raiz], { respondendoA: 'dia/bloco#0:c1' });
    expect(screen.getByTestId('resposta-inline')).toHaveTextContent('respondendo a c1');
    expect(screen.queryByRole('button', { name: 'Responder' })).not.toBeInTheDocument();
  });

  it('resposta órfã aparece solta, com etiqueta, e é respondível', () => {
    const props = renderizar([resposta]);

    expect(screen.getByText('resposta')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-thread-connector]')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Responder' }));
    expect(props.onResponder).toHaveBeenCalledWith('dia/bloco#0:c1');
  });

  it('falas seguidas da mesma pessoa não repetem o nome', () => {
    const segunda = comentarioDoFeed({
      id: 'c2',
      body: 'E o razão também.',
      created_at: '2026-09-22T12:02:00.000Z',
    });
    renderizar([segunda, raiz]);

    expect(screen.getAllByText('Ana Souza')).toHaveLength(1);
    expect(screen.getByText('E o razão também.')).toBeInTheDocument();
  });

  it('evento de sistema não entra como continuação da fala da mesma pessoa', () => {
    const evento = comentarioDoFeed({
      id: 'e1',
      kind: 'review_approved',
      body: 'Tarefa aprovada',
      created_at: '2026-09-22T12:01:00.000Z',
    });
    renderizar([evento, raiz]);

    expect(screen.getByText('Revisão aprovada')).toBeInTheDocument();
    expect(screen.getAllByText('Ana Souza')).toHaveLength(2);
  });

  it('realça a fala recém-publicada', () => {
    renderizar([resposta, raiz], { idEmRealce: 'r1' });
    expect(document.querySelector('[data-comentario="r1"]')).toHaveAttribute('data-realce');
    expect(document.querySelector('[data-comentario="c1"]')).not.toHaveAttribute('data-realce');
  });
});
