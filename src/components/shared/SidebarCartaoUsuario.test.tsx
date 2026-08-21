import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SidebarCartaoUsuario } from './SidebarCartaoUsuario';

const auth = vi.hoisted(() => ({
  user: { email: 'joana.silva@psaconsultores.com.br' } as { email?: string } | null,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: auth.user }),
}));

describe('SidebarCartaoUsuario', () => {
  it('aberto, mostra o nome do usuário e o rótulo da área', () => {
    render(<SidebarCartaoUsuario area="tax" collapsed={false} />);

    const nome = screen.getByText('joana.silva');
    expect(nome).toBeVisible();
    // Aberto, o texto é conteúdo de verdade, não decoração: precisa chegar ao
    // leitor de tela.
    expect(nome.closest('[aria-hidden="true"]')).toBeNull();
    expect(screen.getByText('Tax')).toBeInTheDocument();
  });

  // O corte que originou o padrão aparecia exatamente aqui: o avatar de 32px é a
  // largura útil inteira do trilho recolhido. Se ele deixar de existir (ou o
  // texto voltar a ocupar espaço ao lado dele), é este teste que cai.
  it('recolhido, sobra o avatar — que passa a carregar o nome e a área', () => {
    render(<SidebarCartaoUsuario area="osg" collapsed />);

    expect(screen.getByRole('img', { name: 'joana.silva · OSG' })).toBeInTheDocument();
  });

  it('recolhido, o texto continua montado mas fora de cena', () => {
    render(<SidebarCartaoUsuario area="gestao" collapsed />);

    // Montado para desbotar em vez de sumir de estalo enquanto a barra encolhe…
    const nome = screen.getByText('joana.silva');
    // …e escondido do leitor de tela, que já ouve o rótulo pelo avatar.
    expect(nome.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByText('Gestão').closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('recolhido, o nome também fica ao alcance do mouse', () => {
    const { container } = render(<SidebarCartaoUsuario area="administracao" collapsed />);

    expect(container.firstElementChild).toHaveAttribute(
      'title',
      'joana.silva · Administrador',
    );
  });

  it('sem e-mail no perfil, cai em "Usuário" em vez de deixar o cartão vazio', () => {
    auth.user = null;
    try {
      render(<SidebarCartaoUsuario area="fixos" collapsed={false} />);

      expect(screen.getByText('Usuário')).toBeInTheDocument();
      expect(screen.getByText('Fixos')).toBeInTheDocument();
    } finally {
      auth.user = { email: 'joana.silva@psaconsultores.com.br' };
    }
  });
});
