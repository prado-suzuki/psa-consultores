import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FeedComentarios } from '@/components/comentarios/feed/FeedComentarios';
import type { FeedComentario } from '@/hooks/useDomainFeedComentarios';
import { comentarioDoFeed } from '@/test/feedComentario';

const mocks = vi.hoisted(() => ({
  feed: {
    comentarios: [] as FeedComentario[],
    isLoading: false,
    error: null as Error | null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  },
}));

vi.mock('@/hooks/useDomainFeedComentarios', () => ({
  useDomainFeedComentarios: () => mocks.feed,
}));
vi.mock('@/hooks/useDomainFeedClientes', () => ({
  useDomainFeedClientes: () => ({ clientePorProjeto: new Map() }),
}));
vi.mock('@/hooks/useAtividadeDoFeedController', () => ({
  useAtividadeDoFeedController: () => ({
    carimbos: new Map(),
    meuId: 'EU',
    lerCliente: vi.fn(),
    lerProjeto: vi.fn(),
  }),
}));
vi.mock('@/hooks/useDomainOrgComments', () => ({
  useDownloadOrgCommentAttachment: () => ({ mutateAsync: vi.fn() }),
  abrirAnexoEmNovaAba: vi.fn(),
}));
// A barra, os filtros e o compositor têm teste próprio; aqui interessa a moldura.
vi.mock('@/components/comentarios/feed/FeedBarraDeAtividade', () => ({
  FeedBarraDeAtividade: () => <aside data-testid="barra" />,
}));
vi.mock('@/components/comentarios/feed/FeedFiltros', () => ({
  FeedFiltros: () => <div data-testid="filtros" />,
}));
vi.mock('@/components/comentarios/feed/FeedNovoComentario', () => ({
  FeedNovoComentario: () => <div data-testid="compositor" />,
}));

function renderizar(url = '/equipe/tax/projetos/feed') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <FeedComentarios area="tax" />
    </MemoryRouter>,
  );
}

const agora = new Date();

beforeEach(() => {
  mocks.feed = {
    comentarios: [],
    isLoading: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  };
});

describe('FeedComentarios: moldura', () => {
  it('barra, filtros e compositor ficam de pé em todos os estados', () => {
    mocks.feed.isLoading = true;
    renderizar();
    expect(screen.getByTestId('barra')).toBeInTheDocument();
    expect(screen.getByTestId('filtros')).toBeInTheDocument();
    expect(screen.getByTestId('compositor')).toBeInTheDocument();
  });

  it('agrupa por dia, com rótulo de orientação e contagem', () => {
    mocks.feed.comentarios = [
      comentarioDoFeed({ id: 'c2', created_at: agora.toISOString() }),
      comentarioDoFeed({ id: 'c1', created_at: new Date(agora.getTime() - 1000).toISOString() }),
    ];
    renderizar();

    expect(screen.getByRole('heading', { level: 2, name: 'Hoje' })).toBeInTheDocument();
    expect(screen.getByText('2 comentários')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('com mais páginas, o dia mais antigo diz que está cortado e há como carregar mais', () => {
    mocks.feed.comentarios = [comentarioDoFeed({ created_at: agora.toISOString() })];
    mocks.feed.hasNextPage = true;
    renderizar();

    expect(screen.getByText('1+ comentário')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver comentários mais antigos' }));
    expect(mocks.feed.fetchNextPage).toHaveBeenCalled();
  });
});

describe('FeedComentarios: estados', () => {
  it('erro tem saída e guarda o detalhe técnico', () => {
    mocks.feed.error = new Error('permission denied for function feed_org_comments');
    renderizar();

    expect(screen.getByText('Não foi possível carregar o feed')).toBeInTheDocument();
    expect(screen.getByText(/permission denied/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(mocks.feed.refetch).toHaveBeenCalled();
  });

  it('vazio sem filtro explica o que aparece no feed', () => {
    renderizar();
    expect(screen.getByText('Nada no feed ainda')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();
  });

  it('vazio por busca cita o termo e oferece limpar', () => {
    renderizar('/equipe/tax/projetos/feed?busca=balancete');
    expect(screen.getByText('Nada encontrado para “balancete”')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument();
  });

  it('vazio por outro filtro fala do recorte', () => {
    renderizar('/equipe/tax/projetos/feed?mencoes=1');
    expect(screen.getByText('Nenhuma conversa nesse recorte')).toBeInTheDocument();
  });
});
