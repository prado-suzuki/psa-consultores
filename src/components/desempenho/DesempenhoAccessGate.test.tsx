import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DesempenhoAccessGate } from './DesempenhoAccessGate';

/**
 * O gate passou a considerar a permissão da PÁGINA ATUAL além da raiz do
 * módulo. Estes testes fixam as duas metades do contrato: quem já tinha a raiz
 * não perde nada, e quem recebe só uma sub-página consegue entrar nela.
 */

const mockUseAuth = vi.fn();
const acessos = new Map<string, boolean>();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/usePageAccess', () => ({
  usePageAccess: (pagePath: string) => ({
    hasAccess: acessos.get(pagePath) ?? false,
    isLoading: false,
  }),
}));

function renderGate(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/equipe" element={<div>LOGIN DA EQUIPE</div>} />
        <Route path="/equipe/board/dashboard" element={<div>BOARD DASHBOARD</div>} />
        <Route
          path="*"
          element={
            <DesempenhoAccessGate>
              <div>CONTEUDO DESEMPENHO</div>
            </DesempenhoAccessGate>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DesempenhoAccessGate', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    acessos.clear();
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false });
  });

  it('acesso à raiz do módulo libera qualquer sub-página (comportamento preservado)', () => {
    acessos.set('/equipe/board/desempenho', true);

    renderGate('/equipe/board/desempenho/feedbacks');

    expect(screen.getByText('CONTEUDO DESEMPENHO')).toBeInTheDocument();
  });

  it('acesso só à sub-página libera aquela sub-página (antes era impossível)', () => {
    acessos.set('/equipe/board/desempenho/feedbacks', true);

    renderGate('/equipe/board/desempenho/feedbacks');

    expect(screen.getByText('CONTEUDO DESEMPENHO')).toBeInTheDocument();
  });

  it('acesso a uma sub-página NÃO vaza para as outras', () => {
    acessos.set('/equipe/board/desempenho/feedbacks', true);

    renderGate('/equipe/board/desempenho/metas');

    expect(screen.queryByText('CONTEUDO DESEMPENHO')).not.toBeInTheDocument();
    expect(screen.getByText('BOARD DASHBOARD')).toBeInTheDocument();
  });

  it('sem nenhuma permissão volta para o Board, não para /equipe/digital', () => {
    renderGate('/equipe/board/desempenho');

    expect(screen.getByText('BOARD DASHBOARD')).toBeInTheDocument();
  });

  it('sessão inexistente vai para o login da equipe', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    renderGate('/equipe/board/desempenho');

    expect(screen.getByText('LOGIN DA EQUIPE')).toBeInTheDocument();
  });

  it('enquanto a autenticação carrega, não decide nada (mostra spinner)', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });

    renderGate('/equipe/board/desempenho');

    expect(screen.queryByText('CONTEUDO DESEMPENHO')).not.toBeInTheDocument();
    expect(screen.queryByText('LOGIN DA EQUIPE')).not.toBeInTheDocument();
  });
});
