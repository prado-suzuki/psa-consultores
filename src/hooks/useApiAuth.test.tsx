// B21 · o caminho da API não pode arrastar quem está trabalhando.
//
// `handleSessionExpired` navegava para /equipe. Isso rodava em qualquer refetch
// de fundo do React Query, então uma consulta que ninguém pediu levava embora o
// formulário aberto — inclusive por baixo do diálogo que promete o contrário.
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  toast: vi.fn(),
  getUser: vi.fn(),
  getSessionSupabase: vi.fn(),
  refreshSession: vi.fn(),
  sinalizarSessaoExpirada: vi.fn(),
  sessaoExpirada: false,
  session: null as unknown,
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
      getSession: mocks.getSessionSupabase,
    },
  },
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    session: mocks.session,
    refreshSession: mocks.refreshSession,
    sessaoExpirada: mocks.sessaoExpirada,
    sinalizarSessaoExpirada: mocks.sinalizarSessaoExpirada,
  }),
}));

import { useApiAuth } from '@/hooks/useApiAuth';

const agora = () => Math.floor(Date.now() / 1000);
const sessao = (expiresAt: number) => ({
  access_token: 'token-vigente',
  refresh_token: 'refresh-vigente',
  expires_at: expiresAt,
  user: { id: 'u-1' },
});

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessaoExpirada = false;
  mocks.session = sessao(agora() + 3600);
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null });
  mocks.getSessionSupabase.mockResolvedValue({ data: { session: mocks.session } });
  mocks.refreshSession.mockResolvedValue(null);
  mocks.sinalizarSessaoExpirada.mockReturnValue(true);
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const resposta = (status: number) => ({ status, ok: status < 400 }) as Response;

describe('sessão perdida no meio de uma chamada', () => {
  it('com sessão viva na tela, o diálogo assume e ninguém navega', async () => {
    fetchMock.mockResolvedValue(resposta(401));
    const { result } = renderHook(() => useApiAuth());

    await expect(result.current.fetchWithAuth('/api/qualquer')).rejects.toThrow('Sessão expirada');

    expect(mocks.sinalizarSessaoExpirada).toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it('sem sessão viva na tela, volta o comportamento antigo', async () => {
    // Boot frio ou já deslogado: não há formulário a preservar nem conta para
    // reautenticar, então mandar para o login continua sendo o certo.
    mocks.sinalizarSessaoExpirada.mockReturnValue(false);
    fetchMock.mockResolvedValue(resposta(401));
    const { result } = renderHook(() => useApiAuth());

    await expect(result.current.fetchWithAuth('/api/qualquer')).rejects.toThrow('Sessão expirada');

    expect(mocks.navigate).toHaveBeenCalledWith('/equipe');
    expect(mocks.toast).toHaveBeenCalled();
  });

  it('com o diálogo já aberto, a chamada falha rápido em vez de renovar de novo', async () => {
    mocks.sessaoExpirada = true;
    fetchMock.mockResolvedValue(resposta(200));
    const { result } = renderHook(() => useApiAuth());

    expect(await result.current.getValidToken()).toBeNull();
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.refreshSession).not.toHaveBeenCalled();
  });
});

describe('renovação preventiva por chamada de API', () => {
  it('token perto de expirar é enviado como está, sem disparar refresh', async () => {
    // Antes, faltando menos de cinco minutos, CADA chamada de API disparava um
    // refresh. Era um renovador a mais disputando o mesmo refresh token, e a
    // rotação é o que devolve 400 "already used". Quem antecipa agora é o vigia
    // do AuthContext, uma vez a cada trinta segundos; aqui sobra o caminho
    // reativo (401 renova e repete).
    mocks.session = sessao(agora() + 60);
    mocks.getSessionSupabase.mockResolvedValue({ data: { session: mocks.session } });
    const { result } = renderHook(() => useApiAuth());

    expect(await result.current.getValidToken()).toBe('token-vigente');
    expect(mocks.refreshSession).not.toHaveBeenCalled();
  });

  it('o 401 continua renovando e repetindo a chamada', async () => {
    mocks.refreshSession.mockResolvedValue({ access_token: 'token-novo' });
    fetchMock.mockResolvedValueOnce(resposta(401)).mockResolvedValueOnce(resposta(200));
    const { result } = renderHook(() => useApiAuth());

    const r = await result.current.fetchWithAuth('/api/qualquer');

    expect(r.status).toBe(200);
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const cabecalhosDaRepeticao = (fetchMock.mock.calls[1][1] as RequestInit).headers as Record<string, string>;
    expect(cabecalhosDaRepeticao.Authorization).toBe('Bearer token-novo');
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
