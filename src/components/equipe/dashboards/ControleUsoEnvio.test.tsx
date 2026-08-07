import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ControleUsoEnvio } from './ControleUsoEnvio';

const mocks = vi.hoisted(() => ({
  catalogo: vi.fn(),
  usoApi: vi.fn(),
  arquivos: vi.fn(),
}));

const queryVazia = () => ({
  data: undefined,
  error: null,
  isLoading: false,
  isFetching: false,
  dataUpdatedAt: 0,
  refetch: vi.fn(),
});

vi.mock('@/hooks/useAnalyticsUso', () => ({
  USANDO_FIXTURES: false,
  useAnalyticsCatalogo: () => mocks.catalogo(),
  useAnalyticsUsoApi: (...args: unknown[]) => mocks.usoApi(...args),
  useAnalyticsArquivos: (...args: unknown[]) => mocks.arquivos(...args),
}));

vi.mock('@/hooks/usePageAccess', () => ({
  usePageAccess: () => ({ hasAccess: false, isLoading: false }),
}));

vi.mock('@/components/equipe/dev/dashboard-uso-envio/AbaSaudeApi', () => ({
  AbaSaudeApi: () => <div>CONTEÚDO SAÚDE</div>,
}));
vi.mock('@/components/equipe/dev/dashboard-uso-envio/AbaUsoApi', () => ({
  AbaUsoApi: () => <div>CONTEÚDO USO</div>,
}));
vi.mock('@/components/equipe/dev/dashboard-uso-envio/AbaArquivos', () => ({
  AbaArquivos: () => <div>CONTEÚDO ARQUIVOS</div>,
}));

describe('ControleUsoEnvio', () => {
  beforeEach(() => {
    mocks.catalogo.mockReset().mockReturnValue(queryVazia());
    mocks.usoApi.mockReset().mockReturnValue(queryVazia());
    mocks.arquivos.mockReset().mockReturnValue(queryVazia());
  });

  it('mantém a consulta de arquivos desabilitada até abrir a aba', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/equipe/dashboards?painel=controle-uso-envio']}>
        <ControleUsoEnvio />
      </MemoryRouter>,
    );

    expect(mocks.arquivos).toHaveBeenLastCalledWith(
      expect.any(Object),
      expect.objectContaining({ enabled: false }),
    );
    expect(mocks.usoApi).toHaveBeenLastCalledWith(
      expect.any(Object),
      expect.objectContaining({ enabled: true }),
    );

    await user.click(screen.getByRole('tab', { name: 'Ingestão de arquivos' }));

    await waitFor(() =>
      expect(mocks.arquivos).toHaveBeenLastCalledWith(
        expect.any(Object),
        expect.objectContaining({ enabled: true }),
      ),
    );
    expect(mocks.usoApi).toHaveBeenLastCalledWith(
      expect.any(Object),
      expect.objectContaining({ enabled: false }),
    );
  });

  it('uma pessoa na URL prevalece sobre uma ferramenta antiga', () => {
    render(
      <MemoryRouter initialEntries={['/equipe/dashboards?usuario=Pessoa+A&ferramenta=Mapa']}>
        <ControleUsoEnvio />
      </MemoryRouter>,
    );

    expect(mocks.usoApi).toHaveBeenLastCalledWith(
      expect.objectContaining({ usuario: 'Pessoa A', ferramenta: undefined }),
      expect.objectContaining({ enabled: true }),
    );
  });

  it('não desenha shell de layout — a moldura é da página host', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/equipe/dashboards']}>
        <ControleUsoEnvio />
      </MemoryRouter>,
    );

    // Um <main>/<aside> aqui significaria layout duplicado dentro do EquipeLayout.
    expect(container.querySelector('main')).toBeNull();
    expect(container.querySelector('aside')).toBeNull();
  });
});
