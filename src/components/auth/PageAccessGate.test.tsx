import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PageAccessGate } from './PageAccessGate';

/**
 * Regressão da subtarefa "Timeout dentro das ferramentas do Digital cai em
 * 'Acesso Negado'": quando a sessão expira dentro de uma rota da equipe
 * (ex.: /equipe/dev), o gate deve mandar para o login da equipe (/equipe),
 * e não exibir a tela "Acesso Negado". O "Acesso Negado" fica reservado para
 * usuário autenticado sem permissão na página.
 */

const mockUseAuth = vi.fn();
const mockUsePageAccess = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/usePageAccess', () => ({
  usePageAccess: () => mockUsePageAccess(),
}));

function renderGate(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/equipe" element={<div>LOGIN DA EQUIPE</div>} />
        <Route path="/auth" element={<div>LOGIN DO CLIENTE</div>} />
        <Route
          path="*"
          element={
            <PageAccessGate pagePath={initialPath}>
              <div>CONTEUDO PROTEGIDO</div>
            </PageAccessGate>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PageAccessGate', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUsePageAccess.mockReset();
  });

  it('sessão expirada em rota da equipe vai para o login da equipe (não "Acesso Negado")', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUsePageAccess.mockReturnValue({ hasAccess: false, isLoading: false });

    renderGate('/equipe/dev');

    expect(screen.getByText('LOGIN DA EQUIPE')).toBeInTheDocument();
    expect(screen.queryByText('Acesso Negado')).not.toBeInTheDocument();
  });

  it('sessão expirada em rota do cliente vai para o login do cliente', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUsePageAccess.mockReturnValue({ hasAccess: false, isLoading: false });

    renderGate('/cliente/chamados');

    expect(screen.getByText('LOGIN DO CLIENTE')).toBeInTheDocument();
  });

  it('mantém o conteúdo montado enquanto a autenticação está carregando', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    mockUsePageAccess.mockReturnValue({ hasAccess: false, isLoading: true });

    renderGate('/equipe/dev');

    expect(screen.getByText('CONTEUDO PROTEGIDO')).toBeInTheDocument();
    expect(screen.queryByText('LOGIN DA EQUIPE')).not.toBeInTheDocument();
  });

  it('usuário autenticado sem permissão continua vendo "Acesso Negado"', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false });
    mockUsePageAccess.mockReturnValue({ hasAccess: false, isLoading: false });

    renderGate('/equipe/dev');

    expect(screen.getByText('Acesso Negado')).toBeInTheDocument();
    expect(screen.queryByText('LOGIN DA EQUIPE')).not.toBeInTheDocument();
  });

  it('usuário autenticado com permissão vê o conteúdo protegido', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false });
    mockUsePageAccess.mockReturnValue({ hasAccess: true, isLoading: false });

    renderGate('/equipe/dev');

    expect(screen.getByText('CONTEUDO PROTEGIDO')).toBeInTheDocument();
  });
});
