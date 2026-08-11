// B21 · expirar a sessão não pode destruir o que está na tela.
//
// O cenário aqui NÃO é o cadastro do caso e2e: é um formulário longo qualquer,
// escrito só para o teste, porque a regra vale para qualquer tela do sistema. O
// que se prova é o mecanismo — a árvore continua montada quando a sessão cai, e
// continua montada depois de reautenticar.
import { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Ouvinte = (evento: string, sessao: unknown) => void;

const authMocks = vi.hoisted(() => ({
  ouvintes: [] as Ouvinte[],
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  refreshSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: authMocks.getSession,
      onAuthStateChange: (cb: Ouvinte) => {
        authMocks.ouvintes.push(cb);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      signInWithPassword: authMocks.signInWithPassword,
      refreshSession: authMocks.refreshSession,
      signOut: authMocks.signOut,
    },
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [{ role: 'team_member' }], error: null }),
      }),
    }),
  },
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

const EMAIL = 'consultor@psaconsultores.com.br';
const RASCUNHO = 'Minuta de cessão de quotas — parágrafo terceiro em revisão';

const sessaoViva = (id = 'sessao-1') => ({
  access_token: `token-${id}`,
  refresh_token: `refresh-${id}`,
  // Longe do fim: o vigia de expiração não deve interferir neste teste.
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: 'u-1', email: EMAIL, user_metadata: {} },
});

/** Formulário longo genérico: guarda estado local que só existe montado. */
function FormularioLongo() {
  const [texto, setTexto] = useState('');
  return (
    <label>
      Rascunho
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} />
    </label>
  );
}

/** Mesma guarda do ProtectedRoute: sem usuário, a tela vai embora. */
function AreaProtegida() {
  const { user } = useAuth();
  if (!user) return <p>voltou para o login</p>;
  return <FormularioLongo />;
}

const emitir = async (evento: string, sessao: unknown) => {
  await act(async () => {
    for (const ouvinte of authMocks.ouvintes) ouvinte(evento, sessao);
  });
};

const montar = async () => {
  const utils = render(
    <AuthProvider>
      <AreaProtegida />
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.getByLabelText('Rascunho')).toBeInTheDocument());
  return utils;
};

beforeEach(() => {
  authMocks.ouvintes.length = 0;
  authMocks.getSession.mockResolvedValue({ data: { session: sessaoViva() } });
  authMocks.signInWithPassword.mockReset();
  authMocks.refreshSession.mockReset();
  authMocks.signOut.mockReset().mockResolvedValue({ error: null });
});

describe('sessão que cai no meio do trabalho', () => {
  it('mantém o formulário montado e pede para reautenticar por cima', async () => {
    const user = userEvent.setup();
    await montar();

    await user.type(screen.getByLabelText('Rascunho'), RASCUNHO);
    expect(screen.getByLabelText('Rascunho')).toHaveValue(RASCUNHO);

    // O refresh token foi recusado e o supabase-js emitiu SIGNED_OUT sozinho.
    await emitir('SIGNED_OUT', null);

    expect(screen.queryByText('voltou para o login')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Rascunho')).toHaveValue(RASCUNHO);
    expect(screen.getByText('Sua sessão expirou')).toBeInTheDocument();
  });

  it('reautenticar devolve a sessão sem apagar o que estava escrito', async () => {
    const user = userEvent.setup();
    await montar();
    await user.type(screen.getByLabelText('Rascunho'), RASCUNHO);
    await emitir('SIGNED_OUT', null);

    const nova = sessaoViva('sessao-2');
    authMocks.signInWithPassword.mockResolvedValue({ data: { session: nova }, error: null });

    await user.type(screen.getByLabelText('Senha'), 'senha-correta');
    await user.click(screen.getByRole('button', { name: /continuar trabalhando/i }));
    // O supabase-js emite SIGNED_IN depois de resolver o login.
    await emitir('SIGNED_IN', nova);

    await waitFor(() => expect(screen.queryByText('Sua sessão expirou')).not.toBeInTheDocument());
    expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
      email: EMAIL,
      password: 'senha-correta',
    });
    expect(screen.getByLabelText('Rascunho')).toHaveValue(RASCUNHO);
  });

  it('senha errada mostra o erro no diálogo e não derruba a tela', async () => {
    const user = userEvent.setup();
    await montar();
    await user.type(screen.getByLabelText('Rascunho'), RASCUNHO);
    await emitir('SIGNED_OUT', null);

    authMocks.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { name: 'AuthApiError', status: 400, message: 'Invalid login credentials' },
    });

    await user.type(screen.getByLabelText('Senha'), 'senha-errada');
    await user.click(screen.getByRole('button', { name: /continuar trabalhando/i }));

    await waitFor(() => expect(screen.getByText(/confira a senha/i)).toBeInTheDocument());
    expect(screen.getByText('Sua sessão expirou')).toBeInTheDocument();
    expect(screen.getByLabelText('Rascunho')).toHaveValue(RASCUNHO);
  });

  it('sair de propósito continua limpando tudo', async () => {
    const user = userEvent.setup();
    await montar();
    await user.type(screen.getByLabelText('Rascunho'), RASCUNHO);
    await emitir('SIGNED_OUT', null);

    await user.click(screen.getByRole('button', { name: /sair e descartar/i }));
    await emitir('SIGNED_OUT', null);

    await waitFor(() => expect(screen.getByText('voltou para o login')).toBeInTheDocument());
    expect(screen.queryByLabelText('Rascunho')).not.toBeInTheDocument();
    expect(authMocks.signOut).toHaveBeenCalled();
  });
});
