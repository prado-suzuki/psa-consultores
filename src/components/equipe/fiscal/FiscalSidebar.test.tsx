import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import FiscalSidebar from './FiscalSidebar';

const auth = vi.hoisted(() => ({ isAdmin: false, isLider: false }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'pessoa@psaconsultores.com.br' },
    signOut: vi.fn(),
    isAdmin: auth.isAdmin,
    isLider: auth.isLider,
  }),
}));

const Local = () => <span data-testid="rota">{useLocation().pathname}</span>;

const montar = () =>
  render(
    <MemoryRouter initialEntries={['/equipe/tax']}>
      <FiscalSidebar isCollapsed={false} onToggle={vi.fn()} />
      <Routes>
        <Route path="*" element={<Local />} />
      </Routes>
    </MemoryRouter>,
  );

describe('FiscalSidebar', () => {
  // O item saiu da raiz em 07/08/2026 sem que a tela de boas-vindas parasse de
  // oferecer o cartão "Dashboard": o menu ficou sem caminho visível para a
  // página. Este teste trava o item no primeiro nível, como na OSG.
  it('oferece "Dashboard" no primeiro nível e leva ao dashboard da Tax', async () => {
    montar();

    const item = screen.getByRole('button', { name: 'Dashboard' });
    await userEvent.click(item);

    expect(screen.getByTestId('rota')).toHaveTextContent('/equipe/tax/dashboard');
  });

  it('mantém o item para o líder, que também vê o grupo Gerencial', () => {
    auth.isLider = true;
    try {
      montar();
      expect(screen.getByRole('button', { name: 'Dashboard' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Gerencial' })).toBeInTheDocument();
    } finally {
      auth.isLider = false;
    }
  });

  it('o grupo "Projetos" não navega no clique: quem navega são os filhos', async () => {
    montar();

    await userEvent.click(screen.getByRole('button', { name: 'Projetos' }));
    expect(screen.getByTestId('rota').textContent).toBe('/equipe/tax');

    await userEvent.click(screen.getByRole('button', { name: 'Clientes' }));
    expect(screen.getByTestId('rota')).toHaveTextContent('/equipe/tax/projetos/clientes');
  });
});
