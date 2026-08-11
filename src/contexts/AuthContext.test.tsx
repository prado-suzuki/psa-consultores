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

const agora = () => Math.floor(Date.now() / 1000);

/** Sessão longe do fim: o vigia de expiração não deve interferir. */
const sessaoViva = (id = 'sessao-1') => ({
  access_token: `token-${id}`,
  refresh_token: `refresh-${id}`,
  expires_at: agora() + 3600,
  user: { id: 'u-1', email: EMAIL, user_metadata: {} },
});

/**
 * Sessão com prazo no passado, que é o que se encontra ao acordar o notebook:
 * o auth-js para o auto-refresh com a aba escondida, então o relógio passa e o
 * refresh token continua válido.
 */
const sessaoComPrazoVencido = () => ({ ...sessaoViva('dormida'), expires_at: agora() - 120 });

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

/** Mesma guarda do ProtectedRoute: enquanto carrega não decide; sem usuário, a tela vai embora. */
function AreaProtegida() {
  const { user, loading } = useAuth();
  if (loading) return <p>carregando</p>;
  if (!user) return <p>voltou para o login</p>;
  return <FormularioLongo />;
}

const emitir = async (evento: string, sessao: unknown) => {
  await act(async () => {
    for (const ouvinte of authMocks.ouvintes) ouvinte(evento, sessao);
  });
};

const renderizar = () => render(
  <AuthProvider>
    <AreaProtegida />
  </AuthProvider>,
);

const montar = async () => {
  const utils = renderizar();
  await waitFor(() => expect(screen.getByLabelText('Rascunho')).toBeInTheDocument());
  return utils;
};

const dialogoAberto = () => screen.queryByText('Sua sessão expirou') !== null;

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

// O diálogo é um overlay `fixed inset-0`, sem Esc e sem clique fora. Aberto na
// hora errada ele não incomoda: ele TRANCA. Estes testes são sobre a hora errada.
describe('boot frio: sessão que já estava morta antes de alguém abrir a tela', () => {
  it('SIGNED_OUT chegando antes de getSession não abre o diálogo sobre o login', async () => {
    let resolverGetSession: (valor: unknown) => void = () => {};
    authMocks.getSession.mockReturnValue(
      new Promise((resolve) => { resolverGetSession = resolve; }),
    );

    renderizar();
    expect(screen.getByText('carregando')).toBeInTheDocument();

    // Quem volta depois do fim de semana: o auth-js faz `_recoverAndRefresh`,
    // leva 400, chama `_removeSession()` e emite SIGNED_OUT ANTES de
    // `getSession()` resolver. Não havia sessão viva na tela, então não há
    // formulário a preservar nem conta para reautenticar.
    await emitir('SIGNED_OUT', null);

    expect(dialogoAberto()).toBe(false);
    expect(screen.getByText('voltou para o login')).toBeInTheDocument();
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument();

    await act(async () => { resolverGetSession({ data: { session: null } }); });
    expect(dialogoAberto()).toBe(false);
    expect(screen.getByText('voltou para o login')).toBeInTheDocument();
  });

  it('refresh recusado sem usuário em estado também não abre o diálogo', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: null } });
    authMocks.refreshSession.mockResolvedValue({
      data: { session: null },
      error: { name: 'AuthApiError', status: 400, code: 'refresh_token_not_found' },
    });

    renderizar();
    await waitFor(() => expect(screen.getByText('voltou para o login')).toBeInTheDocument());
    await emitir('SIGNED_OUT', null);

    expect(dialogoAberto()).toBe(false);
  });
});

// Relógio não é veredito. O auth-js para o auto-refresh com a aba escondida, e
// quem acorda o notebook encontra `expires_at` no passado com o refresh token
// perfeitamente válido: abrir o diálogo ali é o B21 de cabeça para baixo.
describe('despertar da suspensão: o prazo vencido não decide sozinho', () => {
  const montarComPrazoVencido = async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: sessaoComPrazoVencido() } });
    const utils = await montar();
    await waitFor(() => expect(authMocks.refreshSession).toHaveBeenCalled());
    return utils;
  };

  it('tenta renovar antes de qualquer coisa, e em silêncio se der certo', async () => {
    authMocks.refreshSession.mockResolvedValue({
      data: { session: sessaoViva('renovada') },
      error: null,
    });

    await montarComPrazoVencido();

    expect(dialogoAberto()).toBe(false);
    expect(screen.getByLabelText('Rascunho')).toBeInTheDocument();
  });

  it('falha transitória de rede não abre o diálogo', async () => {
    authMocks.refreshSession.mockResolvedValue({
      data: { session: null },
      error: { name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' },
    });

    await montarComPrazoVencido();

    expect(dialogoAberto()).toBe(false);
    expect(screen.getByLabelText('Rascunho')).toBeInTheDocument();
  });

  it('só o veredito do servidor sobre o refresh token abre o diálogo', async () => {
    authMocks.refreshSession.mockResolvedValue({
      data: { session: null },
      error: {
        name: 'AuthApiError', status: 400, code: 'refresh_token_not_found',
        message: 'Invalid Refresh Token: Refresh Token Not Found',
      },
    });

    await montarComPrazoVencido();

    await waitFor(() => expect(dialogoAberto()).toBe(true));
    expect(screen.getByLabelText('Rascunho')).toBeInTheDocument();
  });
});
