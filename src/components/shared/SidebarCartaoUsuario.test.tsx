import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SidebarCartaoUsuario } from './SidebarCartaoUsuario';

const mocks = vi.hoisted(() => ({
  user: { email: 'joana.silva@psaconsultores.com.br' } as { email?: string } | null,
  perfil: null as { first_name: string | null; last_name: string | null } | null,
  signOut: vi.fn(async () => {}),
  navigate: vi.fn(),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user, signOut: mocks.signOut }),
}));
vi.mock('@/hooks/useDomainMeuPerfil', () => ({
  useMeuPerfil: () => ({ data: mocks.perfil }),
}));

/** Abre o menu do cartão e devolve o botão que o abriu. */
async function abrirMenu() {
  const user = userEvent.setup();
  const gatilho = screen.getByRole('button');
  await user.click(gatilho);

  return { user, gatilho };
}

beforeEach(() => {
  mocks.user = { email: 'joana.silva@psaconsultores.com.br' };
  mocks.perfil = null;
  mocks.signOut.mockClear();
  mocks.navigate.mockClear();
});

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

  it('com perfil carregado, o cartão mostra o nome de verdade e não o pedaço do e-mail', () => {
    // O motivo de o hook existir: o nome estava em `profiles` o tempo todo, e o
    // cartão mostrava "joana.silva" porque ninguém o buscava.
    mocks.perfil = { first_name: 'Joana', last_name: 'Silva' };
    render(<SidebarCartaoUsuario area="tax" collapsed={false} />);

    expect(screen.getByText('Joana Silva')).toBeVisible();
    expect(screen.queryByText('joana.silva')).not.toBeInTheDocument();
  });

  // O corte que originou o padrão aparecia exatamente aqui: o avatar de 32px é a
  // largura útil inteira do trilho recolhido. Se ele deixar de existir (ou o
  // texto voltar a ocupar espaço ao lado dele), é este teste que cai.
  it('recolhido, sobra o avatar — e o botão passa a carregar o nome e a área', () => {
    render(<SidebarCartaoUsuario area="osg" collapsed />);

    expect(screen.getByRole('button', { name: 'joana.silva · OSG' })).toBeInTheDocument();
  });

  it('recolhido, o texto continua montado mas fora de cena', () => {
    render(<SidebarCartaoUsuario area="gestao" collapsed />);

    // Montado para desbotar em vez de sumir de estalo enquanto a barra encolhe…
    const nome = screen.getByText('joana.silva');
    // …e escondido do leitor de tela, que já ouve o rótulo pelo nome do botão.
    expect(nome.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByText('Gestão').closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('recolhido, o nome também fica ao alcance do mouse', () => {
    render(<SidebarCartaoUsuario area="administracao" collapsed />);

    expect(screen.getByRole('button')).toHaveAttribute('title', 'joana.silva · Administrador');
  });

  it('sem e-mail no perfil, cai em "Usuário" em vez de deixar o cartão vazio', () => {
    mocks.user = null;
    render(<SidebarCartaoUsuario area="fixos" collapsed={false} />);

    expect(screen.getByText('Usuário')).toBeInTheDocument();
    expect(screen.getByText('Fixos')).toBeInTheDocument();
  });

  describe('o menu', () => {
    it('só existe depois do clique — o cartão é a porta, não uma lista aberta', async () => {
      render(<SidebarCartaoUsuario area="tax" collapsed={false} />);

      expect(screen.queryByRole('menuitem', { name: /Sair/ })).not.toBeInTheDocument();

      await abrirMenu();

      expect(screen.getByRole('menuitem', { name: /Sair/ })).toBeInTheDocument();
    });

    it('leva o "Trocar área" para o destino DAQUELA área', async () => {
      // Os cinco layouts tinham destinos diferentes neste botão, e é a única
      // coisa que a consolidação poderia ter uniformizado sem ninguém notar.
      render(<SidebarCartaoUsuario area="fixos" collapsed={false} />);
      const { user } = await abrirMenu();

      await user.click(screen.getByRole('menuitem', { name: /Trocar área/ }));

      expect(mocks.navigate).toHaveBeenCalledWith('/equipe/projetos');
    });

    it('a OSG volta para o seletor dela, não para o de /equipe', async () => {
      render(<SidebarCartaoUsuario area="osg" collapsed={false} />);
      const { user } = await abrirMenu();

      await user.click(screen.getByRole('menuitem', { name: /Trocar área/ }));

      expect(mocks.navigate).toHaveBeenCalledWith('/equipe/osg');
    });

    it('a Rotina volta para o seletor do Digital', async () => {
      // Sexta área do registro, e a única cujo "Trocar área" não aponta para
      // `/equipe` nem para a raiz da própria área.
      render(<SidebarCartaoUsuario area="rotina" collapsed={false} />);
      const { user } = await abrirMenu();

      await user.click(screen.getByRole('menuitem', { name: /Trocar área/ }));

      expect(mocks.navigate).toHaveBeenCalledWith('/equipe/digital');
    });

    it('"Voltar ao site" aparece só nas áreas que o ofereciam', async () => {
      render(<SidebarCartaoUsuario area="osg" collapsed={false} />);
      await abrirMenu();

      expect(screen.getByRole('menuitem', { name: /Voltar ao site/ })).toBeInTheDocument();
    });

    it('…e não aparece nas que não ofereciam', async () => {
      render(<SidebarCartaoUsuario area="tax" collapsed={false} />);
      await abrirMenu();

      expect(screen.queryByRole('menuitem', { name: /Voltar ao site/ })).not.toBeInTheDocument();
    });

    it('o "Sair" encerra a sessão e sai da rota protegida', async () => {
      render(<SidebarCartaoUsuario area="gestao" collapsed={false} />);
      const { user } = await abrirMenu();

      await user.click(screen.getByRole('menuitem', { name: /Sair/ }));

      expect(mocks.signOut).toHaveBeenCalled();
      // O `navigate('/')` é o segundo passo que os cinco layouts faziam. Sem
      // ele a árvore fica montada numa rota protegida sem sessão.
      expect(mocks.navigate).toHaveBeenCalledWith('/');
    });

    it('recolhido, o menu continua alcançável', async () => {
      // No trilho de 64px o cartão vira só o avatar; se o gatilho deixasse de
      // ser botão nesse estado, a única saída da área sumiria.
      render(<SidebarCartaoUsuario area="tax" collapsed />);
      await abrirMenu();

      expect(screen.getByRole('menuitem', { name: /Sair/ })).toBeInTheDocument();
    });
  });
});
